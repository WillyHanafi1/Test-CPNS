export type ExamShortcutAction =
  | { type: "prev" }
  | { type: "next" }
  | { type: "select"; index: number }
  | { type: "doubt" };

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
  };
  if (el.isContentEditable) return true;
  const tag = (el.tagName || "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el.type || "text").toLowerCase();
    return type !== "radio" && type !== "checkbox";
  }
  return false;
}

const LETTERS = ["a", "b", "c", "d", "e"];
const DIGITS = ["1", "2", "3", "4", "5"];

export function resolveExamShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target?: EventTarget | null;
}): ExamShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditableTarget(event.target ?? null)) return null;

  if (event.key === "ArrowLeft") return { type: "prev" };
  if (event.key === "ArrowRight") return { type: "next" };
  if (event.repeat) return null;

  const lower = event.key.toLowerCase();
  if (lower === "r") return { type: "doubt" };

  const letterIdx = LETTERS.indexOf(lower);
  if (letterIdx >= 0) return { type: "select", index: letterIdx };

  const digitIdx = DIGITS.indexOf(event.key);
  if (digitIdx >= 0) return { type: "select", index: digitIdx };

  return null;
}
