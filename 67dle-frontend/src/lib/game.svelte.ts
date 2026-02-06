import {
	clearToken,
	fetchState,
	getStoredToken,
	startGame,
	storeToken,
	submitGuess as submitGuessRequest,
} from './api';
import type { GuessResult } from './api';
import { isGuessFormatValid, normalizeGuess } from './words';

export type LetterState = 'empty' | 'tbd' | 'absent' | 'present' | 'correct';
export type GameMode = 'daily' | 'random';

export interface BoardState {
	boardIndex: number;
	guessResults: LetterState[][];
	solved: boolean;
	frozenGuesses?: string[];
}

const DEFAULT_BOARD_COUNT = 67;
const DEFAULT_MAX_GUESSES = 73;

const statePriority: Record<LetterState, number> = {
	empty: 0,
	tbd: 0,
	absent: 1,
	present: 2,
	correct: 3,
};

export function createGame(mode: GameMode) {
	let boards = $state<BoardState[]>([]);
	let guesses = $state<string[]>([]);
	let currentGuess = $state('');
	let solvedCount = $state(0);
	let totalGuesses = $state(0);
	let maxGuesses = $state(DEFAULT_MAX_GUESSES);
	let boardCount = $state(DEFAULT_BOARD_COUNT);
	let gameOver = $state(false);
	let shaking = $state(false);
	let checking = $state(false);
	let revealRow = $state(-1);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let token = $state<string | null>(null);

	let keyboardState = $state(new Map<string, LetterState>());
	let selectedBoardIndex = $state<number | null>(null);

	function buildKeyboardStateForBoard(board: BoardState, boardGuesses: string[]): Map<string, LetterState> {
		const states = new Map<string, LetterState>();
		for (let row = 0; row < board.guessResults.length; row++) {
			const guess = boardGuesses[row];
			const results = board.guessResults[row];
			if (!guess) continue;
			for (let i = 0; i < 5; i++) {
				const letter = guess[i];
				const nextState = results[i];
				if (!letter || !nextState) continue;
				const current = states.get(letter);
				if (!current || statePriority[nextState] > statePriority[current]) {
					states.set(letter, nextState);
				}
			}
		}
		return states;
	}

	let activeKeyboardState = $derived.by(() => {
		if (selectedBoardIndex !== null) {
			const board = boards.find(b => b.boardIndex === selectedBoardIndex);
			if (board) {
				return buildKeyboardStateForBoard(board, board.frozenGuesses ?? guesses);
			}
		}
		return keyboardState;
	});

	function selectBoard(index: number | null) {
		selectedBoardIndex = selectedBoardIndex === index ? null : index;
	}

	function buildKeyboardState(nextBoards: BoardState[], nextGuesses: string[]): Map<string, LetterState> {
		const states = new Map<string, LetterState>();
		for (const board of nextBoards) {
			for (let row = 0; row < board.guessResults.length; row++) {
				const guess = nextGuesses[row];
				const results = board.guessResults[row];
				if (!guess) continue;
				for (let i = 0; i < 5; i++) {
					const letter = guess[i];
					const nextState = results[i];
					if (!letter || !nextState) continue;
					const current = states.get(letter);
					if (!current || statePriority[nextState] > statePriority[current]) {
						states.set(letter, nextState);
					}
				}
			}
		}
		return states;
	}

	function applyKeyboardUpdate(guess: string, results: GuessResult[]) {
		const next = new Map(keyboardState);
		for (const result of results) {
			for (let i = 0; i < 5; i++) {
				const letter = guess[i];
				const nextState = result.states[i];
				if (!letter || !nextState) continue;
				const current = next.get(letter);
				if (!current || statePriority[nextState] > statePriority[current]) {
					next.set(letter, nextState);
				}
			}
		}
		keyboardState = next;
	}

	function applyState(state: Awaited<ReturnType<typeof fetchState>>) {
		const nextBoards = state.boards.map((board) => ({
			boardIndex: board.boardIndex,
			guessResults: board.guessResults,
			solved: board.solved,
			frozenGuesses: board.solved ? state.guesses.slice(0, board.guessResults.length) : undefined,
		}));
		boards = nextBoards;
		guesses = state.guesses;
		keyboardState = buildKeyboardState(nextBoards, state.guesses);
		boardCount = state.boardCount;
		maxGuesses = state.maxGuesses;
		solvedCount = state.solvedCount;
		totalGuesses = state.totalGuesses;
		gameOver = state.gameOver;
	}

	function ensureBoards(count: number) {
		const nextBoards = Array.from({ length: count }, (_, index) => ({
			boardIndex: index,
			guessResults: [],
			solved: false,
			frozenGuesses: undefined,
		}));
		boards = nextBoards;
		keyboardState = buildKeyboardState(nextBoards, guesses);
	}

	async function initialize() {
		loading = true;
		error = null;

		if (mode === 'daily') {
			const stored = getStoredToken(mode);
			if (stored) {
				token = stored;
				try {
					const state = await fetchState(stored);
					applyState(state);
					loading = false;
					return;
				} catch (err) {
					clearToken(mode);
					token = null;
				}
			}
		}

		try {
			const start = await startGame(mode);
			token = start.token;
			storeToken(mode, start.token);
			boardCount = start.boardCount;
			maxGuesses = start.maxGuesses;
			ensureBoards(start.boardCount);

			const state = await fetchState(start.token);
			applyState(state);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to start game';
			error = message;
		}

		loading = false;
	}

	function triggerShake() {
		shaking = true;
		setTimeout(() => {
			shaking = false;
		}, 500);
	}

	function addLetter(letter: string) {
		if (loading || gameOver || currentGuess.length >= 5) return;
		currentGuess = currentGuess + letter.toLowerCase();
	}

	function removeLetter() {
		if (loading || gameOver || currentGuess.length === 0) return;
		currentGuess = currentGuess.slice(0, -1);
	}

	async function submitGuess(): Promise<boolean> {
		if (loading || gameOver) return false;
		if (currentGuess.length !== 5) {
			triggerShake();
			return false;
		}

		const normalized = normalizeGuess(currentGuess);
		if (!isGuessFormatValid(normalized) || !token) {
			triggerShake();
			return false;
		}

		checking = true;
		try {
			const response = await submitGuessRequest(token, normalized);
			const nextGuesses = [...guesses, normalized];
			const newRowIndex = guesses.length;
			guesses = nextGuesses;
			solvedCount = response.solvedCount;
			totalGuesses = response.totalGuesses;
			gameOver = response.gameOver;
			currentGuess = '';
			applyKeyboardUpdate(normalized, response.results);

			const resultsByBoard = new Map(response.results.map((result) => [result.boardIndex, result]));
			boards = boards.map((board) => {
				const result = resultsByBoard.get(board.boardIndex);
				if (!result) return board;
				const frozenGuesses = result.solved
					? nextGuesses.slice(0, board.guessResults.length + 1)
					: board.frozenGuesses;
				return {
					...board,
					guessResults: [...board.guessResults, result.states],
					solved: board.solved || result.solved,
					frozenGuesses,
				};
			});

			// Trigger reveal animation on the newly added row
			revealRow = newRowIndex;
			checking = false;
			// Clear revealRow after animation completes
			setTimeout(() => {
				revealRow = -1;
			}, 600);

			return response.valid;
		} catch (err) {
			checking = false;
			triggerShake();
			const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined;
			if (status === 401 || status === 404) {
				clearToken(mode);
				token = null;
				error = 'Session expired. Start a new game.';
			}
			if (status === 409) {
				gameOver = true;
			}
			return false;
		}
	}

	function handleKey(key: string) {
		if (key === 'enter') {
			void submitGuess();
		} else if (key === 'backspace') {
			removeLetter();
		} else if (/^[a-z]$/i.test(key)) {
			addLetter(key);
		}
	}

	void initialize();

	return {
		get boards() { return boards; },
		get guesses() { return guesses; },
		get currentGuess() { return currentGuess; },
		get solvedCount() { return solvedCount; },
		get totalGuesses() { return totalGuesses; },
		get gameOver() { return gameOver; },
		get shaking() { return shaking; },
		get checking() { return checking; },
		get revealRow() { return revealRow; },
		get keyboardState() { return activeKeyboardState; },
		get selectedBoardIndex() { return selectedBoardIndex; },
		get maxGuesses() { return maxGuesses; },
		get boardCount() { return boardCount; },
		get mode() { return mode; },
		get loading() { return loading; },
		get error() { return error; },
		handleKey,
		addLetter,
		removeLetter,
		submitGuess,
		selectBoard,
	};
}

export type GameStore = ReturnType<typeof createGame>;
