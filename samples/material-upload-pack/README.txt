SCRAPLOOP MATERIAL UPLOAD KIT

Open index.html to browse all six PDF / JPG pairs.

1. Plastic packaging insert: 1,200 kg at INR 35/kg (INR 42,000).
2. Metal foil: 750 kg at INR 85/kg (INR 63,750).
3. Glass jars: 2,000 kg at INR 6/kg (INR 12,000).
4. Cardboard packaging: 1,000 kg at INR 12/kg (INR 12,000).
5. Moulded paper pulp packaging: 800 kg at INR 10/kg (INR 8,000).
6. Used plastic bottles: 600 kg at INR 28/kg (INR 16,800).

All prices, quantities, companies and lot locations are sample test data.
No records are created in ScrapLoop by opening these files.
The original PP sample PDF outside this folder is also rebuilt with the updated sample labels.

HOW TO USE

Open Workspace > Material analysis and start a new record for each upload.
- Choose a JPG and click Analyse to use the installed local image classifier.
  It suggests a broad category, not grade, cleanliness, weight or price.
- Choose its matching PDF and click Analyse to extract the written lot data
  through your configured document provider. This uses the server-side API key
  and can incur provider charges. No provider calls were made to create this kit.
- Review the suggested details. Save only if you want a clearly labelled SAMPLE
  record. The PDF and JPG are independent uploads; the app does not merge them
  automatically. Do not save them as two records for the same lot.
- Unknown grade and condition are deliberate. The planner requires confirmed
  grade and clean condition; these documents do not certify either. Use the
  planner's explicit sample test-lot option to test a ready-to-plan example.

WHAT THE PHOTOS ARE

These are real, unchanged photos from TrashNet by Gary Thung and Mindy Yang,
not AI-generated images. They show individual discarded objects, not actual
bulk factory stock belonging to the invented supplier.

Dataset: https://huggingface.co/datasets/garythung/trashnet
Original repository: https://github.com/garythung/trashnet
License: MIT; see TRASHNET-LICENSE.txt for the full upstream notice.
Each PDF embeds its matching photo. The separate JPG is the original image
for upload; it has no added text or material label inside the image.
manifest.json records original filenames, hashes, labels and provenance.
Labels are dataset-provided, not expert-confirmed industrial specifications.

LOCAL CHECK

See local-inference-results.json for actual installed-model predictions.
The first five images were selected as the first held-out image per class in
the existing locked manifest, before inference. The extra plastic bottle was
selected visually, before inference. The plastic insert is deliberately kept
as a failure example: the model suggested paper and flagged it for review.
This small upload kit is not a new independent accuracy test and must not be
used to claim an industrial accuracy percentage. No model was retrained.
All predictions require review, even if needsReview is false (above threshold).

REBUILDING / FUTURE SAMPLE MATERIALS

From the project root, run:
  node scripts/create-material-samples.mjs

If Playwright cannot find Chromium, set PLAYWRIGHT_CHROMIUM_EXECUTABLE to your
installed Chromium executable. Rebuilding requires the existing local TrashNet
data and ml/manifest.json. It makes no network, paid API or database requests.

Keep future samples paired: one searchable PDF + one genuine material photo,
include the photo in the PDF, and retain the original source, permissions and
explicit separation between measured facts and invented commercial details.
