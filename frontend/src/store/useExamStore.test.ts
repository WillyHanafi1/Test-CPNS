import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useExamStore, type Question } from './useExamStore';

const mockQuestions: Question[] = [
  {
    id: 'q1',
    content: 'Apa nama lambang negara Indonesia?',
    segment: 'TWK',
    number: 1,
    options: [
      { id: 'o1_1', label: 'A', content: 'Garuda Pancasila' },
      { id: 'o1_2', label: 'B', content: 'Merah Putih' }
    ]
  },
  {
    id: 'q2',
    content: '1 + 1 = ...',
    segment: 'TIU',
    number: 2,
    options: [
      { id: 'o2_1', label: 'A', content: '2' },
      { id: 'o2_2', label: 'B', content: '3' }
    ]
  }
];

function initializeExam(durationMinutes = 90) {
  useExamStore.getState().initialize('owner-123', {
    session_id: 'sess-456',
    package: { id: 'pkg-123', title: 'Test', questions: [...mockQuestions].reverse() },
    server_now: new Date().toISOString(),
    end_time: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
    status: 'ongoing',
    writer_epoch: 1,
    writer_id: 'writer-123',
    answers: {},
    revisions: {},
  });
}

describe('useExamStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T00:00:00Z'));
    // Reset the store state before each test run
    useExamStore.getState().resetExam();
  });
  afterEach(() => vi.useRealTimers());

  it('should initialize with default empty/null state', () => {
    const state = useExamStore.getState();
    expect(state.packageId).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.questions).toEqual([]);
    expect(state.answers).toEqual({});
    expect(state.doubtStatus).toEqual({});
    expect(state.currentIndex).toBe(0);
    expect(state.timeLeft).toBe(0);
    expect(state.isStarted).toBe(false);
    expect(state.isFinished).toBe(false);
  });

  it('should start exam and populate questions, duration and offset', () => {
    const durationMinutes = 90;
    initializeExam(durationMinutes);

    const state = useExamStore.getState();
    expect(state.packageId).toBe('pkg-123');
    expect(state.sessionId).toBe('sess-456');
    expect(state.questions.length).toBe(2);
    expect(state.questions[0].id).toBe('q1'); // Sorted by number
    expect(state.timeLeft).toBe(durationMinutes * 60);
    expect(state.isStarted).toBe(true);
    expect(state.isFinished).toBe(false);
  });

  it('should correctly select an option for a question', () => {
    initializeExam();
    
    // Select option B (o1_2) for question q1
    useExamStore.getState().selectOption('q1', 'o1_2');
    
    const state = useExamStore.getState();
    expect(state.answers['q1']).toBe('o1_2');
  });

  it('should correctly toggle doubt status for a question', () => {
    initializeExam();
    
    // Toggle doubt on q1
    useExamStore.getState().toggleDoubt('q1');
    expect(useExamStore.getState().doubtStatus['q1']).toBe(true);

    // Toggle doubt off q1
    useExamStore.getState().toggleDoubt('q1');
    expect(useExamStore.getState().doubtStatus['q1']).toBe(false);
  });

  it('should change current index correctly', () => {
    initializeExam();
    
    useExamStore.getState().setCurrentIndex(1);
    expect(useExamStore.getState().currentIndex).toBe(1);
  });

  it('should decrease timeLeft on tick', () => {
    initializeExam();
    const initialTimeLeft = useExamStore.getState().timeLeft;

    vi.advanceTimersByTime(1000);
    useExamStore.getState().tick();
    expect(useExamStore.getState().timeLeft).toBe(initialTimeLeft - 1);
  });

  it('should auto-finish when timeLeft reaches 0 on tick', () => {
    // Start with 1 second remaining
    initializeExam(1 / 60);
    expect(useExamStore.getState().timeLeft).toBe(1);
    expect(useExamStore.getState().isFinished).toBe(false);

    // Tick once to reach 0
    vi.advanceTimersByTime(1000);
    useExamStore.getState().tick();
    expect(useExamStore.getState().timeLeft).toBe(0);
    expect(useExamStore.getState().isFinished).toBe(true);
  });

  it('should correctly finish and reset the exam', () => {
    initializeExam();
    useExamStore.getState().finishExam();
    
    expect(useExamStore.getState().isFinished).toBe(true);

    useExamStore.getState().resetExam();
    expect(useExamStore.getState().packageId).toBeNull();
    expect(useExamStore.getState().isStarted).toBe(false);
    expect(useExamStore.getState().isFinished).toBe(false);
  });
});
