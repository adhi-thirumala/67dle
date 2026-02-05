import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import {
	BOARD_COUNT,
	MAX_GUESSES,
	buildGameState,
	createSession,
	createTargets,
	getDailySeed,
	getSession,
	getSessionTtlSeconds,
	getTokenFromAuthHeader,
	isGuessFormatValid,
	isValidWord,
	recordGuess,
	secondsUntilMidnightUtc,
} from './game';
import type { GameMode } from './types';

interface Env {
	SESSIONS: KVNamespace;
	WORDS_DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.post('/api/game/start', async (c) => {
	let body: { mode?: GameMode };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON' }, 400);
	}

	const mode = body.mode;
	if (mode !== 'daily' && mode !== 'random') {
		return c.json({ error: 'Invalid mode' }, 400);
	}

	const seed = mode === 'daily' ? getDailySeed() : Math.floor(Math.random() * 1_000_000_000);
	const cacheKey = `https://67dle-cache/daily-targets/${seed}`;
	let targets: string[] = [];

	if (mode === 'daily') {
		const cache = caches.default;
		const cached = await cache.match(cacheKey);
		if (cached) {
			targets = await cached.json<string[]>();
		} else {
			targets = await createTargets(c.env.WORDS_DB, seed, BOARD_COUNT);
			const ttl = secondsUntilMidnightUtc();
			const response = new Response(JSON.stringify(targets), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `public, max-age=${ttl}`,
				},
			});
			c.executionCtx.waitUntil(cache.put(cacheKey, response));
		}
	} else {
		targets = await createTargets(c.env.WORDS_DB, seed, BOARD_COUNT);
	}

	const session = createSession(mode, seed, targets);
	const sessionKey = `session:${session.token}`;
	await c.env.SESSIONS.put(sessionKey, JSON.stringify(session), {
		expirationTtl: getSessionTtlSeconds(mode),
	});

	setCookie(c, 'token', session.token, {
		sameSite: 'Lax',
		path: '/',
	});

	return c.json({
		sessionId: session.sessionId,
		token: session.token,
		boardCount: BOARD_COUNT,
		maxGuesses: MAX_GUESSES,
	});
});

app.post('/api/game/guess', async (c) => {
	let body: { guess?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: 'Invalid JSON' }, 400);
	}

	const token = getCookie(c, 'token') ?? getTokenFromAuthHeader(c.req.header('Authorization'));
	if (!token) {
		return c.json({ error: 'Missing token' }, 401);
	}

	const sessionKey = `session:${token}`;
	const session = await getSession(c.env.SESSIONS, sessionKey);
	if (!session) {
		return c.json({ error: 'Session not found' }, 404);
	}

	if (session.gameOver) {
		return c.json({ error: 'Game over' }, 409);
	}

	const guess = (body.guess ?? '').toLowerCase();
	if (!isGuessFormatValid(guess)) {
		return c.json({ valid: false, error: 'Invalid guess' }, 400);
	}

	const valid = await isValidWord(c.env.WORDS_DB, guess);
	if (!valid) {
		return c.json({ valid: false, error: 'Invalid guess' }, 400);
	}

	const results = recordGuess(session, guess);
	await c.env.SESSIONS.put(sessionKey, JSON.stringify(session), {
		expirationTtl: getSessionTtlSeconds(session.mode),
	});

	return c.json({
		valid: true,
		results,
		solvedCount: session.solvedCount,
		totalGuesses: session.guesses.length,
		gameOver: session.gameOver,
	});
});

app.get('/api/game/state', async (c) => {
	const token = getCookie(c, 'token') ?? getTokenFromAuthHeader(c.req.header('Authorization'));
	if (!token) {
		return c.json({ error: 'Missing token' }, 401);
	}

	const sessionKey = `session:${token}`;
	const session = await getSession(c.env.SESSIONS, sessionKey);
	if (!session) {
		return c.json({ error: 'Session not found' }, 404);
	}

	const state = buildGameState(session);
	return c.json(state);
});

export default app;
