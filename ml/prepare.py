"""Download pinned TrashNet pixels and create a leakage-resistant manifest."""
import hashlib, io, json, random, urllib.request, zipfile
from pathlib import Path
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parent
CLASSES = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'other']

def hamming(a, b):
    return (a ^ b).bit_count()

def dhash(image):
    pixels = list(ImageOps.grayscale(image).resize((9, 8)).get_flattened_data())
    return sum((pixels[y*9+x] > pixels[y*9+x+1]) << (y*8+x) for y in range(8) for x in range(8))

def assign_splits(groups, seed=42):
    rng = random.Random(seed)
    for label in CLASSES:
        items = sorted((g for g in groups if g['label'] == label), key=lambda g:g['id'])
        rng.shuffle(items)
        n = len(items)
        for i, group in enumerate(items):
            split = 'train' if i < int(n*.7) else 'validation' if i < int(n*.85) else 'test'
            for item in group['members']: item['split'] = split
    return [i for g in groups for i in g['members']]

def main():
    folder = ROOT/'data'; folder.mkdir(exist_ok=True)
    source = json.loads((ROOT/'datasets.json').read_text())['sources'][0]
    archive = folder/'trashnet.zip'
    if not archive.exists():
        with urllib.request.urlopen(source['download'], timeout=120) as response:
            archive.write_bytes(response.read())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != source['sha256']: raise ValueError('Dataset archive checksum mismatch')
    images = folder/'images'; images.mkdir(exist_ok=True)
    entries=[]; seen={}; parent=[]; hashes=[]; conflicts=set()
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i=parent[i]
        return i
    with zipfile.ZipFile(archive) as z:
        for name in sorted(z.namelist()):
            p=Path(name)
            if '__MACOSX' in name or p.name.startswith('.') or p.suffix.lower() not in ['.jpg','.jpeg','.png']: continue
            label = 'other' if p.parent.name == 'trash' else p.parent.name
            if label not in CLASSES: continue
            raw=z.read(name)
            with Image.open(io.BytesIO(raw)) as im:
                im=ImageOps.exif_transpose(im).convert('RGB'); pixel=hashlib.sha256(im.tobytes()).hexdigest()
                if pixel in seen:
                    if seen[pixel] != label: conflicts.add(pixel)
                    continue
                seen[pixel]=label; perceptual=dhash(im)
                output=images/f'{pixel}.jpg'; im.save(output,quality=95)
            i=len(entries); parent.append(i)
            # Near duplicates are grouped even across classes to prevent leakage.
            for j, h in enumerate(hashes):
                if hamming(perceptual,h)<=4: parent[find(i)] = find(j)
            hashes.append(perceptual)
            entries.append({'id':pixel,'path':str(output.relative_to(ROOT)),'label':label,'source':'trashnet','originalPath':name,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'pixelHash':pixel,'labelProvenance':'dataset_provided','expertConfirmed':False})
    groups={}
    for i,item in enumerate(entries):
        if item['pixelHash'] in conflicts: continue
        key=find(i); groups.setdefault(key,{'id':entries[key]['id'],'label':entries[key]['label'],'members':[]})['members'].append(item)
    manifest=assign_splits(list(groups.values()))
    for key,group in groups.items():
        for item in group['members']: item['groupId']=group['id']
    manifest.sort(key=lambda i:i['id'])
    (ROOT/'manifest.json').write_text(json.dumps({'seed':42,'archiveSha256':digest,'source':source,'classes':CLASSES,'quarantinedConflictingPixelHashes':sorted(conflicts),'images':manifest},indent=2)+'\n')
    print(json.dumps({'uniqueImages':len(manifest),'quarantinedConflicts':len(conflicts),'groups':len(groups),'splits':{s:sum(i['split']==s for i in manifest) for s in ['train','validation','test']}}),flush=True)
if __name__=='__main__': main()
