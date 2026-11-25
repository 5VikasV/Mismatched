"""CPU-friendly baseline, transfer training, validation selection, then held-out test."""
import copy, hashlib, json, os, random, time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('TORCH_HOME',str(ROOT/'cache'))
import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from prepare import CLASSES

def metrics(labels,predictions):
    matrix=np.zeros((len(CLASSES),len(CLASSES)),dtype=int)
    for y,p in zip(labels,predictions): matrix[int(y),int(p)]+=1
    tp=np.diag(matrix); support=matrix.sum(1); predicted=matrix.sum(0)
    precision=np.divide(tp,predicted,out=np.zeros(len(CLASSES),dtype=float),where=predicted>0)
    recall=np.divide(tp,support,out=np.zeros(len(CLASSES),dtype=float),where=support>0)
    f1=np.divide(2*precision*recall,precision+recall,out=np.zeros(len(CLASSES)),where=precision+recall>0)
    return {'accuracy':float(tp.sum()/max(1,matrix.sum())),'macroF1':float(f1.mean()),'confusionMatrix':matrix.tolist(),'classes':[{'label':c,'precision':float(precision[i]),'recall':float(recall[i]),'f1':float(f1[i]),'count':int(support[i])} for i,c in enumerate(CLASSES)]}

class Images(Dataset):
    def __init__(self,items,transform): self.items=items; self.transform=transform
    def __len__(self): return len(self.items)
    def __getitem__(self,i):
        row=self.items[i]
        with Image.open(ROOT/row['path']) as im: value=self.transform(im.convert('RGB'))
        return value,CLASSES.index(row['label'])

def probabilities(model,loader):
    model.eval(); out=[]; labels=[]
    with torch.inference_mode():
        for x,y in loader: out.append(model(x).softmax(1)); labels.extend(y.tolist())
    return torch.cat(out),labels

def threshold_for(probs,labels):
    scores,pred=probs.max(1); labels=torch.tensor(labels)
    choices=[]
    for t in np.arange(.3,1,.01):
        keep=scores>=t; count=int(keep.sum()); coverage=count/max(1,len(labels))
        precision=float((pred[keep]==labels[keep]).float().mean()) if count else 0
        if precision>=.9 and coverage>=.5: choices.append((coverage,float(t),precision))
    return max(choices) if choices else None

