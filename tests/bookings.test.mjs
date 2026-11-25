import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
async function call(app, path, data, method = data ? "POST" : "GET") {
  const req = Readable.from(data ? [Buffer.from(JSON.stringify(data))] : []);
  Object.assign(req, {
    url: path,
    method,
    headers: { host: "localhost:4173", "content-type": "application/json" },
  });
  let status, payload;
  const res = {
    headersSent: false,
    setHeader() {},
    writeHead(s) {
      status = s;
      this.headersSent = true;
    },
    end(v) {
      payload = JSON.parse(v.toString());
    },
  };
  await app.handle(req, res);
  return { status, ...payload };
}
async function fixture(t, options = {}) {
  const app = createApp({ dbPath: ":memory:", apiKey: "", ...options });
  t.after(() => app.close());
  const { record } = await call(app, "/api/records", {
    title: "Reviewed PP",
    company: "Supplier",
    material: "PP",
    grade: "PP-H",
    condition: "Clean",
    quantityKg: 20000,
    pricePerKg: 10,
    confirmed: true,
  });
  const terms = {
    requirements: {
      material: "PP",
      grade: "PP-H",
      quantityKg: 10000,
      comparisonPrice: 20,
      selectedRecordIds: [record.id],
    },
    pickups: [
      {
        recordId: record.id,
        provider: "seller_owned",
        payer: "buyer",
        cost: 1000,
      },
    ],
  };
  return { app, record, terms };
}
async function payload(app, terms) {
  const quote = await call(app, "/api/booking-quotes", terms);
  assert.equal(quote.status, 200);
  return {
    ...terms,
    signature: quote.signature,
    idempotencyKey: crypto.randomUUID(),
    confirmed: true,
    acknowledgeUneconomical: false,
  };
}
test("booking server recomputes fixed fees, rejects injected rates and locks transport snapshots", async (t) => {
  const { app, record, terms } = await fixture(t);
  assert.equal(
    (
      await call(app, "/api/booking-quotes", {
        ...terms,
        requirements: { ...terms.requirements, feePercent: 0 },
      })
    ).status,
    400,
  );
  const input = await payload(app, terms);
  const saved = await call(app, "/api/booking-requests", {
    ...input,
    plan: { totalCost: 1 },
  });
  assert.equal(saved.status, 201);
  assert.equal(saved.request.status, "pending_agreement");
  assert.equal(saved.request.plan.feePercent, 4);
  assert.equal(saved.request.plan.buyerFee, 2800);
  assert.equal(saved.request.plan.totalCost, 103800);
  assert.equal(saved.request.plan.sellerNet, 98800);
  assert.equal(
    saved.request.plan.allocations[0].pickup.provider,
    "seller_owned",
  );
  await call(
    app,
    `/api/records/${record.id}`,
    { confirmed: true, pricePerKg: 99 },
    "PATCH",
  );
  const detail = await call(app, `/api/booking-requests/${saved.request.id}`);
  assert.equal(detail.request.plan.materialCost, 100000);
  assert.equal(
    (
      await call(
        app,
        `/api/booking-requests/${saved.request.id}`,
        { plan: {} },
        "PATCH",
      )
    ).status,
    404,
  );
});
test("submission retry is idempotent before/after cancellation and conflicting reuse is rejected", async (t) => {
  const { app, terms } = await fixture(t);
  const input = await payload(app, terms);
  const first = await call(app, "/api/booking-requests", input);
  const retry = await call(app, "/api/booking-requests", input);
  assert.equal(retry.status, 200);
  assert.equal(retry.request.id, first.request.id);
  assert.equal(
    (
      await call(app, "/api/booking-requests", {
        ...input,
        acknowledgeUneconomical: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(app, `/api/booking-requests/${first.request.id}/cancel`, {}))
      .status,
    400,
  );
  const cancelled = await call(
    app,
    `/api/booking-requests/${first.request.id}/cancel`,
    { confirmed: true },
  );
  assert.equal(cancelled.request.status, "cancelled");
  assert.equal(
    (await call(app, "/api/booking-requests", input)).request.status,
    "cancelled",
  );
  assert.equal((await call(app, "/api/booking-requests")).requests.length, 1);
  assert.equal((await call(app, "/api/status")).bookingRequestCount, 1);
});
test("changed rates, deleted records and loss of confirmation reject stale quotes", async (t) => {
  for (const change of [
    { pricePerKg: 12 },
    { quantityKg: 1 },
    { fieldReview: { material: "ai_suggestion" } },
  ]) {
    const { app, record, terms } = await fixture(t);
    const input = await payload(app, terms);
    await call(
      app,
      `/api/records/${record.id}`,
      { confirmed: true, ...change },
      "PATCH",
    );
    assert.equal((await call(app, "/api/booking-requests", input)).status, 409);
    assert.equal((await call(app, "/api/booking-requests")).requests.length, 0);
  }
  const { app, record, terms } = await fixture(t);
  const input = await payload(app, terms);
  await call(app, `/api/records/${record.id}`, {}, "DELETE");
  assert.equal((await call(app, "/api/booking-requests", input)).status, 409);
});
test("transport decisions, zero-cost intent, nonnegative proceeds and complete supply are mandatory", async (t) => {
  const { app, record, terms } = await fixture(t);
  for (const value of [
    { ...terms, pickups: [] },
    { ...terms, pickups: [terms.pickups[0], terms.pickups[0]] },
    { ...terms, pickups: [{ ...terms.pickups[0], cost: 0 }] },
    {
      ...terms,
      pickups: [{ ...terms.pickups[0], payer: "seller", cost: 200000 }],
    },
    { ...terms, pickups: [{ ...terms.pickups[0], cost: 1.001 }] },
    { ...terms, requirements: { ...terms.requirements, quantityKg: 30000 } },
  ])
    assert.equal((await call(app, "/api/booking-quotes", value)).status, 400);
  const zero = {
    ...terms,
    pickups: [
      {
        recordId: record.id,
        provider: "buyer_owned",
        payer: "seller",
        cost: 0,
        zeroCostConfirmed: true,
      },
    ],
  };
  assert.equal((await call(app, "/api/booking-quotes", zero)).status, 200);
});
test("uneconomical requests require explicit acknowledgement and reviewed commercial terms", async (t) => {
  const { app, terms } = await fixture(t);
  terms.requirements.comparisonPrice = 1;
  const input = await payload(app, terms);
  assert.equal(
    (await call(app, "/api/booking-requests", { ...input, confirmed: false }))
      .status,
    400,
  );
  assert.equal((await call(app, "/api/booking-requests", input)).status, 400);
  assert.equal(
    (
      await call(app, "/api/booking-requests", {
        ...input,
        acknowledgeUneconomical: true,
      })
    ).status,
    201,
  );
});
test("additive booking table persists through reopen and material deletion without changing snapshots", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "scraploop-bookings-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "test.sqlite");
  const { app, record, terms } = await fixture(t, { dbPath: path });
  const saved = await call(
    app,
    "/api/booking-requests",
    await payload(app, terms),
  );
  await call(app, `/api/records/${record.id}`, {}, "DELETE");
  const reopened = createApp({ dbPath: path, apiKey: "" });
  try {
    assert.deepEqual(
      (await call(reopened, `/api/booking-requests/${saved.request.id}`))
        .request,
      saved.request,
    );
  } finally {
    reopened.close();
  }
});

test('planned impact API uses saved quotes and explicit benchmark opt-in; cancelled requests disappear',async t=>{
 const {app,terms}=await fixture(t);const saved=await call(app,'/api/booking-requests',await payload(app,terms));
 const impact=await call(app,'/api/impact');assert.equal(impact.requestCount,1);assert.equal(impact.co2CreditKg,null);assert.equal(impact.actualDeliveredKg,null);
 const scenario=await call(app,'/api/impact?scenario=warm-closed-loop');assert.ok(scenario.co2CreditKg>0);assert.match(scenario.rows[0].factor.source,/epa.gov/);
 await call(app,`/api/booking-requests/${saved.request.id}/cancel`,{confirmed:true});assert.equal((await call(app,'/api/impact')).requestCount,0);
 assert.equal((await call(app,'/api/compatibility-rules')).factories.length,0);
});
test('quote geography validates coordinate pairs and never invents a buyer location',async t=>{
 const {app,record,terms}=await fixture(t);await call(app,`/api/records/${record.id}`,{confirmed:true,latitude:18.5204,longitude:73.8567},'PATCH');
 assert.equal((await call(app,'/api/booking-quotes',{...terms,requirements:{...terms.requirements,buyerLatitude:18}})).status,400);
 assert.equal((await call(app,'/api/booking-quotes',{...terms,requirements:{...terms.requirements,buyerLatitude:19.076,buyerLongitude:72.8777}})).status,400);
 assert.equal((await call(app,'/api/booking-quotes',terms)).status,200);
});
