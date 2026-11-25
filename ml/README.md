# Local specialist vision

Requires Python 3.14+ for the pinned CPU wheels, Node 24+, approximately 2 GB free disk space, and internet access for the initial dataset/weight/dependency downloads. Inference makes no network requests. No paid APIs are used by these commands.

```bash
python3 -m venv .venv
.venv/bin/pip install -r ml/requirements.txt
.venv/bin/python ml/prepare.py
.venv/bin/python -m unittest discover -s ml -p 'test_*.py'
.venv/bin/python ml/train.py
npm run dev
```

Training uses four CPU threads. Override `ML_PYTHON` only when the virtual environment is installed elsewhere. Node starts one persistent Python worker on the first local classification. Workers accept one request at a time and restart after failure/timeout. Images are processed transiently; only suggestions and original analysis evidence are stored in SQLite.

The six categories are cardboard, glass, metal, paper, plastic, and other. `other` corresponds to TrashNet's trash class; it is not a reliable detector of every unfamiliar object. No industrial grades, contamination, purity, quantities, or prices are inferred by the local model.

`datasets.json` records the original authors, checksum, license and intended use. TrashNet's author dataset card specifies MIT. Cite Gary Thung and Mindy Yang, https://github.com/garythung/trashnet. The resized archive is checksum-pinned even if the upstream URL changes. Exact pixel duplicates are removed; conflicts are quarantined; dHash distance <=4 groups near duplicates before a seed-42 70/15/15 group split. A hash-based grouping cannot guarantee detection of every photo of the same physical item. The manifest records original paths, pixel hashes, encoded image hashes, groups, splits and dataset-provided label provenance. No label is marked expert-confirmed.

TACO remains an external evaluation candidate pending per-image permission verification and taxonomy mapping. ZeroWaste is CC BY-NC 4.0 and excluded from training and the distributable model. Neither has been evaluated by this training command. All initial metrics are TrashNet-only, mostly isolated household objects on white backgrounds.

The baseline uses frozen ImageNet MobileNetV3 Small features and class prototypes from training images. Then head training (up to 8 epochs) and final-block fine-tuning (up to 12) use training-only augmentation and class-weighted cross entropy. Each stage stops after 4 stale validation epochs. Checkpoint and confidence threshold are selected on validation, never test. Training uses deterministic settings and seed 42; platform/version changes can still affect exact numerical results.

A release candidate needs validation macro-F1 >= .80, every class recall >= .70, improvement over baseline, and a validation confidence threshold giving accepted precision >= .90 at coverage >= .50. Otherwise the model is labelled experimental. Every suggestion requires human confirmation even for a release candidate. Confidence scores are uncalibrated model scores, not guarantees. Mixed piles and unfamiliar objects may still be confidently misclassified.

Actual weights and downloads stay in ignored `ml/artifacts/`, `ml/data/`, `ml/cache/`. The committed `ml/manifest.json` and `reports/model/latest.json` reproduce dataset membership and report measured results; a fresh clone must train/download a model locally before classification becomes available. The results page remains accessible without a checkpoint and clearly distinguishes installation status from past reports.
