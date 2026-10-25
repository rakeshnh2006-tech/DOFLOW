// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, type DoflowDatabase } from '../../server/db/database.js';
import { CoinEngine, MIN_FOCUS_DURATION_MS } from '../../server/engine/coinEngine.js';
import { handleCoinsApiRequest } from '../../server/api/router.js';

describe('Coin API Router Tests', () => {
  let database: DoflowDatabase;
  let engine: CoinEngine;

  beforeEach(() => {
    database = initializeDatabase(':memory:');
    engine = new CoinEngine(database);
  });

  afterEach(() => {
    database.close();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await handleCoinsApiRequest('GET', '/api/coins/balance', {}, undefined, engine);
    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toContain('Unauthorized');
  });

  it('handles session lifecycle and balance queries via API', async () => {
    const headers = { authorization: 'Bearer user-api-test' };

    // 1. Check initial balance
    const balanceRes1 = await handleCoinsApiRequest('GET', '/api/coins/balance', headers, undefined, engine);
    expect(balanceRes1.status).toBe(200);
    expect((balanceRes1.body as { balance: { balance: number } }).balance.balance).toBe(0);

    // 2. Start session
    const startRes = await handleCoinsApiRequest(
      'POST',
      '/api/coins/sessions/start',
      headers,
      { mode: 'focus', durationMs: MIN_FOCUS_DURATION_MS },
      engine
    );
    expect(startRes.status).toBe(200);
    const sessionId = (startRes.body as { session: { id: string } }).session.id;

    // 3. Complete session
    const completeRes = await handleCoinsApiRequest(
      'POST',
      '/api/coins/sessions/complete',
      headers,
      { sessionId, skipElapsedCheckForTesting: true },
      engine
    );
    expect(completeRes.status).toBe(200);
    expect((completeRes.body as { coinsAwarded: number }).coinsAwarded).toBe(10);

    // 4. Query updated balance
    const balanceRes2 = await handleCoinsApiRequest('GET', '/api/coins/balance', headers, undefined, engine);
    expect(balanceRes2.status).toBe(200);
    expect((balanceRes2.body as { balance: { balance: number } }).balance.balance).toBe(10);

    // 5. Query transactions
    const transRes = await handleCoinsApiRequest('GET', '/api/coins/transactions', headers, undefined, engine);
    expect(transRes.status).toBe(200);
    expect((transRes.body as { transactions: unknown[] }).transactions).toHaveLength(1);

    // 6. Duplicate complete attempt
    const dupRes = await handleCoinsApiRequest(
      'POST',
      '/api/coins/sessions/complete',
      headers,
      { sessionId, skipElapsedCheckForTesting: true },
      engine
    );
    expect(dupRes.status).toBe(200);
    expect((dupRes.body as { duplicate: boolean; coinsAwarded: number }).duplicate).toBe(true);
    expect((dupRes.body as { coinsAwarded: number }).coinsAwarded).toBe(0);
  });
});
