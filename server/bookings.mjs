import { createHash, randomUUID } from "node:crypto";
import { planPool } from "../dist/planner.js";
import { toKg, POLICY_VERSION } from "../dist/trade-policy.js";
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
const digest = (v) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex");
export function createBookings({ db, body, send, fail, all }) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS booking_requests (id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, body_hash TEXT NOT NULL, json TEXT NOT NULL)",
  );
  const list = () =>
    all("booking_requests").sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  function quote(value) {
    const r = value.requirements;
    if (
      !r ||
      typeof r !== "object" ||
      Array.isArray(r) ||
      Object.keys(r).some(
        (k) =>
          ![
            "material",
            "grade",
            "quantityKg",
            "comparisonPrice",
            "selectedRecordIds",
          ].includes(k),
      )
    )
      fail(
        400,
        "invalid_requirements",
        "Provide material, grade, kg, comparison price and selected record IDs only.",
      );
    if (
      toKg(r.quantityKg) !== r.quantityKg ||
      !Array.isArray(r.selectedRecordIds) ||
      r.selectedRecordIds.length > 1000
    )
      fail(
        400,
        "invalid_requirements",
        "Choose lots and a positive quantity with up to six kg decimal places.",
      );
    if (!Array.isArray(value.pickups) || value.pickups.length > 1000)
      fail(
        400,
        "invalid_transport",
        "Provide one pickup decision for every allocated lot.",
      );
    const records = all("records");
    const plan = planPool(records, { ...r, pickups: value.pickups });
    if (!plan.complete || !plan.transportComplete)
      fail(400, "invalid_booking", plan.reason);
    const snapshots = plan.allocations.map((a) =>
      records.find((r) => r.id === a.recordId),
    );
    return {
      plan,
      signature: digest({ requirements: r, plan, snapshots }),
      policyVersion: POLICY_VERSION,
    };
  }
  return async function handle(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/booking-requests") {
      send(res, 200, { requests: list() });
      return true;
    }
    if (req.method === "POST" && pathname === "/api/booking-quotes") {
      send(res, 200, quote(await body(req)));
      return true;
    }
    if (req.method === "POST" && pathname === "/api/booking-requests") {
      const value = await body(req);
      if (
        typeof value.idempotencyKey !== "string" ||
        !/^[-a-zA-Z0-9]{16,100}$/.test(value.idempotencyKey)
      )
        fail(400, "invalid_key", "Provide a unique booking submission key.");
      db.exec("BEGIN IMMEDIATE");
      try {
        const hash = digest(value);
        const previous = db
          .prepare(
            "SELECT json,body_hash FROM booking_requests WHERE idempotency_key=?",
          )
          .get(value.idempotencyKey);
        if (previous) {
          if (previous.body_hash !== hash)
            fail(
              409,
              "duplicate_key",
              "This submission key already belongs to different terms.",
            );
          db.exec("COMMIT");
          send(res, 200, {
            request: JSON.parse(previous.json),
            replayed: true,
          });
          return true;
        }
        if (value.confirmed !== true)
          fail(
            400,
            "confirmation_required",
            "Review and confirm the commercial and transport responsibilities.",
          );
        if (typeof value.signature !== "string")
          fail(400, "quote_required", "Review the server quote before saving.");
        let q;
        try {
          q = quote(value);
        } catch (error) {
          if (error.status === 400)
            fail(
              409,
              "quote_changed",
              "The quote is no longer valid. Recalculate and review the latest lots and transport terms.",
            );
          throw error;
        }
        if (q.signature !== value.signature)
          fail(
            409,
            "quote_changed",
            "Material records or commercial terms changed. Recalculate and review the latest quote.",
          );
        if (!q.plan.viable && value.acknowledgeUneconomical !== true)
          fail(
            400,
            "uneconomical_acknowledgement",
            "Acknowledge that this request does not offer positive savings.",
          );
        const timestamp = new Date().toISOString();
        const request = {
          id: randomUUID(),
          status: "pending_agreement",
          createdAt: timestamp,
          requirements: structuredClone(value.requirements),
          plan: q.plan,
          policyVersion: q.policyVersion,
          acknowledgeUneconomical: value.acknowledgeUneconomical === true,
        };
        db.prepare(
          "INSERT INTO booking_requests (id,idempotency_key,body_hash,json) VALUES (?,?,?,?)",
        ).run(request.id, value.idempotencyKey, hash, JSON.stringify(request));
        db.exec("COMMIT");
        send(res, 201, { request });
        return true;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    const match = pathname.match(
      /^\/api\/booking-requests\/([a-zA-Z0-9-]+)(\/cancel)?$/,
    );
    if (
      match &&
      ((req.method === "GET" && !match[2]) ||
        (req.method === "POST" && match[2]))
    ) {
      const row = db
        .prepare("SELECT json FROM booking_requests WHERE id=?")
        .get(match[1]);
      if (!row) fail(404, "booking_not_found", "Booking request not found.");
      const request = JSON.parse(row.json);
      if (req.method === "POST") {
        const value = await body(req);
        if (value.confirmed !== true)
          fail(400, "confirmation_required", "Confirm cancellation.");
        if (request.status !== "cancelled") {
          request.status = "cancelled";
          request.cancelledAt = new Date().toISOString();
          db.prepare("UPDATE booking_requests SET json=? WHERE id=?").run(
            JSON.stringify(request),
            request.id,
          );
        }
      }
      send(res, 200, { request });
      return true;
    }
    return false;
  };
}