def main():
    start=time.time(); torch.set_num_threads(4); torch.manual_seed(42); random.seed(42); np.random.seed(42)
    torch.use_deterministic_algorithms(True)
    manifest=json.loads((ROOT/'manifest.json').read_text()); rows=manifest['images']
    splits={s:[r for r in rows if r['split']==s] for s in ['train','validation','test']}
    weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1
    preprocess=weights.transforms()
    loaders={s:DataLoader(Images(v,preprocess),batch_size=32,shuffle=False,num_workers=0) for s,v in splits.items()}
    model=models.mobilenet_v3_small(weights=weights); model.classifier[-1]=nn.Linear(1024,6)
    # Frozen-backbone nearest-prototype baseline, without gradient training.
    feature=copy.deepcopy(nn.Sequential(model.features,model.avgpool,nn.Flatten())); feature.eval()
    def embed(loader):
        values=[]; ys=[]
        with torch.inference_mode():
            for x,y in loader: values.append(feature(x)); ys.extend(y.tolist())
        return torch.cat(values),torch.tensor(ys)
    train_x,train_y=embed(loaders['train']); val_x,val_y=embed(loaders['validation'])
    prototype=torch.stack([train_x[train_y==i].mean(0) for i in range(6)])
    proto_prob=(nn.functional.normalize(val_x)@nn.functional.normalize(prototype).T*10).softmax(1)
    baseline_validation=metrics(val_y.tolist(),proto_prob.argmax(1).tolist())
    print('Baseline validation:',json.dumps(baseline_validation),flush=True)
    best=-1; best_state=None; history=[]; class_weights=torch.tensor([len(train_y)/max(1,int((train_y==i).sum())) for i in range(6)]); class_weights/=class_weights.mean()
    criterion=nn.CrossEntropyLoss(weight=class_weights)
    augmentation=transforms.Compose([transforms.RandomResizedCrop(224,scale=(.75,1)),transforms.RandomHorizontalFlip(),transforms.ColorJitter(.15,.15,.15),transforms.ToTensor(),transforms.Normalize(mean=[.485,.456,.406],std=[.229,.224,.225])])
    train_loader=DataLoader(Images(splits['train'],augmentation),batch_size=32,shuffle=True,generator=torch.Generator().manual_seed(42),num_workers=0)
    # Both stages train on augmented training images; validation is never augmented.
    for stage,epochs,lr in [('head',8,.001),('last-block',12,.0001)]:
        if best_state is not None: model.load_state_dict(best_state)
        for p in model.parameters(): p.requires_grad=False
        for p in model.classifier.parameters(): p.requires_grad=True
        if stage=='last-block':
            for p in model.features[-1].parameters(): p.requires_grad=True
        optimizer=torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],lr=lr)
        stale=0
        for epoch in range(epochs):
            model.train(); model.features.eval() # retain pretrained batch-normalization statistics
            running=0
            for x,y in train_loader:
                optimizer.zero_grad(); loss=criterion(model(x),y); loss.backward(); optimizer.step(); running+=float(loss.detach())*len(y)
            probs,labels=probabilities(model,loaders['validation']); result=metrics(labels,probs.argmax(1).tolist())
            history.append({'stage':stage,'epoch':epoch+1,'loss':running/len(train_y),'validationMacroF1':result['macroF1']})
            print(json.dumps(history[-1]),flush=True)
            if result['macroF1']>best+1e-5: best=result['macroF1']; best_state=copy.deepcopy(model.state_dict()); stale=0
            else: stale+=1
            if stale>=4: break
    model.load_state_dict(best_state); val_prob,val_labels=probabilities(model,loaders['validation'])
    validation=metrics(val_labels,val_prob.argmax(1).tolist()); threshold=threshold_for(val_prob,val_labels)
    t=threshold[1] if threshold else .99
    ready=bool(threshold and validation['macroF1']>=.8 and min(c['recall'] for c in validation['classes'])>=.7 and validation['macroF1']>baseline_validation['macroF1'])
    version='mobilenet-v3-small-'+hashlib.sha256(json.dumps(history).encode()).hexdigest()[:12]
    folder=ROOT/'artifacts'; folder.mkdir(exist_ok=True)
    checkpoint={'state':best_state,'classes':CLASSES,'threshold':t,'modelVersion':version,'experimental':not ready,'architecture':'mobilenet_v3_small'}
    torch.save(checkpoint,folder/'model.pt')
    # The test set is opened only after checkpoint and confidence threshold are fixed.
    test_prob,test_labels=probabilities(model,loaders['test']); test_result=metrics(test_labels,test_prob.argmax(1).tolist())
    test_x,test_y=embed(loaders['test']); baseline_test=metrics(test_y.tolist(),(nn.functional.normalize(test_x)@nn.functional.normalize(prototype).T).argmax(1).tolist())
    scores,pred=test_prob.max(1); keep=scores>=t
    mistakes=[{'sampleId':row['id'],'source':row['source'],'expected':row['label'],'predicted':CLASSES[int(p)],'confidence':round(float(s),4)} for row,p,s in zip(splits['test'],pred,scores) if row['label']!=CLASSES[int(p)]][:40]
    sample=next(iter(loaders['validation']))[0][:1]; latencies=[]
    with torch.inference_mode():
        for _ in range(10): before=time.perf_counter(); model(sample); latencies.append((time.perf_counter()-before)*1000)
    report={'modelVersion':version,'architecture':'MobileNetV3 Small / ImageNet transfer learning','createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'status':'release-candidate' if ready else 'experimental','classes':CLASSES,'source':manifest['source'],'archiveSha256':manifest['archiveSha256'],'manifestSha256':hashlib.sha256((ROOT/'manifest.json').read_bytes()).hexdigest(),'seed':42,'counts':{s:len(r) for s,r in splits.items()},'baseline':{'validation':baseline_validation,'test':baseline_test},'trained':{'validation':validation,'test':test_result},'threshold':t,'validationAcceptanceTargetMet':bool(threshold),'testCoverage':float(keep.float().mean()),'acceptedTestPrecision':float((pred[keep]==torch.tensor(test_labels)[keep]).float().mean()) if keep.any() else None,'trainingSeconds':round(time.time()-start,2),'medianInferenceMs':round(float(np.median(latencies)),2),'epochs':history,'mistakes':mistakes,'limitations':['Dataset-provided labels; no expert-confirmed factory validation.','Single-object household images, not industrial material specifications.','Mixed piles and unfamiliar objects can still receive incorrect confident predictions.','No contamination, purity, exact grade, weight or price prediction.','Test metrics are TrashNet-only; external benchmarks have not run.']}
    (ROOT.parent/'reports/model/latest.json').write_text(json.dumps(report,indent=2)+'\n')
    (folder/'metadata.json').write_text(json.dumps({k:v for k,v in checkpoint.items() if k!='state'},indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['modelVersion','status','counts','trainingSeconds','medianInferenceMs']}),flush=True)
    print('Test metrics:',json.dumps(test_result),flush=True)
if __name__=='__main__': main()
