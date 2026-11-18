import test from "node:test";
import assert from "node:assert/strict";
const {
  donationAmount,
  donationLoginHref,
  dokuCheckoutUrl,
  supporterName,
  validDonationOverview,
} = await import("../src/lib/donations");
const { loginDestination } = await import("../src/lib/api");

test("money input accepts whole rupiah and Indonesian thousands without silently changing invalid amounts", () => {
  for (const input of ["5000", "5.000", " 5000 "])
    assert.equal(donationAmount(input), 5000);
  for (const input of [
    "",
    "999",
    "-5000",
    "5000.5",
    "5,000",
    "5e3",
    "Rp5000",
    "2147483648",
    "1000000000000",
  ])
    assert.equal(donationAmount(input), null);
});
test("public names are shortened and never fall back to an email address", () => {
  assert.equal(supporterName("Budi Santoso"), "Budi S.");
  assert.equal(supporterName("private@example.com"), "Pendukung TOCPNS");
  assert.equal(supporterName(), "Pendukung TOCPNS");
});
test("login preserves the donation amount for participants and admins without allowing external redirects", () => {
  const next = new URL(
    donationLoginHref(7500),
    "https://example.com",
  ).searchParams.get("next");
  assert.equal(next, "/donasi?amount=7500");
  assert.equal(loginDestination("admin", next), next);
  assert.equal(loginDestination("participant", next), next);
  assert.equal(loginDestination("admin", null), "/admin");
  assert.equal(loginDestination("admin", "//evil.example"), "/dashboard");
});
test("checkout navigation accepts exact HTTPS DOKU hosts only", () => {
  assert.equal(
    dokuCheckoutUrl("https://checkout.doku.com/pay"),
    "https://checkout.doku.com/pay",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://checkout.doku.com.evil.test/pay",
    "https://user:pass@checkout.doku.com/pay",
    "http://checkout.doku.com/pay",
    "https://checkout.doku.com:444/pay",
  ])
    assert.throws(() => dokuCheckoutUrl(url));
});
test("malformed public API data is displayed as an error rather than crashing the donation page", () => {
  for (const response of [
    null,
    {},
    { stats: {} },
    { period: "month", stats: { total_amount: NaN } },
  ])
    assert.equal(validDonationOverview(response), false);
});

test("public data validation accepts empty genuine results and rejects malformed list entries", () => {
  const data = {
    period: "month",
    period_label: "November 2026",
    stats: {
      total_amount: 0,
      target_amount: 0,
      percentage: 0,
      supporter_count: 0,
      donation_count: 0,
    },
    top_supporters: [],
    recent_supporters: [],
  };
  assert.equal(validDonationOverview(data), true);
  assert.equal(
    validDonationOverview({ ...data, top_supporters: [null] }),
    false,
  );
  assert.equal(
    validDonationOverview({ ...data, recent_supporters: [null] }),
    false,
  );
});
