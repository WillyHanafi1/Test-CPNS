import test from "node:test";
import assert from "node:assert/strict";
const { DEMO_DONATIONS, DEMO_SCENARIOS, demoOverview, jakartaMonth } =
  await import("../src/lib/donation-demo");
const { validDonationOverview } = await import("../src/lib/donations");

test("the studio has exactly 20 unique synthetic transactions and valid API-shaped scenarios", () => {
  assert.equal(DEMO_DONATIONS.length, 20);
  assert.equal(new Set(DEMO_DONATIONS.map((row) => row.id)).size, 20);
  for (const scenario of DEMO_SCENARIOS)
    assert.equal(
      validDonationOverview(demoOverview(scenario.id)),
      true,
      scenario.id,
    );
});
test("monthly totals use Jakarta midnight at both month and year boundaries", () => {
  assert.equal(jakartaMonth("2026-10-31T16:59:00Z"), "2026-10");
  assert.equal(jakartaMonth("2026-10-31T17:00:00Z"), "2026-11");
  assert.equal(jakartaMonth("2025-12-31T16:59:00Z"), "2025-12");
  assert.equal(jakartaMonth("2025-12-31T17:00:00Z"), "2026-01");
  assert.equal(demoOverview("november").stats.total_amount, 211000);
  assert.equal(demoOverview("october").stats.total_amount, 190000);
  assert.equal(demoOverview("new-year").stats.total_amount, 2510000);
});
test("repeat donors aggregate by account and anonymous accounts participate separately", () => {
  const all = demoOverview();
  assert.equal(all.stats.donation_count, 20);
  assert.equal(all.stats.total_amount, 2946000);
  assert.equal(
    all.top_supporters.find((row) => row.full_name === "Alya Putri")
      ?.total_amount,
    45000,
  );
  assert.equal(
    all.top_supporters.find((row) => row.full_name === "Alya Putri")
      ?.donation_count,
    3,
  );
  assert.equal(
    all.top_supporters.some((row) => row.full_name === "Pendukung anonim"),
    false,
  );
  const anonymous = demoOverview("anonymous");
  assert.equal(anonymous.stats.total_amount, 35000);
  assert.equal(anonymous.stats.supporter_count, 3);
  assert.equal(anonymous.top_supporters.length, 3);
  assert.equal(
    anonymous.top_supporters.every(
      (row) => row.full_name === "Anonim" && row.is_anonymous === true,
    ),
    true,
  );
  assert.deepEqual(
    anonymous.top_supporters.map((row) => row.total_amount),
    [25000, 5000, 5000],
  );
  assert.equal(
    anonymous.recent_supporters.every(
      (row) => row.full_name === "Pendukung anonim",
    ),
    true,
  );
});

test("an anonymous contribution can lead without linking its public identity or message", () => {
  const original = DEMO_DONATIONS.find((row) => row.supporter_id === "alya")!;
  const data = demoOverview("november", [
    {
      ...original,
      id: "anon-top",
      amount: 200000,
      is_anonymous: true,
      message: "Pesan anonim terpisah",
      paid_at: "2026-11-18T12:00:00+07:00",
    },
  ]);
  assert.equal(data.top_supporters[0].full_name, "Anonim");
  assert.equal(data.top_supporters[0].message, "Pesan anonim terpisah");
  assert.equal(data.top_supporters[0].total_amount, 200000);
  assert.equal(
    data.top_supporters.find((row) => row.full_name === "Alya Putri")
      ?.total_amount,
    45000,
  );
  assert.equal(
    data.top_supporters.find((row) => row.full_name === "Alya Putri")?.message,
    original.message,
  );
});
test("new months reset totals without deleting history and exceeded goals keep their actual percentage", () => {
  const empty = demoOverview("new-month");
  assert.equal(empty.stats.total_amount, 0);
  assert.equal(empty.stats.percentage, 0);
  assert.deepEqual(empty.recent_supporters, []);
  assert.equal(demoOverview("all").stats.donation_count, 20);
  assert.ok(demoOverview("exceeded").stats.percentage > 100);
});

test("equal totals share a rank and the latest empty donation does not erase an older message", () => {
  const all = demoOverview();
  const arif = all.top_supporters.find(
    (row) => row.full_name === "Arif Hidayat",
  )!;
  const rizky = all.top_supporters.find(
    (row) => row.full_name === "Rizky Pratama",
  )!;
  assert.equal(arif.rank, rizky.rank);
  const original = DEMO_DONATIONS.find((row) => row.supporter_id === "alya")!;
  const updated = demoOverview("november", [
    {
      ...original,
      id: "new-empty",
      amount: 1000,
      paid_at: "2026-11-18T12:00:00+07:00",
      created_at: "2026-11-18T12:00:00+07:00",
      message: null,
    },
  ]);
  assert.equal(
    updated.top_supporters.find((row) => row.full_name === "Alya Putri")
      ?.message,
    original.message,
  );
});
