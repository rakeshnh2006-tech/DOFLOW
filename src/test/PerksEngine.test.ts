// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';
import { initializeDatabase, type DoflowDatabase } from '../../server/db/database.js';
import { CoinEngine } from '../../server/engine/coinEngine.js';

describe('Doflow Student Perks — Stage 3: Digital Rewards Marketplace Acceptance Tests', () => {
  let database: DoflowDatabase;
  let engine: CoinEngine;

  beforeEach(() => {
    database = initializeDatabase(':memory:');
    engine = new CoinEngine(database);
  });

  afterEach(() => {
    database.close();
  });

  // Helper to credit coins directly to a user for testing redemption flows
  const creditCoins = (userId: string, coins: number) => {
    engine.ensureUser(userId);
    const now = Date.now();
    database.db
      .prepare('UPDATE coin_balances SET balance = ?, lifetime_earned = ? WHERE user_id = ?')
      .run(coins, coins, userId);

    database.db
      .prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, 'adjustment', NULL, 'Test credit', ?, ?)`
      )
      .run(`credit-${Date.now()}-${Math.random()}`, userId, coins, coins, now);
  };

  it('1. retrieves the full seeded rewards catalogue with default 100 DC pricing', () => {
    const perks = engine.getPerksCatalogue();
    expect(perks.length).toBeGreaterThanOrEqual(8);

    const categories = new Set(perks.map((p) => p.category));
    expect(categories.has('themes')).toBe(true);
    expect(categories.has('sounds')).toBe(true);
    expect(categories.has('badges')).toBe(true);
    expect(categories.has('customization')).toBe(true);

    // Verify all seeded rewards have the default 100 DC price
    for (const perk of perks) {
      expect(perk.coinCost).toBe(100);
      expect(perk.isActive).toBe(true);
      expect(perk.title).toBeTruthy();
      expect(perk.description).toBeTruthy();
    }
  });

  it('2. executes successful redemption atomically: deducts 100 DC and records permanent ownership', () => {
    const userId = 'student-alice-456';
    creditCoins(userId, 100);

    const initialBalance = engine.getBalance(userId);
    expect(initialBalance.balance).toBe(100);

    // Redeem 'theme_nordic'
    const result = engine.redeemPerk({
      userId,
      perkId: 'theme_nordic',
    });

    expect(result.success).toBe(true);
    expect(result.perk?.id).toBe('theme_nordic');
    expect(result.perk?.title).toBe('Nordic Midnight Theme');
    expect(result.newBalance).toBe(0);

    // Verify user balance is updated in database
    const updatedBalance = engine.getBalance(userId);
    expect(updatedBalance.balance).toBe(0);
    expect(updatedBalance.lifetimeSpent).toBe(100);

    // Verify ownership list contains the redeemed perk
    const ownedIds = engine.getUserOwnedPerkIds(userId);
    expect(ownedIds).toContain('theme_nordic');

    // Verify transaction ledger has append-only redemption record
    const transactions = engine.getTransactions(userId);
    const redeemTx = transactions.find((t) => t.type === 'redeemed_perk');
    expect(redeemTx).toBeDefined();
    expect(redeemTx?.amount).toBe(-100);
    expect(redeemTx?.balanceAfter).toBe(0);
    expect(redeemTx?.description).toContain('Nordic Midnight Theme');
  });

  it('3. rejects redemption when user has insufficient balance and deducts 0 coins', () => {
    const userId = 'student-broke-101';
    creditCoins(userId, 50); // Has 50 DC, but item costs 100 DC

    const result = engine.redeemPerk({
      userId,
      perkId: 'theme_forest',
    });

    expect(result.success).toBe(false);
    expect(result.insufficientBalance).toBe(true);
    expect(result.error).toContain('Insufficient Doflow Coins');
    expect(result.newBalance).toBe(50);

    // Verify balance was never deducted
    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(50);
    expect(balance.lifetimeSpent).toBe(0);

    // Verify perk was NOT added to owned list
    const owned = engine.getUserOwnedPerkIds(userId);
    expect(owned).not.toContain('theme_forest');

    // Verify no redemption transaction was created
    const transactions = engine.getTransactions(userId);
    const redeemTxs = transactions.filter((t) => t.type === 'redeemed_perk');
    expect(redeemTxs).toHaveLength(0);
  });

  it('4. rejects repeated redemption of an already owned permanent reward', () => {
    const userId = 'student-charlie-789';
    creditCoins(userId, 300); // 300 DC

    // First redemption succeeds
    const firstResult = engine.redeemPerk({
      userId,
      perkId: 'theme_sunset',
    });
    expect(firstResult.success).toBe(true);
    expect(firstResult.newBalance).toBe(200);

    // Second redemption of the SAME perk must be rejected
    const repeatResult = engine.redeemPerk({
      userId,
      perkId: 'theme_sunset',
    });

    expect(repeatResult.success).toBe(false);
    expect(repeatResult.alreadyOwned).toBe(true);
    expect(repeatResult.error).toContain('already own');
    expect(repeatResult.newBalance).toBe(200);

    // Balance remains 200 DC (no double deduction)
    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(200);
    expect(balance.lifetimeSpent).toBe(100);

    // Exactly one ownership entry exists
    const owned = engine.getUserOwnedPerkIds(userId);
    expect(owned.filter((id) => id === 'theme_sunset')).toHaveLength(1);
  });

  it('5. preserves balances, ownership, and transactions across database restarts (page refresh)', () => {
    const tempDbPath = resolve(process.cwd(), `test_perks_persistence_${Date.now()}.db`);
    if (existsSync(tempDbPath)) unlinkSync(tempDbPath);

    const userId = 'student-persistent-user';

    // Phase 1: Initialize, fund, and redeem
    const db1 = initializeDatabase(tempDbPath);
    const engine1 = new CoinEngine(db1);

    engine1.ensureUser(userId);
    db1.db.prepare('UPDATE coin_balances SET balance = 200, lifetime_earned = 200 WHERE user_id = ?').run(userId);

    const res = engine1.redeemPerk({ userId, perkId: 'badge_student_scholar' });
    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(100);

    db1.close();

    // Phase 2: Reopen database from disk simulating full page refresh / server restart
    const db2 = initializeDatabase(tempDbPath);
    const engine2 = new CoinEngine(db2);

    const balanceAfterReload = engine2.getBalance(userId);
    expect(balanceAfterReload.balance).toBe(100);
    expect(balanceAfterReload.lifetimeSpent).toBe(100);

    const ownedAfterReload = engine2.getUserOwnedPerkIds(userId);
    expect(ownedAfterReload).toContain('badge_student_scholar');

    const txsAfterReload = engine2.getTransactions(userId);
    expect(txsAfterReload.some((t) => t.type === 'redeemed_perk')).toBe(true);

    db2.close();
    if (existsSync(tempDbPath)) unlinkSync(tempDbPath);
  });

  it('6. enforces strict user isolation during account switching', () => {
    const userA = 'account-alice';
    const userB = 'account-bob';

    creditCoins(userA, 100);
    creditCoins(userB, 100);

    // User A redeems theme_nordic
    const resA = engine.redeemPerk({ userId: userA, perkId: 'theme_nordic' });
    expect(resA.success).toBe(true);
    expect(engine.getBalance(userA).balance).toBe(0);
    expect(engine.getUserOwnedPerkIds(userA)).toContain('theme_nordic');

    // Switch account to User B
    expect(engine.getBalance(userB).balance).toBe(100);
    expect(engine.getUserOwnedPerkIds(userB)).not.toContain('theme_nordic');

    // User B can also redeem theme_nordic independently
    const resB = engine.redeemPerk({ userId: userB, perkId: 'theme_nordic' });
    expect(resB.success).toBe(true);
    expect(engine.getBalance(userB).balance).toBe(0);
    expect(engine.getUserOwnedPerkIds(userB)).toContain('theme_nordic');

    // User A still owns theme_nordic and balance is still 0
    expect(engine.getUserOwnedPerkIds(userA)).toContain('theme_nordic');
    expect(engine.getBalance(userA).balance).toBe(0);
  });

  it('7. prevents concurrent double spending with simultaneous redemption requests', async () => {
    const userId = 'student-double-spender';
    // Exactly 100 DC in account: enough for ONLY ONE 100 DC reward
    creditCoins(userId, 100);

    // Fire two simultaneous redemption requests for two different 100 DC items
    const promise1 = Promise.resolve().then(() =>
      engine.redeemPerk({ userId, perkId: 'sound_ocean' })
    );
    const promise2 = Promise.resolve().then(() =>
      engine.redeemPerk({ userId, perkId: 'sound_campfire' })
    );

    const [res1, res2] = await Promise.all([promise1, promise2]);

    // Exactly one should succeed and one must fail due to insufficient balance
    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    expect(failures[0].insufficientBalance).toBe(true);
    expect(failures[0].newBalance).toBe(0);

    // The user balance must be exactly 0, never negative
    const finalBalance = engine.getBalance(userId);
    expect(finalBalance.balance).toBe(0);
    expect(finalBalance.lifetimeSpent).toBe(100);

    // Exactly one perk is owned
    const owned = engine.getUserOwnedPerkIds(userId);
    expect(owned).toHaveLength(1);
  });
});
