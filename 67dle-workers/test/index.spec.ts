import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Game API worker', () => {
	it('returns 401 when token is missing', async () => {
		const request = new IncomingRequest('http://example.com/api/game/state');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ error: 'Missing token' });
	});

	it('returns 400 on invalid start payload', async () => {
		const request = new IncomingRequest('http://example.com/api/game/start', {
			method: 'POST',
			body: JSON.stringify({ mode: 'unknown' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});
});
