import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const storage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) || null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
  };
};
Object.defineProperty(globalThis, "localStorage", {
  value: storage(),
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: storage(),
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  configurable: true,
});
if (!globalThis.crypto)
  Object.defineProperty(globalThis, "crypto", { value: { randomUUID } });
const { useExamStore, flushAnswers, writerId } = await import(
  "../src/store/useExamStore"
);
const attempt = (now = Date.now()) => ({
  session_id: "session",
  package: {
    id: "package",
    title: "Test",
    questions: [
      {
        id: "question",
        number: 1,
        content: "Test",
        segment: "TWK",
        options: [
          { id: "A", label: "A", content: "A" },
          { id: "B", label: "B", content: "B" },
        ],
      },
    ],
  },
  server_now: new Date(now).toISOString(),
  end_time: new Date(now + 20 * 60000).toISOString(),
  status: "ongoing",
  writer_epoch: 1,
  writer_id: writerId(),
  answers: {},
  revisions: {},
});
beforeEach(() => {
  useExamStore.getState().resetExam();
  useExamStore.getState().initialize("owner", attempt());
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    configurable: true,
  });
});

test("resume uses actual remaining time rather than the original full duration", () => {
  assert.equal(useExamStore.getState().timeLeft, 1200);
});
test("failed network keeps the local answer pending until an acknowledged retry", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("offline");
  };
  useExamStore.getState().selectOption("question", "A");
  await flushAnswers();
  assert.equal(Object.keys(useExamStore.getState().pending).length, 1);
  assert.ok(useExamStore.getState().saveError);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ revision: 1 }), { status: 200 });
  await flushAnswers();
  assert.deepEqual(useExamStore.getState().pending, {});
  assert.equal(useExamStore.getState().answers.question, "A");
});
test("a newer choice survives an older request in flight and uses its next revision", async () => {
  let release!: (response: Response) => void;
  const first = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const writes: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, options) => {
    writes.push(JSON.parse(options?.body as string));
    return writes.length === 1
      ? first
      : new Response(JSON.stringify({ revision: 2 }), { status: 200 });
  };
  useExamStore.getState().selectOption("question", "A");
  const flushing = flushAnswers();
  useExamStore.getState().selectOption("question", "B");
  release(new Response(JSON.stringify({ revision: 1 }), { status: 200 }));
  await flushing;
  assert.equal(writes.length, 2);
  assert.equal(writes[1].option_id, "B");
  assert.equal(writes[1].expected_revision, 1);
  assert.equal(useExamStore.getState().answers.question, "B");
  assert.deepEqual(useExamStore.getState().pending, {});
});
test("server reload preserves pending local choices for the same owner and session", () => {
  useExamStore.getState().selectOption("question", "B");
  useExamStore.getState().initialize("owner", {
    ...attempt(),
    answers: { question: "A" },
    revisions: { question: 1 },
  });
  assert.equal(useExamStore.getState().answers.question, "B");
  assert.equal(useExamStore.getState().revisions.question, 1);
});
test("changing accounts never restores the previous account answers", () => {
  useExamStore.getState().selectOption("question", "A");
  useExamStore.getState().initialize("other-owner", attempt());
  assert.deepEqual(useExamStore.getState().answers, {});
  assert.deepEqual(useExamStore.getState().pending, {});
});
test("HTTP failure is not an acknowledgement", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "Waktu habis." }), { status: 403 });
  useExamStore.getState().selectOption("question", "A");
  await flushAnswers();
  assert.equal(Object.keys(useExamStore.getState().pending).length, 1);
  assert.equal(useExamStore.getState().saveError, "Waktu habis.");
});

test("expired login pauses retries and keeps pending answers until reauthentication", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ detail: "Masuk kembali." }), {
      status: 401,
    });
  };
  useExamStore.getState().selectOption("question", "A");
  await flushAnswers();
  await flushAnswers();
  assert.equal(calls, 1);
  assert.equal(useExamStore.getState().saveAuthRequired, true);
  assert.equal(Object.keys(useExamStore.getState().pending).length, 1);
  useExamStore.getState().initialize("owner", attempt());
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ revision: 1 }), { status: 200 });
  await flushAnswers();
  assert.deepEqual(useExamStore.getState().pending, {});
});
