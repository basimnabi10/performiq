export interface QuizOptionRecord {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestionRecord {
  id: string;
  text: string;
  order: number;
  options: QuizOptionRecord[];
}

export interface LearnerSafeOption {
  id: string;
  text: string;
  order: number;
}

export interface LearnerSafeQuestion {
  id: string;
  text: string;
  order: number;
  options: LearnerSafeOption[];
}

/**
 * Strips `isCorrect` from every option. MUST be applied to any quiz payload
 * served to a learner before they've submitted an attempt — the mock design
 * showed correct answers up front, which a real product must never do.
 */
export function toLearnerSafeQuiz(questions: QuizQuestionRecord[]): LearnerSafeQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    order: q.order,
    options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
  }));
}

export interface QuizAttemptAnswer {
  questionId: string;
  selectedOptionId: string;
}

/**
 * Grades a submitted attempt against the DB-held `isCorrect` values only —
 * never trust a client-submitted correctness flag. Returns a 0-100 score.
 */
export function gradeQuizAttempt(
  questions: QuizQuestionRecord[],
  answers: QuizAttemptAnswer[],
): { score: number; correctCount: number; total: number } {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));
  let correctCount = 0;

  for (const question of questions) {
    const selected = answerByQuestion.get(question.id);
    const correctOption = question.options.find((o) => o.isCorrect);
    if (selected && correctOption && selected === correctOption.id) {
      correctCount += 1;
    }
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return { score, correctCount, total };
}
