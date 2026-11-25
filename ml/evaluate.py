"""Re-evaluate the locked test split without training or selecting a checkpoint."""
import json
from pathlib import Path
import torch
from torch.utils.data import DataLoader
from torchvision import models
from train import Images, metrics, probabilities, ROOT

def main():
    torch.set_num_threads(4)
    checkpoint=torch.load(ROOT/'artifacts/model.pt',map_location='cpu',weights_only=True)
    manifest=json.loads((ROOT/'manifest.json').read_text())
    if checkpoint['classes']!=manifest['classes']: raise ValueError('Model and dataset classes differ')
    rows=[r for r in manifest['images'] if r['split']=='test']
    model=models.mobilenet_v3_small(weights=None)
    model.classifier[-1]=torch.nn.Linear(1024,len(checkpoint['classes']))
    model.load_state_dict(checkpoint['state'])
    loader=DataLoader(Images(rows,models.MobileNet_V3_Small_Weights.IMAGENET1K_V1.transforms()),batch_size=32)
    probs,labels=probabilities(model,loader)
    scores,pred=probs.max(1); keep=scores>=checkpoint['threshold']
    result={'modelVersion':checkpoint['modelVersion'],'split':'locked test','count':len(rows),'metrics':metrics(labels,pred.tolist()),'coverage':float(keep.float().mean()),'acceptedPrecision':float((pred[keep]==torch.tensor(labels)[keep]).float().mean()) if keep.any() else None}
    print(json.dumps(result,indent=2))
if __name__=='__main__': main()
