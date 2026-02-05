import type {
	BoardStateResponse,
	GameMode,
	GameStateResponse,
	GuessResult,
	LetterState,
	SessionState,
} from './types';

export const BOARD_COUNT = 67;
export const MAX_GUESSES = 73;

export function getDailySeed(date = new Date()): number {
	return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export function secondsUntilMidnightUtc(date = new Date()): number {
	const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
	return Math.max(1, Math.floor((next.getTime() - date.getTime()) / 1000));
}

export function getSessionTtlSeconds(mode: GameMode): number {
	return mode === 'daily' ? 48 * 60 * 60 : 24 * 60 * 60;
}

export function getTokenFromAuthHeader(authHeader?: string | null): string | null {
	if (!authHeader) return null;
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	return match ? match[1] : null;
}

export function isGuessFormatValid(guess: string): boolean {
	return /^[a-z]{5}$/.test(guess);
}

export async function isValidWord(db: D1Database, guess: string): Promise<boolean> {
	const row = await db.prepare('SELECT 1 as ok FROM words WHERE word = ? LIMIT 1').bind(guess).first<{ ok: number }>();
	return Boolean(row?.ok);
}

export function createSession(mode: GameMode, seed: number, targets: string[]): SessionState {
	return {
		sessionId: crypto.randomUUID(),
		token: crypto.randomUUID(),
		mode,
		seed,
		targets,
		guesses: [],
		solved: Array(targets.length).fill(false),
		solvedCount: 0,
		createdAt: Date.now(),
		gameOver: false,
	};
}

export async function getSession(kv: KVNamespace, key: string): Promise<SessionState | null> {
	const stored = await kv.get(key, 'json');
	return stored as SessionState | null;
}

export async function createTargets(db: D1Database, seed: number, count: number): Promise<string[]> {
	const totalRow = await db.prepare('SELECT COUNT(*) as count FROM words').first<{ count: number | string }>();
	const total = Number(totalRow?.count ?? 0);
	if (!total || total < count) {
		throw new Error('Word list is empty or too small');
	}

	const ids = pickUniqueIds(seed, count, total);
	const words = await getWordsByIds(db, ids);
	if (words.length !== count) {
		throw new Error('Could not load enough words');
	}
	return words;
}

export function recordGuess(session: SessionState, guess: string): GuessResult[] {
	if (session.gameOver) return [];
	const results: GuessResult[] = [];

	for (let i = 0; i < session.targets.length; i++) {
		if (session.solved[i]) continue;
		const target = session.targets[i];
		const states = evaluateGuess(guess, target);
		const solved = guess === target;
		if (solved) {
			session.solved[i] = true;
			session.solvedCount += 1;
		}
		results.push({ boardIndex: i, states, solved });
	}

	session.guesses.push(guess);
	const outOfGuesses = session.guesses.length >= MAX_GUESSES;
	const allSolved = session.solvedCount >= session.targets.length;
	if (outOfGuesses || allSolved) {
		session.gameOver = true;
	}

	return results;
}

export function buildGameState(session: SessionState): GameStateResponse {
	const boards: BoardStateResponse[] = session.targets.map((target, index) => {
		const guessResults: LetterState[][] = [];
		let solved = false;

		for (const guess of session.guesses) {
			if (solved) break;
			const states = evaluateGuess(guess, target);
			guessResults.push(states);
			if (guess === target) {
				solved = true;
			}
		}

		return {
			boardIndex: index,
			guessResults,
			solved,
		};
	});

	const solvedCount = boards.filter((board) => board.solved).length;
	const totalGuesses = session.guesses.length;
	const gameOver = solvedCount === session.targets.length || totalGuesses >= MAX_GUESSES;

	return {
		mode: session.mode,
		boardCount: session.targets.length,
		maxGuesses: MAX_GUESSES,
		guesses: session.guesses,
		boards,
		solvedCount,
		totalGuesses,
		gameOver,
	};
}

export function evaluateGuess(guess: string, target: string): LetterState[] {
	const result: LetterState[] = Array(5).fill('absent');
	const targetChars = target.split('');
	const guessChars = guess.split('');
	const used = Array(5).fill(false);

	for (let i = 0; i < 5; i++) {
		if (guessChars[i] === targetChars[i]) {
			result[i] = 'correct';
			used[i] = true;
		}
	}

	for (let i = 0; i < 5; i++) {
		if (result[i] === 'correct') continue;
		for (let j = 0; j < 5; j++) {
			if (!used[j] && guessChars[i] === targetChars[j]) {
				result[i] = 'present';
				used[j] = true;
				break;
			}
		}
	}

	return result;
}

function seededRandom(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

function pickUniqueIds(seed: number, count: number, max: number): number[] {
	const rand = seededRandom(seed);
	const picked = new Set<number>();
	while (picked.size < count) {
		const id = Math.floor(rand() * max) + 1;
		picked.add(id);
	}
	return Array.from(picked);
}

async function getWordsByIds(db: D1Database, ids: number[]): Promise<string[]> {
	const placeholders = ids.map(() => '?').join(', ');
	const statement = db.prepare(`SELECT id, word FROM words WHERE id IN (${placeholders})`);
	const rows = await statement.bind(...ids).all<{ id: number; word: string }>();
	const map = new Map<number, string>();
	for (const row of rows.results) {
		map.set(row.id, row.word);
	}
	return ids.map((id) => map.get(id)).filter((word): word is string => Boolean(word));
}
