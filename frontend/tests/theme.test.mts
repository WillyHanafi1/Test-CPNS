import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
const { themeBootstrap } = await import("../src/lib/theme");

function firstPaint(
  preference: string | null,
  systemDark: boolean,
  storageBlocked = false,
) {
  const document = {
    documentElement: {
      dataset: {} as Record<string, string>,
      style: {} as Record<string, string>,
    },
  };
  vm.runInNewContext(themeBootstrap, {
    document,
    localStorage: {
      getItem: () => {
        if (storageBlocked) throw new Error("Storage blocked");
        return preference;
      },
    },
    matchMedia: () => ({ matches: systemDark }),
  });
  return document.documentElement;
}

test("explicit light preference wins over dark system before first paint", () => {
  const root = firstPaint("light", true);
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
});
test("explicit dark preference survives a reload on a light device", () => {
  const root = firstPaint("dark", false);
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");
});
test("system or unsupported stored preferences follow the device safely", () => {
  for (const preference of [null, "system", "unsupported"]) {
    assert.equal(firstPaint(preference, true).dataset.theme, "dark");
    assert.equal(firstPaint(preference, false).dataset.theme, "light");
  }
});
test("blocked local storage still produces a readable first paint", () => {
  assert.equal(firstPaint(null, true, true).dataset.theme, "dark");
  assert.equal(firstPaint(null, false, true).dataset.theme, "light");
});
