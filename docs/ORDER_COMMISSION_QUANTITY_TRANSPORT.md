# ScrapLoop: commission, quantity categories and pickup responsibility

These three capabilities extend the real pool planner. Booking requests are stored in the local SQLite database; saving a request does not take payment, reserve inventory, dispatch a carrier or establish acceptance by the parties.

## 1. Fixed platform commission

The agreed policy is non-negotiable. Determine the rate from the **whole order’s material subtotal**, excluding transport, taxes and payment-processing charges. Apply the rate to the entire subtotal, not progressively to slabs. Buyer pays **70% of the commission**, and sellers pay **30%**.

| Material subtotal | Total platform commission | Buyer rate on material value | Seller rate on material value |
| --- | --- | --- | --- |
| Below ₹1,00,000 | 5% | 3.5% | 1.5% |
| ₹1,00,000 through ₹10,00,000 inclusive | 4% | 2.8% | 1.2% |
| Above ₹10,00,000 | 3% | 2.1% | 0.9% |

For a ₹2,00,000 material deal, the total commission is ₹8,000: buyer ₹5,600 and sellers ₹2,400. Without transport, buyer outlay is ₹2,05,600 and total seller net proceeds are ₹1,97,600. Projected platform commission is ₹8,000, not additional material value.

For a ₹20,00,000 material deal, commission is ₹60,000: buyer ₹42,000 and sellers ₹18,000. These are projected earnings until a deal completes; the application does not claim collected revenue.

The rate depends on the pooled material total, not individual lot values. The whole-order method produces a commission step down at each threshold; this is intentional under the agreed policy. Rates cannot be edited in the planner or overridden by a client request.

Round total commission to paise first, then round its 70% buyer share. The seller share is the exact remainder. Allocate that seller share proportionally to the contributing lots’ material values using cumulative paise reconciliation. The per-lot deductions always add up to the seller commission.

