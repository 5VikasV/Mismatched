import unittest, json
from pathlib import Path
from train import metrics, threshold_for
import torch
from prepare import assign_splits, hamming
class PipelineTests(unittest.TestCase):
    def test_groups_never_cross_splits(self):
        groups=[{'id':str(i),'label':'metal','members':[{'id':str(i)+'a'},{'id':str(i)+'b'}]} for i in range(30)]
        first=assign_splits(groups)
        mapping={r['id']:r['split'] for r in first}
        self.assertEqual(mapping,{r['id']:r['split'] for r in assign_splits(groups)})
        for i in range(30): self.assertEqual(mapping[str(i)+'a'],mapping[str(i)+'b'])
        self.assertEqual(set(mapping.values()),{'train','validation','test'})
    def test_metrics_use_all_classes_and_record_confusion(self):
        r=metrics([0,1,2,3,4,5],[0,1,2,3,4,5])
        self.assertEqual(r['macroF1'],1); self.assertEqual(r['accuracy'],1)
        wrong=metrics([0,1],[1,0]); self.assertEqual(wrong['accuracy'],0)
        self.assertEqual(wrong['confusionMatrix'][0][1],1)
    def test_threshold_rejects_unattainable_precision(self):
        probs=torch.tensor([[.6,.4,0,0,0,0],[.6,.4,0,0,0,0]])
        self.assertIsNone(threshold_for(probs,[1,1]))
        self.assertIsNotNone(threshold_for(probs,[0,0]))
    def test_real_manifest_has_no_cross_split_duplicate_groups(self):
        path=Path(__file__).parent/'manifest.json'
        if not path.exists(): self.skipTest('Prepare real dataset first')
        manifest=json.loads(path.read_text()); groups={}; pixels=set()
        for image in manifest['images']:
            self.assertNotIn(image['pixelHash'],pixels); pixels.add(image['pixelHash'])
            self.assertNotIn(image['pixelHash'],manifest['quarantinedConflictingPixelHashes'])
            if image['groupId'] in groups: self.assertEqual(groups[image['groupId']],image['split'])
            groups[image['groupId']]=image['split']
            self.assertFalse(image['expertConfirmed'])
            self.assertEqual(image['labelProvenance'],'dataset_provided')
        for split in ['train','validation','test']:
            self.assertEqual(set(i['label'] for i in manifest['images'] if i['split']==split),set(manifest['classes']))
    def test_hamming(self): self.assertEqual(hamming(15,0),4)
if __name__=='__main__': unittest.main()
