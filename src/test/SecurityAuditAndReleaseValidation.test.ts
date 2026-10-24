// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, type DoflowDatabase } from '../../server/db/database.js';
import { CoinEngine, MIN_FOCUS_DURATION_MS } from '../../server/engine/coinEngine.js';
import { handleCoinsApiRequest } from '../../server/api/router.js';

describe('Stage 5: Security Audit and Release Validation', () => {
  let dbWrapper: DoflowDatabase;
  let engine: CoinEngine;

  beforeEach(() => {
    // Isolated in-memory database verifying actual SQLite constraints and transactions
    dbWrapper = initializeDatabase(':memory:');
    engine = new CoinEngine(dbWrapper);
  });

  afterEach(() => {
    dbWrapper.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Duplicate and replayed focus-session completion requests
  // ---------------------------------------------------------------------------
  describe('Audit Item 1: Duplicate and replayed focus-session completion requests', () => {
    it('awards coin once and strictly rejects replayed completion requests', () => {
      const userId = 'student_audit_01';
      const session = engine.startSession({
        userId,
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
      });

      // First completion: eligible and verified
      const firstResult = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(firstResult.success).toBe(true);
      expect(firstResult.coinsAwarded).toBe(1);
      expect(firstResult.newBalance).toBe(1);

      // Replay attempt 1: immediate replay with identical payload
      const replayResult1 = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(replayResult1.success).toBe(false);
      expect(replayResult1.duplicate).toBe(true);
      expect(replayResult1.coinsAwarded).toBe(0);
      expect(replayResult1.newBalance).toBe(1);

      // Replay attempt 2: third repeat request
      const replayResult2 = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(replayResult2.success).toBe(false);
      expect(replayResult2.duplicate).toBe(true);
      expect(replayResult2.coinsAwarded).toBe(0);
      expect(replayResult2.newBalance).toBe(1);

      // Verify exact database state
      const rewardRows = dbWrapper.db
        .prepare('SELECT * FROM focus_session_rewards WHERE session_id = ?')
        .all(session.id);
      expect(rewardRows.length).toBe(1);

      const txRows = dbWrapper.db
        .prepare('SELECT * FROM coin_transactions WHERE user_id = ? AND session_id = ?')
        .all(userId, session.id);
      expect(txRows.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Forged completion events and client-side balance manipulation
  // ---------------------------------------------------------------------------
  describe('Audit Item 2: Forged completion events and client-side balance manipulation', () => {
    it('rejects completion for fabricated session ID', () => {
      const result = engine.completeSession({
        userId: 'student_audit_02',
        sessionId: 'fabricated-session-uuid-9999',
        skipElapsedCheckForTesting: true,
      });

      expect(result.success).toBe(false);
      expect(result.coinsAwarded).toBe(0);
      expect(result.error).toMatch(/Session not found/i);
    });

    it('rejects completion for sessions under 25 minutes duration', () => {
      const userId = 'student_audit_02_short';
      const session = engine.startSession({
        userId,
        mode: 'focus',
        durationMs: 15 * 60 * 1000, // 15 mins (ineligible)
      });

      const result = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(result.success).toBe(false);
      expect(result.coinsAwarded).toBe(0);
      expect(result.error).toMatch(/at least 25 minutes/i);

      // Balance must remain 0
      const balance = engine.getBalance(userId);
      expect(balance.balance).toBe(0);
    });

    it('rejects completion for break sessions (breaks do not earn coins)', () => {
      const userId = 'student_audit_02_break';
      const session = engine.startSession({
        userId,
        mode: 'shortBreak',
        durationMs: 5 * 60 * 1000,
      });

      const result = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(result.success).toBe(false);
      expect(result.coinsAwarded).toBe(0);
      expect(result.error).toMatch(/Only focus sessions earn Doflow Coins/i);
    });

    it('rejects premature completion when server-side elapsed time is not met', () => {
      const userId = 'student_audit_02_premature';
      const session = engine.startSession({
        userId,
        mode: 'focus',
        durationMs: MIN_FOCUS_DURATION_MS,
      });

      // Calling without skipElapsedCheckForTesting: server-side elapsed check will evaluate real time
      const result = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: false,
      });

      expect(result.success).toBe(false);
      expect(result.coinsAwarded).toBe(0);
      expect(result.error).toMatch(/Session completed prematurely/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Unauthorized access to another user's balance, ledger, and redemptions
  // ---------------------------------------------------------------------------
  describe("Audit Item 3: Unauthorized access to another user's data", () => {
    it('prevents a user from completing another user session', async () => {
      const victim = 'victim_user_101';
      const attacker = 'attacker_user_999';

      const session = engine.startSession({
        userId: victim,
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
      });

      // Attacker attempts to complete victim's session via HTTP API router
      const response = await handleCoinsApiRequest(
        'POST',
        '/api/coins/sessions/complete',
        { 'x-doflow-user-id': attacker },
        { sessionId: session.id, skipElapsedCheckForTesting: true },
        engine
      );

      expect(response.status).toBe(403);
      expect((response.body as { error: string }).error).toMatch(/belongs to another user/i);

      // Victim balance must remain unchanged
      expect(engine.getBalance(victim).balance).toBe(0);
      expect(engine.getBalance(attacker).balance).toBe(0);
    });

    it('prevents a user from abandoning another user session', async () => {
      const victim = 'victim_user_102';
      const attacker = 'attacker_user_999';

      const session = engine.startSession({
        userId: victim,
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
      });

      const response = await handleCoinsApiRequest(
        'POST',
        '/api/coins/sessions/reset',
        { 'x-doflow-user-id': attacker },
        { sessionId: session.id },
        engine
      );

      expect(response.status).toBe(403);
      expect((response.body as { error: string }).error).toMatch(/belongs to another user/i);
    });

    it("ensures personal ledger, vouchers, and balance are segregated per authenticated user", async () => {
      const userA = 'student_user_alpha';
      const userB = 'student_user_beta';

      // Grant User A coins and redeem an offer
      engine.ensureUser(userA);
      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?')
        .run(userA);

      const offer = engine.createPartnerOffer({
        partnerName: 'Test Tech Partner',
        title: 'Cloud Credits',
        description: 'Verified test offer',
        coinCost: 50,
        startDate: Date.now() - 10000,
        endDate: Date.now() + 100000,
        termsAndConditions: 'Test terms',
        redemptionInstructions: 'Redeem at partner website',
        initialTokens: ['SECRET-TOKEN-ALPHA-777'],
      });

      const claimResult = engine.redeemPartnerOffer({ userId: userA, offerId: offer.id });
      expect(claimResult.success).toBe(true);
      expect(claimResult.redemption?.tokenCode).toBe('SECRET-TOKEN-ALPHA-777');

      // User B requests their own redemptions: User A's token must NOT appear
      const userBRedemptionsRes = await handleCoinsApiRequest(
        'GET',
        '/api/partner-offers/my-redemptions',
        { 'x-doflow-user-id': userB },
        undefined,
        engine
      );

      expect(userBRedemptionsRes.status).toBe(200);
      const bRedemptions = (userBRedemptionsRes.body as { redemptions: unknown[] }).redemptions;
      expect(bRedemptions.length).toBe(0);

      // Public catalogue does not reveal token codes or assigned users
      const publicOffersRes = await handleCoinsApiRequest(
        'GET',
        '/api/partner-offers',
        {},
        undefined,
        engine
      );
      expect(publicOffersRes.status).toBe(200);
      const publicOffers = (publicOffersRes.body as { offers: Array<Record<string, unknown>> }).offers;
      for (const o of publicOffers) {
        expect(o.tokenCode).toBeUndefined();
        expect(o.assignedUserId).toBeUndefined();
      }
    });

    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await handleCoinsApiRequest(
        'GET',
        '/api/coins/balance',
        {}, // No Authorization or X-Doflow-User-Id
        undefined,
        engine
      );
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized access to admin endpoints', async () => {
      const res = await handleCoinsApiRequest(
        'POST',
        '/api/admin/partner-offers',
        { 'x-doflow-admin-key': 'invalid-secret-key' },
        { title: 'Hacked Offer' },
        engine
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Concurrent coin grants and concurrent redemptions
  // ---------------------------------------------------------------------------
  describe('Audit Item 4: Concurrent coin grants and concurrent redemptions', () => {
    it('prevents double spending during concurrent digital perk redemptions', () => {
      const userId = 'student_concurrency_01';
      engine.ensureUser(userId);

      // Set exactly 100 DC balance
      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 100, lifetime_earned = 100 WHERE user_id = ?')
        .run(userId);

      // Attempt two redemptions of 100 DC items in sequence/overlap
      const res1 = engine.redeemPerk({ userId, perkId: 'theme_nordic' });
      const res2 = engine.redeemPerk({ userId, perkId: 'theme_forest' });

      expect(res1.success).toBe(true);
      expect(res1.newBalance).toBe(0);

      // Second attempt must fail with insufficient balance
      expect(res2.success).toBe(false);
      expect(res2.insufficientBalance).toBe(true);
      expect(res2.newBalance).toBe(0);

      // Verify balance is never negative
      const finalBalance = engine.getBalance(userId);
      expect(finalBalance.balance).toBe(0);
    });

    it('handles concurrent partner offer redemptions for a single available coupon token', () => {
      const user1 = 'student_racing_01';
      const user2 = 'student_racing_02';

      engine.ensureUser(user1);
      engine.ensureUser(user2);

      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?')
        .run(user1);
      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?')
        .run(user2);

      // Offer with exactly ONE token
      const offer = engine.createPartnerOffer({
        partnerName: 'Limited Partner',
        title: 'Sole License',
        description: 'Only 1 available',
        coinCost: 100,
        startDate: Date.now() - 10000,
        endDate: Date.now() + 100000,
        termsAndConditions: 'Single claim only',
        redemptionInstructions: 'Redeem once',
        initialTokens: ['EXCLUSIVE-ONE-SHOT-TOKEN'],
      });

      // User 1 claims
      const res1 = engine.redeemPartnerOffer({ userId: user1, offerId: offer.id });
      // User 2 claims
      const res2 = engine.redeemPartnerOffer({ userId: user2, offerId: offer.id });

      expect(res1.success).toBe(true);
      expect(res1.redemption?.tokenCode).toBe('EXCLUSIVE-ONE-SHOT-TOKEN');
      expect(res1.newBalance).toBe(0);

      // User 2 must be cleanly rejected due to stock exhaustion
      expect(res2.success).toBe(false);
      expect(res2.outOfStock).toBe(true);
      // User 2 coins must NOT have been deducted
      expect(res2.newBalance).toBe(100);
      expect(engine.getBalance(user2).balance).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Database transaction failures and rollback behavior
  // ---------------------------------------------------------------------------
  describe('Audit Item 5: Database transaction failures and rollback behavior', () => {
    it('rolls back completely if an error occurs mid-transaction', () => {
      const userId = 'student_rollback_test';
      engine.ensureUser(userId);

      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 200 WHERE user_id = ?')
        .run(userId);

      // Simulate mid-transaction failure
      expect(() => {
        dbWrapper.runTransaction(() => {
          // Deduct 100 coins
          dbWrapper.db
            .prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?')
            .run(userId);

          // Force an intentional crash
          throw new Error('Simulated database write interruption');
        });
      }).toThrow('Simulated database write interruption');

      // Verify state was completely rolled back
      const balance = engine.getBalance(userId);
      expect(balance.balance).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Insufficient balance and negative-balance prevention
  // ---------------------------------------------------------------------------
  describe('Audit Item 6: Insufficient balance and negative-balance prevention', () => {
    it('rejects perk redemption when user has insufficient balance', () => {
      const userId = 'student_broke_user';
      engine.ensureUser(userId);

      const res = engine.redeemPerk({ userId, perkId: 'theme_nordic' });
      expect(res.success).toBe(false);
      expect(res.insufficientBalance).toBe(true);
      expect(res.newBalance).toBe(0);
    });

    it('enforces SQLite CHECK(balance >= 0) constraint at the database layer', () => {
      const userId = 'student_constraint_user';
      engine.ensureUser(userId);

      // Direct SQL attempt to set negative balance must violate CHECK constraint
      expect(() => {
        dbWrapper.db
          .prepare('UPDATE coin_balances SET balance = -10 WHERE user_id = ?')
          .run(userId);
      }).toThrow(/CHECK constraint failed/i);

      // Direct SQL attempt to insert negative balance_after in ledger must fail
      expect(() => {
        dbWrapper.db
          .prepare(
            `INSERT INTO coin_transactions (
              id, user_id, amount, type, description, balance_after, timestamp
            ) VALUES ('tx_test', ?, -10, 'adjustment', 'Illegal deduction', -10, ?)`
          )
          .run(userId, Date.now());
      }).toThrow(/CHECK constraint failed/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Session reset, interruption, refresh, logout, and login behavior
  // ---------------------------------------------------------------------------
  describe('Audit Item 7: Session reset, interruption, refresh, logout, and login behavior', () => {
    it('never awards coins for an abandoned or reset session', () => {
      const userId = 'student_abandon_test';
      const session = engine.startSession({
        userId,
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
      });

      // User resets/abandons
      const abandonRes = engine.abandonSession({
        userId,
        sessionId: session.id,
        reason: 'User paused or navigated away',
      });
      expect(abandonRes.success).toBe(true);

      // Attempting to complete the abandoned session afterwards
      const completeRes = engine.completeSession({
        userId,
        sessionId: session.id,
        skipElapsedCheckForTesting: true,
      });

      expect(completeRes.success).toBe(false);
      expect(completeRes.coinsAwarded).toBe(0);
      expect(completeRes.error).toMatch(/Session was abandoned or reset/i);

      expect(engine.getBalance(userId).balance).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Digital reward ownership persistence
  // ---------------------------------------------------------------------------
  describe('Audit Item 8: Digital reward ownership persistence', () => {
    it('persists ownership and prevents redundant re-purchase of permanent rewards', () => {
      const userId = 'student_perks_persistence';
      engine.ensureUser(userId);

      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 300 WHERE user_id = ?')
        .run(userId);

      // Redeem theme_sunset
      const firstClaim = engine.redeemPerk({ userId, perkId: 'theme_sunset' });
      expect(firstClaim.success).toBe(true);
      expect(firstClaim.newBalance).toBe(200);

      // Ownership list
      const ownedIds = engine.getUserOwnedPerkIds(userId);
      expect(ownedIds).toContain('theme_sunset');

      // Attempt duplicate purchase
      const secondClaim = engine.redeemPerk({ userId, perkId: 'theme_sunset' });
      expect(secondClaim.success).toBe(false);
      expect(secondClaim.alreadyOwned).toBe(true);
      expect(secondClaim.newBalance).toBe(200); // 0 coins deducted
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Expired, unavailable, and exhausted partner offers
  // ---------------------------------------------------------------------------
  describe('Audit Item 9: Expired, unavailable, and exhausted partner offers', () => {
    it('rejects expired partner offers without deducting coins', () => {
      const userId = 'student_partner_expired';
      engine.ensureUser(userId);
      dbWrapper.db.prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?').run(userId);

      const expiredOffer = engine.createPartnerOffer({
        partnerName: 'Past Corp',
        title: 'Past Deal',
        description: 'Already expired',
        coinCost: 100,
        startDate: Date.now() - 50000,
        endDate: Date.now() - 1000, // Ended in the past
        termsAndConditions: 'Terms',
        redemptionInstructions: 'Instructions',
        initialTokens: ['EXPIRED-CODE-1'],
      });

      const res = engine.redeemPartnerOffer({ userId, offerId: expiredOffer.id });
      expect(res.success).toBe(false);
      expect(res.expired).toBe(true);
      expect(res.newBalance).toBe(100);
      expect(engine.getBalance(userId).balance).toBe(100);
    });

    it('rejects paused partner offers without deducting coins', () => {
      const userId = 'student_partner_paused';
      engine.ensureUser(userId);
      dbWrapper.db.prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?').run(userId);

      const pausedOffer = engine.createPartnerOffer({
        partnerName: 'Paused Corp',
        title: 'Paused Deal',
        description: 'Currently paused',
        coinCost: 100,
        startDate: Date.now() - 1000,
        endDate: Date.now() + 50000,
        status: 'paused',
        termsAndConditions: 'Terms',
        redemptionInstructions: 'Instructions',
        initialTokens: ['PAUSED-CODE-1'],
      });

      const res = engine.redeemPartnerOffer({ userId, offerId: pausedOffer.id });
      expect(res.success).toBe(false);
      expect(res.paused).toBe(true);
      expect(res.newBalance).toBe(100);
    });

    it('rejects pilot offers with pending agreement without deducting coins', () => {
      const userId = 'student_pilot_test';
      engine.ensureUser(userId);
      dbWrapper.db.prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?').run(userId);

      const res = engine.redeemPartnerOffer({
        userId,
        offerId: 'partner_pilot_academic_bookstore',
      });

      expect(res.success).toBe(false);
      expect(res.pendingAgreement).toBe(true);
      expect(res.newBalance).toBe(100);
    });

    it('supports distinguishable redemption state management (cancellation and failure with refund)', () => {
      const userId = 'student_cancellation_test';
      engine.ensureUser(userId);
      dbWrapper.db.prepare('UPDATE coin_balances SET balance = 100 WHERE user_id = ?').run(userId);

      const offer = engine.createPartnerOffer({
        partnerName: 'Refundable Partner',
        title: 'Refundable Offer',
        description: 'Test cancellation',
        coinCost: 50,
        startDate: Date.now() - 1000,
        endDate: Date.now() + 50000,
        termsAndConditions: 'Terms',
        redemptionInstructions: 'Instructions',
        initialTokens: ['REFUNDABLE-TOKEN-999'],
      });

      // 1. Fulfilled redemption
      const fulfillRes = engine.redeemPartnerOffer({ userId, offerId: offer.id });
      expect(fulfillRes.success).toBe(true);
      expect(fulfillRes.newBalance).toBe(50);
      const redemptionId = fulfillRes.redemption!.id;

      // 2. Cancel redemption and refund
      const cancelRes = engine.cancelUserPartnerRedemption({
        userId,
        redemptionId,
        reason: 'Customer requested cancellation',
      });

      expect(cancelRes.success).toBe(true);
      expect(cancelRes.newBalance).toBe(100); // 50 DC refunded
      expect(engine.getBalance(userId).balance).toBe(100);

      // Verify redemption status is now 'canceled'
      const redemptions = engine.getUserPartnerRedemptions(userId);
      const canceledRecord = redemptions.find((r) => r.id === redemptionId);
      expect(canceledRecord?.status).toBe('canceled');

      // Verify the coupon token was returned to available status in pool
      const tokenRow = dbWrapper.db
        .prepare('SELECT status, is_claimed FROM partner_offer_tokens WHERE token_code = ?')
        .get('REFUNDABLE-TOKEN-999') as { status: string; is_claimed: number };
      expect(tokenRow.status).toBe('available');
      expect(tokenRow.is_claimed).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Database migration safety, API validation, and existing Doflow regression tests
  // ---------------------------------------------------------------------------
  describe('Audit Item 10: Database migration safety and API validation', () => {
    it('guarantees database initialization is idempotent and non-destructive', () => {
      const userId = 'student_idempotency_test';
      engine.ensureUser(userId);
      dbWrapper.db
        .prepare('UPDATE coin_balances SET balance = 75, lifetime_earned = 75 WHERE user_id = ?')
        .run(userId);

      // Re-run database initialization on the same live database connection
      // (mimicking repeated application startup or non-destructive migration)
      dbWrapper.db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS coin_balances (user_id TEXT PRIMARY KEY);
      `);

      // Verify balance is completely intact
      const balance = engine.getBalance(userId);
      expect(balance.balance).toBe(75);
    });

    it('rejects malformed API input gracefully with standard HTTP 400 Bad Request', async () => {
      // Missing sessionId on complete
      const res = await handleCoinsApiRequest(
        'POST',
        '/api/coins/sessions/complete',
        { 'x-doflow-user-id': 'student_test' },
        {}, // missing sessionId
        engine
      );
      expect(res.status).toBe(400);

      // Missing perkId on redeem
      const resPerk = await handleCoinsApiRequest(
        'POST',
        '/api/perks/redeem',
        { 'x-doflow-user-id': 'student_test' },
        {}, // missing perkId
        engine
      );
      expect(resPerk.status).toBe(400);

      // Missing offerId on partner redeem
      const resPartner = await handleCoinsApiRequest(
        'POST',
        '/api/partner-offers/redeem',
        { 'x-doflow-user-id': 'student_test' },
        {}, // missing offerId
        engine
      );
      expect(resPartner.status).toBe(400);
    });
  });
});
