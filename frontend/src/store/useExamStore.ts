import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Option = {
  id: string;
  label: string;
  content: string;
  image_url?: string;
  // NOTE: score field is intentionally absent here.
  // The backend's public API (OptionPublic schema) never exposes score.
};

export type Question = {
  id: string;
  content: string;
  image_url?: string;
  segment: string;
  number: number;
  options: Option[];
};

export type ExamState = {
  packageId: string | null;
  sessionId: string | null;
  questions: Question[];
  answers: Record<string, string>;   // questionId → optionId
  doubtStatus: Record<string, boolean>;
  currentIndex: number;
  timeLeft: number;    // in seconds (remaining, updated by tick())
  serverEndTime: string | null; // ISO string from server
  serverTimeOffset: number;     // offset between server time and local Date.now()
  isStarted: boolean;
  isFinished: boolean;

  // Actions
  startExam: (packageId: string, sessionId: string, questions: Question[], durationMinutes: number, serverEndTimeISO?: string) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleDoubt: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  tick: () => void;
  finishExam: () => void;
  resetExam: () => void;
};

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      packageId: null,
      sessionId: null,
      questions: [],
      answers: {},
      doubtStatus: {},
      currentIndex: 0,
      timeLeft: 0,
      serverEndTime: null,
      serverTimeOffset: 0,
      isStarted: false,
      isFinished: false,

      startExam: (packageId, sessionId, questions, durationMinutes, serverEndTimeISO) => {
        const state = get();
        // A session is only considered "the same" if both packageId and sessionId match perfectly
        const isSameSession = state.packageId === packageId && state.sessionId === sessionId && state.isStarted;

        // Calculate offset: ServerTime - LocalTime
        // This offset is used to sync the client timer with the server's absolute end_time
        const currentOffset = serverEndTimeISO
          ? new Date(serverEndTimeISO).getTime() - (durationMinutes * 60 * 1000) - Date.now()
          : state.serverTimeOffset;

        const realNow = Date.now() + currentOffset;

        let timeLeft: number;
        if (isSameSession && state.serverEndTime) {
          const endMs = new Date(state.serverEndTime).getTime();
          timeLeft = Math.max(0, Math.floor((endMs - realNow) / 1000));
        } else if (serverEndTimeISO) {
          const endMs = new Date(serverEndTimeISO).getTime();
          timeLeft = Math.max(0, Math.floor((endMs - realNow) / 1000));
        } else {
          timeLeft = durationMinutes * 60;
        }

        // If not the same session, we MUST reset answers and doubt status
        // to prevent leaking data from a previous attempt/package.
        set({
          packageId,
          sessionId,
          questions: [...questions].sort((a, b) => a.number - b.number),
          timeLeft,
          serverEndTime: serverEndTimeISO ?? state.serverEndTime,
          serverTimeOffset: currentOffset,
          isStarted: true,
          isFinished: timeLeft <= 0, // Mark finished immediately if time is up
          currentIndex: isSameSession ? state.currentIndex : 0,
          answers: isSameSession ? state.answers : {},
          doubtStatus: isSameSession ? state.doubtStatus : {},
        });
      },


      selectOption: (questionId, optionId) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: optionId }
        })),

      toggleDoubt: (questionId) =>
        set((state) => ({
          doubtStatus: { ...state.doubtStatus, [questionId]: !state.doubtStatus[questionId] }
        })),

      setCurrentIndex: (index) => set({ currentIndex: index }),

      tick: () => set((state) => {
        // Server-side enforcement using offset time
        if (state.serverEndTime) {
          const endMs = new Date(state.serverEndTime).getTime();
          const realNow = Date.now() + state.serverTimeOffset;
          if (realNow >= endMs) {
            return { timeLeft: 0, isFinished: true };
          }
          // Constantly recalculate to avoid F5 desync
          const newTimeLeft = Math.max(0, Math.floor((endMs - realNow) / 1000));
          return { timeLeft: newTimeLeft };
        }
        const newTimeLeft = state.timeLeft > 0 ? state.timeLeft - 1 : 0;
        return {
          timeLeft: newTimeLeft,
          isFinished: newTimeLeft <= 0 ? true : state.isFinished,
        };
      }),

      finishExam: () => set({ isFinished: true, isStarted: false }),

      resetExam: () => set({
        packageId: null,
        sessionId: null,
        questions: [],
        answers: {},
        doubtStatus: {},
        currentIndex: 0,
        timeLeft: 0,
        isStarted: false,
        isFinished: false,
        serverEndTime: null,
        serverTimeOffset: 0,
      }),
    }),
    {
      name: 'exam-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
