import { test } from "node:test";
import assert from "node:assert/strict";
const { api, ApiError, rememberPayment } = await import("../src/lib/api");

test("an HTTP 200 with an unreadable body is not an acknowledgement", async () => {
  globalThis.fetch = async () => new Response("broken-json", { status: 200 });
  await assert.rejects(() => api("/exam/autosave/synthetic"),
    (error: unknown) => error instanceof ApiError && error.code === "invalid_response");
});

test("a network error has a recoverable, user-facing response", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(() => api("/membership/offer"),
    (error: unknown) => error instanceof ApiError && error.code === "network_unavailable" && error.status === 0);
});

test("caller cancellation remains cancellation rather than a connection error", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.signal?.aborted, true);
    throw new DOMException("Aborted", "AbortError");
  };
  await assert.rejects(() => api("/membership/offer", { signal: controller.signal }), { name: "AbortError" });
});

test("blocked browser storage does not prevent payment navigation", () => {
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true,
    value: { setItem() { throw new Error("storage blocked"); } } });
  assert.doesNotThrow(() => rememberPayment("synthetic-order", "synthetic-user"));
});
