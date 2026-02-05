export type GameMode = 'daily' | 'random';

export type LetterState = 'absent' | 'present' | 'correct';

export interface GuessResult {
	boardIndex: number;
	states: LetterState[];
	solved: boolean;
}

export interface SessionState {
	sessionId: string;
	token: string;
	mode: GameMode;
	seed: number;
	targets: string[];
	guesses: string[];
	solved: boolean[];
	solvedCount: number;
	createdAt: number;
	gameOver: boolean;
}

export interface BoardStateResponse {
	boardIndex: number;
	guessResults: LetterState[][];
	solved: boolean;
}

export interface GameStateResponse {
	mode: GameMode;
	boardCount: number;
	maxGuesses: number;
	guesses: string[];
	boards: BoardStateResponse[];
	solvedCount: number;
	totalGuesses: number;
	gameOver: boolean;
}
