import { test } from "node:test";
import assert from "node:assert/strict";
const { buildTrustMetrics, USER_COUNT_MIN_THRESHOLD } = await import(
  "../src/lib/home-stats"
);

test("trust metrics stay honest and withhold low user counts below threshold", () => {
  assert.equal(USER_COUNT_MIN_THRESHOLD, 100);

  const early = buildTrustMetrics({
    packages_count: 8,
    questions_count: 764,
    users_count: 16,
    completed_sessions_count: 70,
  });
  assert.deepEqual(
    early.map((m) => [m.id, m.value]),
    [
      ["questions", "764"],
      ["packages", "8"],
      ["sessions", "70"],
    ],
  );
});

test("trust metrics automatically include total users once threshold is met or overridden", () => {
  const grown = buildTrustMetrics({
    packages_count: 10,
    questions_count: 1100,
    users_count: 125,
    completed_sessions_count: 420,
  });
  assert.deepEqual(
    grown.map((m) => m.id),
    ["questions", "packages", "sessions", "users"],
  );

  const explicitZeroThreshold = buildTrustMetrics(
    {
      packages_count: 8,
      questions_count: 764,
      users_count: 16,
      completed_sessions_count: 70,
    },
    0,
  );
  assert.deepEqual(
    explicitZeroThreshold.map((m) => m.id),
    ["questions", "packages", "sessions", "users"],
  );

  assert.deepEqual(buildTrustMetrics(null), []);
});
