// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';
import { initializeDatabase, type DoflowDatabase } from '../../server/db/database.js';
import { CoinEngine, MIN_FOCUS_DURATION_MS } from '../../server/engine/coinEngine.js';

describe('Doflow Coins — Stage 2: Secure Coin Engine Acceptance Tests', () => {
  let database: DoflowDatabase;
  let engine: CoinEngine;

  beforeEach(() => {
    // In-memory database for fresh, isolated test state
    database = initializeDatabase(':memory:');
    engine = new CoinEngine(database);
  });

  afterEach(() => {
    database.close();
  });

  // Acceptance Test 1: One eligible completed session awards one coin
  it('1. awards exactly one coin for an eligible 25-minute focus session completion', () => {
    const userId = 'user-alice-123';
    const session = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });

    expect(session.status).toBe('active');
    expect(session.durationMs).toBe(25 * 60 * 1000);

    // Complete session with verified server state
    const result = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: true,
    });

    expect(result.success).toBe(true);
    expect(result.coinsAwarded).toBe(1);
    expect(result.newBalance).toBe(1);
    expect(result.lifetimeEarned).toBe(1);
    expect(result.duplicate).toBeFalsy();

    // Verify balance query
    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(1);
    expect(balance.lifetimeEarned).toBe(1);
    expect(balance.lifetimeSpent).toBe(0);

    // Verify append-only transaction ledger
    const transactions = engine.getTransactions(userId);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(1);
    expect(transactions[0].type).toBe('earned_focus');
    expect(transactions[0].sessionId).toBe(session.id);
    expect(transactions[0].balanceAfter).toBe(1);
  });

  // Acceptance Test 2: Duplicate completion requests award only one coin
  it('2. duplicate or replayed completion requests award zero additional coins', () => {
    const userId = 'user-bob-456';
    const session = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });

    // First completion
    const firstResult = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: true,
    });
    expect(firstResult.success).toBe(true);
    expect(firstResult.coinsAwarded).toBe(1);
    expect(firstResult.newBalance).toBe(1);

    // Second completion (duplicate replay)
    const secondResult = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: true,
    });
    expect(secondResult.success).toBe(false);
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.coinsAwarded).toBe(0);
    expect(secondResult.newBalance).toBe(1);

    // Third completion (replayed again)
    const thirdResult = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: true,
    });
    expect(thirdResult.duplicate).toBe(true);
    expect(thirdResult.coinsAwarded).toBe(0);

    // Final balance and ledger must only reflect 1 coin
    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(1);

    const transactions = engine.getTransactions(userId);
    expect(transactions).toHaveLength(1);
  });

  // Acceptance Test 3: Resetting an incomplete timer awards zero coins
  it('3. resetting, abandoning, or incomplete sessions award zero coins', () => {
    const userId = 'user-carol-789';
    const session = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });

    // User resets/abandons the timer halfway through
    const abandonResult = engine.abandonSession({
      userId,
      sessionId: session.id,
      reason: 'User clicked reset',
    });
    expect(abandonResult.success).toBe(true);

    // Try to complete the abandoned session
    const completeResult = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: true,
    });

    expect(completeResult.success).toBe(false);
    expect(completeResult.coinsAwarded).toBe(0);
    expect(completeResult.error).toContain('abandoned');

    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(0);

    const transactions = engine.getTransactions(userId);
    expect(transactions).toHaveLength(0);
  });

  // Acceptance Test 4: Refreshing and logging back in preserve the balance
  it('4. persists balance and transactions across simulated page reloads and re-logins', () => {
    const testDbPath = resolve(process.cwd(), 'test-persist.db');
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    try {
      const db1 = initializeDatabase(testDbPath);
      const engine1 = new CoinEngine(db1);
      const userId = 'user-persist-101';

      // Earn 2 coins across 2 distinct sessions
      const s1 = engine1.startSession({ userId, mode: 'focus', durationMs: MIN_FOCUS_DURATION_MS });
      engine1.completeSession({ userId, sessionId: s1.id, skipElapsedCheckForTesting: true });

      const s2 = engine1.startSession({ userId, mode: 'focus', durationMs: MIN_FOCUS_DURATION_MS });
      engine1.completeSession({ userId, sessionId: s2.id, skipElapsedCheckForTesting: true });

      expect(engine1.getBalance(userId).balance).toBe(2);
      db1.close();

      // Simulate browser reload / reconnecting to persistent storage
      const db2 = initializeDatabase(testDbPath);
      const engine2 = new CoinEngine(db2);

      const restoredBalance = engine2.getBalance(userId);
      expect(restoredBalance.balance).toBe(2);
      expect(restoredBalance.lifetimeEarned).toBe(2);

      const restoredTransactions = engine2.getTransactions(userId);
      expect(restoredTransactions).toHaveLength(2);
      expect(restoredTransactions[0].amount).toBe(1);
      expect(restoredTransactions[1].amount).toBe(1);

      db2.close();
    } finally {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    }
  });

  // Acceptance Test 5: Another user cannot access or modify the current user's balance
  it("5. enforces user isolation: users cannot access or modify other users' balances", () => {
    const userA = 'user-victim-aaa';
    const userB = 'user-attacker-bbb';

    // User A earns 1 coin
    const sessionA = engine.startSession({
      userId: userA,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });
    engine.completeSession({ userId: userA, sessionId: sessionA.id, skipElapsedCheckForTesting: true });

    // User B starts with 0
    expect(engine.getBalance(userB).balance).toBe(0);
    expect(engine.getBalance(userA).balance).toBe(1);

    // User B attempts to complete User A's session to claim a coin
    const attackResult = engine.completeSession({
      userId: userB,
      sessionId: sessionA.id,
      skipElapsedCheckForTesting: true,
    });

    expect(attackResult.success).toBe(false);
    expect(attackResult.coinsAwarded).toBe(0);
    expect(attackResult.error).toContain('Forbidden');

    // User B cannot abandon User A's session
    expect(() => {
      engine.abandonSession({ userId: userB, sessionId: sessionA.id });
    }).toThrow(/Unauthorized/);

    // User A's balance remains 1; User B's balance remains 0
    expect(engine.getBalance(userA).balance).toBe(1);
    expect(engine.getBalance(userB).balance).toBe(0);
  });

  // Acceptance Test 6: Concurrent completion requests cannot create duplicate rewards
  it('6. atomic transaction safety prevents duplicate rewards under concurrent completion requests', async () => {
    const userId = 'user-concurrent-999';
    const session = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });

    // Fire 10 simultaneous completion requests for the exact same session
    const concurrentRequests = Array.from({ length: 10 }, () =>
      Promise.resolve().then(() =>
        engine.completeSession({
          userId,
          sessionId: session.id,
          skipElapsedCheckForTesting: true,
        })
      )
    );

    const results = await Promise.all(concurrentRequests);

    const successfulAwards = results.filter((r) => r.success && r.coinsAwarded === 1);
    const duplicates = results.filter((r) => r.duplicate);

    // Exactly one must succeed with 1 coin
    expect(successfulAwards).toHaveLength(1);
    // The remaining 9 must be flagged as duplicates with 0 coins
    expect(duplicates).toHaveLength(9);

    // Final balance is strictly 1
    const finalBalance = engine.getBalance(userId);
    expect(finalBalance.balance).toBe(1);
    expect(finalBalance.lifetimeEarned).toBe(1);

    // Only 1 transaction in ledger
    const transactions = engine.getTransactions(userId);
    expect(transactions).toHaveLength(1);
  });

  // Additional Rule Validations
  it('does not award coins for short or long breaks', () => {
    const userId = 'user-breaks';
    const shortBreakSession = engine.startSession({
      userId,
      mode: 'shortBreak',
      durationMs: 5 * 60 * 1000,
    });

    const result = engine.completeSession({
      userId,
      sessionId: shortBreakSession.id,
      skipElapsedCheckForTesting: true,
    });

    expect(result.success).toBe(false);
    expect(result.coinsAwarded).toBe(0);
    expect(result.error).toContain('Breaks are not eligible');
    expect(engine.getBalance(userId).balance).toBe(0);
  });

  it('does not award coins for focus sessions under 25 minutes', () => {
    const userId = 'user-short-focus';
    const shortSession = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: 15 * 60 * 1000, // 15 mins (less than 25)
    });

    const result = engine.completeSession({
      userId,
      sessionId: shortSession.id,
      skipElapsedCheckForTesting: true,
    });

    expect(result.success).toBe(false);
    expect(result.coinsAwarded).toBe(0);
    expect(result.error).toContain('at least 25 minutes');
    expect(engine.getBalance(userId).balance).toBe(0);
  });

  it('rejects premature completion when server wall-clock elapsed time requirement is not met', () => {
    const userId = 'user-premature';
    const session = engine.startSession({
      userId,
      mode: 'focus',
      durationMs: MIN_FOCUS_DURATION_MS,
    });

    // Calling completeSession without skipElapsedCheckForTesting immediately after starting
    const result = engine.completeSession({
      userId,
      sessionId: session.id,
      skipElapsedCheckForTesting: false,
    });

    expect(result.success).toBe(false);
    expect(result.coinsAwarded).toBe(0);
    expect(result.error).toContain('Session completed prematurely');
    expect(engine.getBalance(userId).balance).toBe(0);
  });
});