These rates are the team’s chosen launch policy, not a proven optimum. As business context, [Alibaba’s official Trade Assurance page](https://activity.alibaba.com/ggs/tradeassurance.html) lists a 3% seller transaction fee; its service and economics differ from ScrapLoop. [Razorpay’s pricing](https://razorpay.com/pricing/?preferred-country=IN) describes payment-provider fees, which are distinct from marketplace commission and are not included here. No payment integration is implemented.

## 2. Quantity categories in metric tonnes

Enter the exact required quantity in kilograms or metric tonnes. **1 metric tonne = 1,000 kg.** Switching units converts the current value rather than reinterpreting it. Stored quantities remain kg, at up to six decimal places.

| Category | Exact required quantity |
| --- | --- |
| Below 10 t | Greater than zero and below 10 t |
| 10–100 t | 10 t through 100 t inclusive |
| Over 100–200 t | Greater than 100 t through 200 t inclusive |
| Over 200–500 t | Greater than 200 t through 500 t inclusive |
| Over 500 t | Greater than 500 t |

Labels use “over 100” rather than “101” so values such as 100.5 t are not lost between categories. Exactly 100 t belongs in 10–100 t. A 0.12 t order remains supported as 120 kg.

The order category follows the **required quantity**, not the amount currently allocated. Category buttons filter individual lots by their available quantity; they do not set the buyer’s exact requirement or silently change the selected lots. The result continues to list every actual contributing lot. Small lots can combine into a larger order.

## 3. Decide transport when creating the request

For every contributing lot, provide:

1. Vehicle provider: buyer-owned vehicle, seller-owned vehicle or external carrier.
2. Cost payer: buyer or that pickup’s seller.
3. Proposed pickup cost in INR, for the entire allocated lot and all required trips.

Provider and payer are independent. For example, a seller-owned truck can carry a lot while the buyer covers the proposed cost. Owning a vehicle does not imply zero operating cost. A zero amount requires its own explicit confirmation. Each contributing material lot has a separate pickup entry, even when two lots share a company name; records do not yet have a verified shared logistics identity.

The app does not infer truck availability, capacity, routes or quotations. Parties must check the suitability and availability of an owned vehicle or arrange the external carrier before final agreement. The cost is user-proposed, not a live carrier quote.

### Financial calculation

- **Buyer outlay** = material subtotal + buyer commission + buyer-paid transport.
- **Each seller’s net proceeds** = its gross material allocation − its commission share − transport costs assigned to that seller’s pickup.
- **Total transport** = buyer-paid transport + seller-paid transport; transport is never commissionable.
- **Potential buyer savings** = required kg × comparison price per kg − buyer outlay.

Seller-paid transport reduces seller proceeds; it is not also charged to the buyer. Negative seller proceeds prevent request creation. Savings remain unknown until supply covers the full requirement and every transport decision is complete. A complete request with no positive savings requires an explicit acknowledgement.

## Request workflow and stored evidence

1. Review and save material records with confirmed grade, clean condition, quantity and price.
2. Calculate a pool; complete each pickup entry and select **Update transport totals**.
3. Select **Create booking request**. The server refreshes the commercial quote from current material records.
4. Review the allocation, tier, buyer/seller fees, net proceeds and transport responsibilities. Confirm the terms and any no-positive-savings acknowledgement.
5. Select **Save booking request**. It appears under **Booking requests** as **Pending agreement**.
6. Inspect or export the saved snapshot after reload. To change terms, cancel the request explicitly and create a new one. Cancellation retains the original terms and timestamp.

Requests include exact kg, quantity category, comparison assumptions, allocations, fixed policy version, transport decisions and financial totals. Later edits/deletion of research records do not rewrite saved snapshots. Request terms cannot be patched. They do not decrement stock because research records are not verified inventory.

The server recomputes the quote and rejects stale material records or changed commercial terms. Submission keys make retries idempotent; reusing a key for different terms is rejected. Review/saving temporarily disables inputs to avoid changing a request in flight. After an ambiguous save failure, retry the same submission; inspect Booking requests before starting a new one.

## Interfaces and compatibility

- `POST /api/booking-quotes`: requirements (material, grade, exact kg, comparison price, selected IDs) and one pickup decision per allocation; returns authoritative plan, policy version and quote signature.
- `POST /api/booking-requests`: reviewed terms, signature, unique submission key, confirmation and any uneconomical acknowledgement; returns the immutable request, or the existing request for an identical retry.
- `GET /api/booking-requests`: saved requests, newest first.
- `GET /api/booking-requests/:id`: saved details.
- `POST /api/booking-requests/:id/cancel`: explicit cancellation confirmation.
- `/api/status` additionally reports `bookingRequestCount` (including cancelled requests).

An additive `booking_requests` table stores snapshots and idempotency keys. Existing research records, source data, `.env` and ML assets are unchanged. Existing CSV files remain historical; new exports include quantity bands, fee shares, per-pickup responsibilities and seller net proceeds. Booking CSVs explicitly identify their request ID/status and remain non-invoice snapshots.

All routes remain local-only and account-free. A public multi-user marketplace would require authentication, party acceptance, inventory controls, payment/tax handling and carrier integration beyond this release.

## Verification

Completed 60 Node tests and 33 browser scenarios across mobile (360 px), tablet (768 px) and desktop (1366 px), run in viewport batches. Final booking/search/retry scenarios were rerun after integration. No production database or paid provider was used.

Tests cover exact tier boundaries; pooled totals; tiny-value rounding; all provider/payer combinations; missing, duplicate, negative and zero-cost pickup inputs; tonne boundaries/conversion; incomplete pools; negative seller proceeds; acknowledgement; server-side rate enforcement; stale records; idempotency; cancellation and SQLite persistence. Browser walkthroughs exercise booking creation/reload/export/cancellation and the existing local-classification, review and planner workflows at 360, 768 and 1366 pixels. Tests use disposable databases and no paid provider key.
