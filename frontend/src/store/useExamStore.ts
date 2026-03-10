import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Option = {
  id: string;
  label: string;
  content: string;
  score: number;
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
  answers: Record<string, string>; // questionId -> optionId
  doubtStatus: Record<string, boolean>; // questionId -> isDoubt
  currentIndex: number;
  timeLeft: number; // in seconds
  isStarted: boolean;
  isFinished: boolean;

  // Actions
  startExam: (packageId: string, sessionId: string, questions: Question[], durationMinutes: number) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleDoubt: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  tick: () => void;
  finishExam: () => void;
  resetExam: () => void;
};

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      packageId: null,
      sessionId: null,
      questions: [],
      answers: {},
      doubtStatus: {},
      currentIndex: 0,
      timeLeft: 0,
      isStarted: false,
      isFinished: false,

      startExam: (packageId, sessionId, questions, durationMinutes) => 
        set({ 
          packageId, 
          sessionId, 
          questions: questions.sort((a, b) => a.number - b.number), 
          timeLeft: durationMinutes * 60,
          isStarted: true,
          isFinished: false,
          currentIndex: 0,
          answers: {},
          doubtStatus: {}
        }),

      selectOption: (questionId, optionId) => 
        set((state) => ({
          answers: { ...state.answers, [questionId]: optionId }
        })),

      toggleDoubt: (questionId) =>
        set((state) => ({
          doubtStatus: { ...state.doubtStatus, [questionId]: !state.doubtStatus[questionId] }
        })),

      setCurrentIndex: (index) => set({ currentIndex: index }),

      tick: () => set((state) => ({ 
        timeLeft: state.timeLeft > 0 ? state.timeLeft - 1 : 0,
        isFinished: state.timeLeft <= 1 ? true : state.isFinished
      })),

      finishExam: () => set({ isFinished: true, isStarted: false }),

      resetExam: () => set({ 
        packageId: null, 
        sessionId: null, 
        questions: [], 
        answers: {}, 
        doubtStatus: {}, 
        isStarted: false, 
        isFinished: false 
      }),
    }),
    {
      name: 'exam-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
