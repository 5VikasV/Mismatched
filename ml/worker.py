"""Persistent local inference; JSON lines on stdin/stdout, diagnostics on stderr."""
import base64, io, json, sys
from pathlib import Path
import torch
from PIL import Image, ImageOps
from torchvision import models
ROOT=Path(__file__).resolve().parent
Image.MAX_IMAGE_PIXELS=20_000_000
torch.set_num_threads(4)
try:
    checkpoint=torch.load(ROOT/'artifacts/model.pt',map_location='cpu',weights_only=True)
    model=models.mobilenet_v3_small(weights=None); model.classifier[-1]=torch.nn.Linear(1024,len(checkpoint['classes']))
    model.load_state_dict(checkpoint['state']); model.eval()
    transform=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1.transforms()
except Exception as error:
    print(str(error),file=sys.stderr); sys.exit(1)
for line in sys.stdin:
    request={}
    try:
        request=json.loads(line)
        with Image.open(io.BytesIO(base64.b64decode(request['dataBase64'],validate=True))) as image:
            if image.width*image.height>20_000_000: raise ValueError('Image exceeds 20 megapixels')
            tensor=transform(ImageOps.exif_transpose(image).convert('RGB')).unsqueeze(0)
        with torch.inference_mode(): scores=model(tensor).softmax(1)[0].tolist()
        ranked=sorted([{'category':c,'score':round(s,6)} for c,s in zip(checkpoint['classes'],scores)],key=lambda r:-r['score'])
        needs=checkpoint['experimental'] or ranked[0]['score']<checkpoint['threshold']
        result={'category':ranked[0]['category'],'scores':ranked,'confidence':ranked[0]['score'],'reviewRequired':True,'needsReview':needs,'modelVersion':checkpoint['modelVersion'],'experimental':checkpoint['experimental'],'threshold':checkpoint['threshold']}
        print(json.dumps({'id':request['id'],'result':result}),flush=True)
    except Exception:
        print(json.dumps({'id':request.get('id'),'error':'Image could not be decoded or classified.'}),flush=True)
