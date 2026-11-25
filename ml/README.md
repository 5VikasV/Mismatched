# Local specialist vision

Requires Python 3.14+ for the pinned CPU wheels, Node 24+, approximately 2 GB free disk space, and internet access for the initial dataset/weight/dependency downloads. Inference makes no network requests. No paid APIs are used by these commands.

```bash
python3 -m venv .venv
.venv/bin/pip install -r ml/requirements.txt
.venv/bin/python ml/prepare.py
.venv/bin/python -m unittest discover -s ml -p 'test_*.py'
.venv/bin/python ml/train.py
.venv/bin/python ml/improve.py
npm run dev
```

Training uses four CPU threads. Override `ML_PYTHON` only when the virtual environment is installed elsewhere. Node starts one persistent Python worker on the first local classification. Workers accept one request at a time and restart after failure/timeout. Images are processed transiently; only suggestions and original analysis evidence are stored in SQLite.

The six categories are cardboard, glass, metal, paper, plastic, and other. `other` corresponds to TrashNet's trash class; it is not a reliable detector of every unfamiliar object. No industrial grades, contamination, purity, quantities, or prices are inferred by the local model.

`datasets.json` records the original authors, checksum, license and intended use. TrashNet's author dataset card specifies MIT. Cite Gary Thung and Mindy Yang, https://github.com/garythung/trashnet. The resized archive is checksum-pinned even if the upstream URL changes. Exact pixel duplicates are removed; conflicts are quarantined; dHash distance <=4 groups near duplicates before a seed-42 70/15/15 group split. A hash-based grouping cannot guarantee detection of every photo of the same physical item. The manifest records original paths, pixel hashes, encoded image hashes, groups, splits and dataset-provided label provenance. No label is marked expert-confirmed.

TACO remains an external evaluation candidate pending per-image permission verification and taxonomy mapping. ZeroWaste is CC BY-NC 4.0 and excluded from training and the distributable model. Neither has been evaluated by this training command. All initial metrics are TrashNet-only, mostly isolated household objects on white backgrounds.

The baseline uses frozen ImageNet MobileNetV3 Small features and class prototypes from training images. Then head training (up to 8 epochs) and final-block fine-tuning (up to 12) use training-only augmentation and class-weighted cross entropy. Each stage stops after 4 stale validation epochs. Checkpoint and confidence threshold are selected on validation, never test. Training uses deterministic settings and seed 42; platform/version changes can still affect exact numerical results.

A release candidate needs validation macro-F1 >= .80, every class recall >= .70, improvement over baseline, and a validation confidence threshold giving accepted precision >= .90 at coverage >= .50. Otherwise the model is labelled experimental. Every suggestion requires human confirmation even for a release candidate. Confidence scores are uncalibrated model scores, not guarantees. Mixed piles and unfamiliar objects may still be confidently misclassified.

Actual weights and downloads stay in ignored `ml/artifacts/`, `ml/data/`, `ml/cache/`. The committed `ml/manifest.json` and `reports/model/latest.json` reproduce dataset membership and report measured results; a fresh clone must train/download a model locally before classification becomes available. The results page remains accessible without a checkpoint and clearly distinguishes installation status from past reports.

To re-evaluate the installed checkpoint on the locked test split without training, run `.venv/bin/python ml/evaluate.py`. This prints metrics without selecting a new checkpoint, changing thresholds, or overwriting the original report. Do not use repeat test results to tune hyperparameters; use validation for development.

To fine-tune an already installed MobileNetV3 Small checkpoint, run `npm run ml:improve`. This preserves the original manifest and starts from the installed weights. It trains all feature blocks with a smaller backbone learning rate, frozen batch-normalization statistics, label smoothing, modest crop/rotation/flip/colour augmentation, gradient clipping and a cosine learning-rate schedule. Training is CPU-only with four threads, up to 24 epochs and seven-epoch early stopping. Selection uses validation macro-F1; the acceptance threshold also comes from validation. The test loader is opened once after those choices are fixed. A candidate must improve validation macro-F1 and pass the existing class-recall and acceptance gates to replace the installed model; its test result does not determine selection.

Every improvement run backs up the previous weights, metadata and report under ignored `ml/artifacts/runs/`. A promoted model archives the old public report under `reports/model/archive/` and updates `reports/model/latest.json`. The website reads the current report and shows the previous model alongside the new result. Restart an already running server after installing new weights so its persistent Python worker loads the new checkpoint. The same previously reported test split is reused: this comparison is not a fresh independent benchmark and does not validate industrial grades or contamination. Do not tune training to the published sample-photo failures.
