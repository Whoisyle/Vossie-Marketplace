export type JevQuestionType = 'choice' | 'noul' | 'score';

export interface JevChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export interface JevNoulQuestion {
  type: 'noul';
  instructions: string;
}

export interface JevScoreQuestion {
  type: 'score';
  instructions: string;
  criteria?: Record<string, string>;
}

export type JevQuestion = JevChoiceQuestion | JevNoulQuestion | JevScoreQuestion;

export interface JevSystemOneRequest {
  model: string;
  state: string | Record<string, unknown>;
  questions: Record<string, JevQuestion>;
}

export interface JevChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities?: Record<string, number>;
  confidence?: number;
}

export interface JevNoulAnswer {
  type: 'noul';
  noul: number;
}

export interface JevScoreAnswer {
  type: 'score';
  score: number;
  confidence?: number;
  distribution?: Record<string, number>;
}

export type JevAnswer = JevChoiceAnswer | JevNoulAnswer | JevScoreAnswer;

export type JevSystemOneResponse = Record<string, JevAnswer>;

export interface JevModelInfo {
  id: string;
  name: string;
  description: string;
  capabilities: ('choice' | 'noul' | 'score')[];
  defaultFor: string[];
}
