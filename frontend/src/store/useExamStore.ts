import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";

export type Option = {
  id: string;
  label: string;
  content: string;
  image_url?: string;
};
export type Question = {
  id: string;
  content: string;
  image_url?: string;
  segment: string;
  number: number;
  options: Option[];
};
type Pending = { optionId: string; mutationId: string };
export interface Attempt {
  session_id: string;
  package: { id: string; title: string; questions: Question[] };
  server_now: string;
  end_time: string;
  status: string;
  writer_epoch: number;
  writer_id: string | null;
  answers: Record<string, string>;
  revisions: Record<string, number>;
}
export type ExamState = {
  ownerId: string | null;
  packageId: string | null;
  sessionId: string | null;
  title: string;
  questions: Question[];
  answers: Record<string, string>;
  pending: Record<string, Pending>;
  revisions: Record<string, number>;
  doubtStatus: Record<string, boolean>;
  currentIndex: number;
  timeLeft: number;
  serverEndTime: string | null;
  serverTimeOffset: number;
  isStarted: boolean;
  isFinished: boolean;
  writerEpoch: number;
  writerId: string | null;
  saveError: string;
  saveAuthRequired: boolean;
  initialize: (ownerId: string, data: Attempt) => void;
  startExam: (
    packageId: string,
    sessionId: string,
    questions: Question[],
    duration: number,
    end?: string,
  ) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleDoubt: (id: string) => void;
  setCurrentIndex: (index: number) => void;
  tick: () => void;
  finishExam: () => void;
  resetExam: () => void;
};
const initial = {
  ownerId: null,
  packageId: null,
  sessionId: null,
  title: "",
  questions: [],
  answers: {},
  pending: {},
  revisions: {},
  doubtStatus: {},
  currentIndex: 0,
  timeLeft: 0,
  serverEndTime: null,
  serverTimeOffset: 0,
  isStarted: false,
  isFinished: false,
  writerEpoch: 1,
  writerId: null,
  saveError: "",
  saveAuthRequired: false,
};
export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      ...initial,
      initialize: (ownerId, data) => {
        const previous = get();
        const same =
          previous.ownerId === ownerId &&
          previous.sessionId === data.session_id;
        const pending = same ? previous.pending : {};
        const offset = new Date(data.server_now).getTime() - Date.now();
        const remaining = Math.max(
          0,
          Math.floor(
            (new Date(data.end_time).getTime() - (Date.now() + offset)) / 1000,
          ),
        );
        set({
          ...initial,
          ownerId,
          packageId: data.package.id,
          sessionId: data.session_id,
          title: data.package.title,
          questions: [...data.package.questions].sort(
            (a, b) => a.number - b.number,
          ),
          answers: {
            ...data.answers,
            ...Object.fromEntries(
              Object.entries(pending).map(([id, m]) => [id, m.optionId]),
            ),
          },
          revisions: data.revisions,
          pending,
          doubtStatus: same ? previous.doubtStatus : {},
          currentIndex: same
            ? Math.min(previous.currentIndex, data.package.questions.length - 1)
            : 0,
          serverEndTime: data.end_time,
          serverTimeOffset: offset,
          timeLeft: remaining,
          isStarted: data.status === "ongoing",
          isFinished: data.status !== "ongoing" || remaining === 0,
          writerEpoch: data.writer_epoch,
          writerId: data.writer_id,
        });
      },
      startExam: (packageId, sessionId, questions, duration, end) =>
        set({
          packageId,
          sessionId,
          questions,
          isStarted: true,
          serverEndTime:
            end || new Date(Date.now() + duration * 60000).toISOString(),
          serverTimeOffset: 0,
          isFinished: false,
        }),
      selectOption: (id, optionId) =>
        set((state) => ({
          answers: { ...state.answers, [id]: optionId },
          pending: {
            ...state.pending,
            [id]: { optionId, mutationId: crypto.randomUUID() },
          },
          saveError: "",
        })),
      toggleDoubt: (id) =>
        set((s) => ({
          doubtStatus: { ...s.doubtStatus, [id]: !s.doubtStatus[id] },
        })),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      tick: () =>
        set((s) => {
          const remaining = s.serverEndTime
            ? Math.max(
                0,
                Math.floor(
                  (new Date(s.serverEndTime).getTime() -
                    Date.now() -
                    s.serverTimeOffset) /
                    1000,
                ),
              )
            : 0;
          return { timeLeft: remaining, isFinished: remaining <= 0 };
        }),
      finishExam: () => set({ isFinished: true }),
      resetExam: () => set({ ...initial }),
    }),
    {
      name: "tocpns-exam-v2",
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(`${name}:${writerId()}`);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const key = `${name}:${writerId()}`;
            if (localStorage.getItem(key) !== value)
              localStorage.setItem(key, value);
          } catch {
            if (typeof window !== "undefined")
              window.dispatchEvent(new Event("exam-storage-unavailable"));
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(`${name}:${writerId()}`);
          } catch {
            /* Online saving remains available. */
          }
        },
      })),
      partialize: (s) => ({
        ownerId: s.ownerId,
        packageId: s.packageId,
        sessionId: s.sessionId,
        answers: s.answers,
        pending: s.pending,
        revisions: s.revisions,
        doubtStatus: s.doubtStatus,
        currentIndex: s.currentIndex,
      }),
    },
  ),
);

