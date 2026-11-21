import { test } from "node:test";
import assert from "node:assert/strict";
const { isEditableTarget, resolveExamShortcut } = await import(
  "../src/features/exam/shortcuts"
);

test("exam shortcuts map arrow keys, A-E, 1-5, and R cleanly", () => {
  assert.deepEqual(resolveExamShortcut({ key: "ArrowLeft" }), { type: "prev" });
  assert.deepEqual(resolveExamShortcut({ key: "ArrowRight" }), {
    type: "next",
  });
  assert.deepEqual(resolveExamShortcut({ key: "a" }), {
    type: "select",
    index: 0,
  });
  assert.deepEqual(resolveExamShortcut({ key: "E" }), {
    type: "select",
    index: 4,
  });
  assert.deepEqual(resolveExamShortcut({ key: "1" }), {
    type: "select",
    index: 0,
  });
  assert.deepEqual(resolveExamShortcut({ key: "5" }), {
    type: "select",
    index: 4,
  });
  assert.deepEqual(resolveExamShortcut({ key: "r" }), { type: "doubt" });
  assert.deepEqual(resolveExamShortcut({ key: "R" }), { type: "doubt" });
  assert.equal(resolveExamShortcut({ key: "Enter" }), null);
  assert.equal(resolveExamShortcut({ key: "6" }), null);
  assert.equal(resolveExamShortcut({ key: "a", repeat: true }), null);
});

test("exam shortcuts stay out of modifiers and editable fields while allowing radio focus", () => {
  assert.equal(resolveExamShortcut({ key: "a", ctrlKey: true }), null);
  assert.equal(resolveExamShortcut({ key: "r", metaKey: true }), null);
  assert.equal(resolveExamShortcut({ key: "ArrowLeft", altKey: true }), null);

  assert.equal(
    isEditableTarget({ tagName: "TEXTAREA" } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableTarget({ tagName: "SELECT" } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableTarget({
      tagName: "INPUT",
      type: "text",
    } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableTarget({
      tagName: "DIV",
      isContentEditable: true,
    } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableTarget({
      tagName: "INPUT",
      type: "radio",
    } as unknown as EventTarget),
    false,
  );
  assert.deepEqual(
    resolveExamShortcut({
      key: "ArrowRight",
      target: { tagName: "INPUT", type: "radio" } as unknown as EventTarget,
    }),
    { type: "next" },
  );
  assert.equal(
    resolveExamShortcut({
      key: "a",
      target: { tagName: "TEXTAREA" } as unknown as EventTarget,
    }),
    null,
  );
});
