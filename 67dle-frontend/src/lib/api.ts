import type { GameMode, LetterState } from './game.svelte.ts';

export interface StartResponse {
	sessionId: string;
	token: string;
	boardCount: number;
	maxGuesses: number;
}

export interface GuessResult {
	boardIndex: number;
	states: LetterState[];
	solved: boolean;
}

export interface GuessResponse {
	valid: boolean;
	results: GuessResult[];
	solvedCount: number;
	totalGuesses: number;
	gameOver: boolean;
}

export interface GameStateResponse {
	mode: GameMode;
	boardCount: number;
	maxGuesses: number;
	guesses: string[];
	boards: {
		boardIndex: number;
		guessResults: LetterState[][];
		solved: boolean;
	}[];
	solvedCount: number;
	totalGuesses: number;
	gameOver: boolean;
}

const DAILY_TOKEN_KEY = '67dle-daily-token';
const RANDOM_TOKEN_KEY = '67dle-random-token';

export function getStoredToken(mode: GameMode): string | null {
	const key = mode === 'daily' ? DAILY_TOKEN_KEY : RANDOM_TOKEN_KEY;
	return localStorage.getItem(key);
}

export function storeToken(mode: GameMode, token: string): void {
	const key = mode === 'daily' ? DAILY_TOKEN_KEY : RANDOM_TOKEN_KEY;
	localStorage.setItem(key, token);
}

export function clearToken(mode: GameMode): void {
	const key = mode === 'daily' ? DAILY_TOKEN_KEY : RANDOM_TOKEN_KEY;
	localStorage.removeItem(key);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init);
	const data = await response.json();
	if (!response.ok) {
		const error = new Error(data?.error ?? 'Request failed');
		(error as Error & { status?: number }).status = response.status;
		throw error;
	}
	return data as T;
}

export async function startGame(mode: GameMode): Promise<StartResponse> {
	return requestJson<StartResponse>('/api/game/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ mode }),
	});
}

export async function submitGuess(token: string, guess: string): Promise<GuessResponse> {
	return requestJson<GuessResponse>('/api/game/guess', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ guess }),
	});
}

export async function fetchState(token: string): Promise<GameStateResponse> {
	return requestJson<GameStateResponse>('/api/game/state', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
}
