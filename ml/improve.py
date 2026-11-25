"""Validation-selected full-backbone fine-tuning of the installed MobileNet.

Keeps the original splits, backs up the installed model, and opens the test
loader only once after fixing weights and the confidence threshold.
"""
import copy
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import time

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import models, transforms

from train import ROOT, Images, metrics, probabilities, threshold_for
from prepare import CLASSES


def atomic_json(path, data):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    os.replace(temporary, path)


def main():
    start = time.time()
    seed = 20261126
    torch.set_num_threads(4)
    torch.manual_seed(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.use_deterministic_algorithms(True)
    manifest_bytes = (ROOT / 'manifest.json').read_bytes()
    manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = json.loads(manifest_bytes)
    report_path = ROOT.parent / 'reports/model/latest.json'
    previous = json.loads(report_path.read_text())
    if previous['manifestSha256'] != manifest_hash:
        raise ValueError('Dataset differs from the installed model report; do not compare different splits.')
    folder = ROOT / 'artifacts'
    installed = torch.load(folder / 'model.pt', map_location='cpu', weights_only=True)
    if installed['modelVersion'] != previous['modelVersion'] or installed['classes'] != CLASSES:
        raise ValueError('Installed model, report and taxonomy must agree.')
    config = {
        'seed': seed, 'initialModel': installed['modelVersion'], 'architecture': 'mobilenet_v3_small',
        'maxEpochs': 24, 'patience': 7, 'batchSize': 32, 'threads': 4,
        'backboneLearningRate': 0.00005, 'classifierLearningRate': 0.00015,
        'weightDecay': 0.0001, 'labelSmoothing': 0.05,
        'schedule': 'cosine decay to 10% of initial learning rate',
        'augmentation': 'random resized crop 0.70-1.0; horizontal/vertical flips; rotation +/-15 degrees; colour jitter 0.15',
        'batchNorm': 'frozen running statistics',
        'selection': 'validation macro-F1; no test-based checkpoint or threshold selection',
    }
    run = folder / 'runs' / time.strftime('full-finetune-%Y%m%dT%H%M%SZ', time.gmtime())
    run.mkdir(parents=True, exist_ok=False)
    shutil.copy2(folder / 'model.pt', run / 'previous-model.pt')
    shutil.copy2(folder / 'metadata.json', run / 'previous-metadata.json')
    shutil.copy2(report_path, run / 'previous-report.json')
    atomic_json(run / 'config.json', config)
    rows = manifest['images']
    splits = {split: [row for row in rows if row['split'] == split] for split in ['train', 'validation', 'test']}
    preprocessing = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1.transforms()
    validation_loader = DataLoader(Images(splits['validation'], preprocessing), batch_size=32)
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = nn.Linear(1024, len(CLASSES))
    model.load_state_dict(installed['state'])
    before_probs, val_labels = probabilities(model, validation_loader)
    before = metrics(val_labels, before_probs.argmax(1).tolist())
    best = before['macroF1']
    best_state = copy.deepcopy(model.state_dict())
    best_epoch = 0
    history = []
    stale = 0
    counts = torch.tensor([sum(row['label'] == label for row in splits['train']) for label in CLASSES], dtype=torch.float32)
    class_weights = counts.sum() / counts
    class_weights /= class_weights.mean()
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=config['labelSmoothing'])
    augmentation = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.70, 1.0)),
        transforms.RandomHorizontalFlip(), transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(15, fill=235), transforms.ColorJitter(0.15, 0.15, 0.15),
        transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    train_loader = DataLoader(Images(splits['train'], augmentation), batch_size=32, shuffle=True,
                              generator=torch.Generator().manual_seed(seed), num_workers=0)
    optimizer = torch.optim.AdamW([
        {'params': model.features.parameters(), 'lr': config['backboneLearningRate']},
        {'params': model.classifier.parameters(), 'lr': config['classifierLearningRate']},
    ], weight_decay=config['weightDecay'])
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config['maxEpochs'], eta_min=0)
    initial_rates = [group['lr'] for group in optimizer.param_groups]
    print(json.dumps({'run': str(run), 'previousValidation': before, 'config': config}), flush=True)
    for epoch in range(config['maxEpochs']):
        model.train()
        for module in model.modules():
            if isinstance(module, nn.modules.batchnorm._BatchNorm):
                module.eval()
        running = 0
        for x, y in train_loader:
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(x), y)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5)
            optimizer.step()
            running += float(loss.detach()) * len(y)
        val_probs, val_labels = probabilities(model, validation_loader)
        result = metrics(val_labels, val_probs.argmax(1).tolist())
        history.append({'stage': 'full-backbone', 'epoch': epoch + 1, 'loss': running / len(splits['train']),
                        'validationMacroF1': result['macroF1'], 'validationAccuracy': result['accuracy'],
                        'validationMinimumRecall': min(row['recall'] for row in result['classes']),
                        'elapsedSeconds': round(time.time() - start, 2)})
        print(json.dumps(history[-1]), flush=True)
        if result['macroF1'] > best + 1e-5:
            best = result['macroF1']
            best_state = copy.deepcopy(model.state_dict())
            best_epoch = epoch + 1
            stale = 0
            torch.save({'state': best_state, 'epoch': best_epoch}, run / 'best-validation.pt')
        else:
            stale += 1
        atomic_json(run / 'history.json', history)
        scheduler.step()
        for group, initial in zip(optimizer.param_groups, initial_rates):
            group['lr'] = max(group['lr'], initial * 0.1)
        if stale >= config['patience']:
            break
    model.load_state_dict(best_state)
    val_probs, val_labels = probabilities(model, validation_loader)
    validation = metrics(val_labels, val_probs.argmax(1).tolist())
    threshold = threshold_for(val_probs, val_labels)
    qualifies = bool(best_epoch and threshold and validation['macroF1'] >= 0.8
                     and min(row['recall'] for row in validation['classes']) >= 0.7)
    if not qualifies:
        print(json.dumps({'promoted': False, 'reason': 'No validation-qualified improvement; installed model preserved.',
                          'validation': validation, 'bestEpoch': best_epoch}), flush=True)
        return
    threshold_value = threshold[1]
    state_hash = hashlib.sha256()
    for name, tensor in sorted(best_state.items()):
        state_hash.update(name.encode())
        state_hash.update(tensor.cpu().numpy().tobytes())
    version = 'mobilenet-v3-small-' + state_hash.hexdigest()[:12]
    checkpoint = {'state': best_state, 'classes': CLASSES, 'threshold': threshold_value, 'modelVersion': version,
                  'experimental': False, 'architecture': 'mobilenet_v3_small'}
    # Fix all choices before touching test data. Do not retry training based on the result below.
    torch.save(checkpoint, run / 'candidate.pt')
    atomic_json(run / 'selection.json', {'modelVersion': version, 'bestEpoch': best_epoch,
                                        'validation': validation, 'threshold': threshold_value})
    test_loader = DataLoader(Images(splits['test'], preprocessing), batch_size=32)
    test_probs, test_labels = probabilities(model, test_loader)
    scores, predicted = test_probs.max(1)
    keep = scores >= threshold_value
    test_result = metrics(test_labels, predicted.tolist())
    sample = next(iter(validation_loader))[0][:1]
    latencies = []
    with torch.inference_mode():
        for _ in range(15):
            before_time = time.perf_counter()
            model(sample)
            latencies.append((time.perf_counter() - before_time) * 1000)
    report = copy.deepcopy(previous)
    report.update({
        'modelVersion': version, 'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'architecture': 'MobileNetV3 Small / ImageNet transfer learning + full-backbone fine-tuning',
        'status': 'release-candidate', 'seed': seed, 'trained': {'validation': validation, 'test': test_result},
        'threshold': threshold_value, 'validationAcceptanceTargetMet': True,
        'testCoverage': float(keep.float().mean()),
        'acceptedTestPrecision': float((predicted[keep] == torch.tensor(test_labels)[keep]).float().mean()) if keep.any() else None,
        'trainingSeconds': round(time.time() - start, 2), 'medianInferenceMs': round(float(np.median(latencies)), 2),
        'epochs': history, 'bestEpoch': best_epoch, 'trainingConfig': config,
        'previousModel': {'modelVersion': previous['modelVersion'], 'trained': previous['trained'],
                          'threshold': previous['threshold'], 'trainingSeconds': previous['trainingSeconds']},
        'comparison': {'testAccuracyPercentagePointChange': 100 * (test_result['accuracy'] - previous['trained']['test']['accuracy']),
                       'testMacroF1PercentagePointChange': 100 * (test_result['macroF1'] - previous['trained']['test']['macroF1']),
                       'validationMacroF1PercentagePointChange': 100 * (validation['macroF1'] - before['macroF1']),
                       'selectionSplit': 'validation', 'testUsedForSelection': False},
        'mistakes': [{'sampleId': row['id'], 'source': row['source'], 'expected': row['label'],
                      'predicted': CLASSES[int(prediction)], 'confidence': round(float(score), 4)}
                     for row, prediction, score in zip(splits['test'], predicted, scores)
                     if row['label'] != CLASSES[int(prediction)]][:40],
    })
    report['limitations'].append('The existing held-out split has been reported previously and contains published sample fixtures; this is not a new independent external benchmark.')
    atomic_json(run / 'report.json', report)
    archive = ROOT.parent / 'reports/model/archive'
    archive.mkdir(exist_ok=True)
    archived = archive / f"{previous['modelVersion']}.json"
    if not archived.exists():
        atomic_json(archived, previous)
    # Selection is validation-only, regardless of the final held-out result.
    shutil.copyfile(run / 'candidate.pt', folder / 'model.pt.tmp')
    os.replace(folder / 'model.pt.tmp', folder / 'model.pt')
    atomic_json(folder / 'metadata.json', {key: value for key, value in checkpoint.items() if key != 'state'})
    atomic_json(report_path, report)
    print(json.dumps({'promoted': True, 'modelVersion': version, 'bestEpoch': best_epoch, 'validation': validation,
                      'test': test_result, 'comparison': report['comparison'], 'trainingSeconds': report['trainingSeconds']}), flush=True)


if __name__ == '__main__':
    main()