let flushing: Promise<void> | null = null;
let memoryWriter: string | undefined;
export function writerId() {
  try {
    let id = sessionStorage.getItem("exam_writer");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("exam_writer", id);
    }
    return id;
  } catch {
    memoryWriter ||= crypto.randomUUID();
    return memoryWriter;
  }
}
export function flushAnswers(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const original = useExamStore.getState();
    const session = original.sessionId;
    if (!session || !navigator.onLine) return;
    // One request in flight; newer selections remain pending until the preceding ACK.
    let iterations = 0;
    while (iterations++ < 250) {
      const state = useExamStore.getState();
      if (state.sessionId !== session) return;
      if (
        state.saveAuthRequired ||
        (state.writerId && state.writerId !== writerId())
      )
        return;
      const next = Object.entries(state.pending)[0];
      if (!next) return;
      const [questionId, mutation] = next;
      try {
        const result = await api<{ revision?: number }>(
          `/exam/autosave/${session}`,
          {
            method: "POST",
            body: JSON.stringify({
              question_id: questionId,
              option_id: mutation.optionId,
              mutation_id: mutation.mutationId,
              expected_revision: state.revisions[questionId] || 0,
              writer_epoch: state.writerEpoch,
              writer_id: writerId(),
            }),
          },
        );
        useExamStore.setState((current) => {
          if (current.sessionId !== session) return {};
          const pending = { ...current.pending };
          if (pending[questionId]?.mutationId === mutation.mutationId)
            delete pending[questionId];
          return {
            pending,
            revisions: {
              ...current.revisions,
              [questionId]:
                result.revision || (current.revisions[questionId] || 0) + 1,
            },
            saveError: "",
            saveAuthRequired: false,
          };
        });
      } catch (error) {
        if (useExamStore.getState().sessionId !== session) return;
        if (
          error instanceof ApiError &&
          ["revision_conflict", "writer_conflict"].includes(error.code)
        ) {
          try {
            const data = await api<Attempt>(`/exam/session/${session}/state`);
            useExamStore.setState({
              revisions: data.revisions,
              writerId: data.writer_id,
              writerEpoch: data.writer_epoch,
            });
          } catch {
            /* Keep local pending answers. */
          }
        }
        useExamStore.setState({
          saveAuthRequired: error instanceof ApiError && error.status === 401,
          saveError:
            error instanceof Error
              ? error.message
              : "Koneksi terputus. Jawaban belum terkirim.",
        });
        return;
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
