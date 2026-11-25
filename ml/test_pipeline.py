import unittest
from prepare import assign_splits, hamming
class PipelineTests(unittest.TestCase):
    def test_groups_never_cross_splits(self):
        groups=[{'id':str(i),'label':'metal','members':[{'id':str(i)+'a'},{'id':str(i)+'b'}]} for i in range(30)]
        first=assign_splits(groups)
        mapping={r['id']:r['split'] for r in first}
        self.assertEqual(mapping,{r['id']:r['split'] for r in assign_splits(groups)})
        for i in range(30): self.assertEqual(mapping[str(i)+'a'],mapping[str(i)+'b'])
        self.assertEqual(set(mapping.values()),{'train','validation','test'})
    def test_hamming(self): self.assertEqual(hamming(15,0),4)
if __name__=='__main__': unittest.main()
