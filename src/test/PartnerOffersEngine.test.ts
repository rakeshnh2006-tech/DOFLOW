// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, type DoflowDatabase } from '../../server/db/database.js';
import { CoinEngine } from '../../server/engine/coinEngine.js';
import { handleCoinsApiRequest } from '../../server/api/router.js';

describe('Doflow Student Perks — Stage 4: Partner Offers Engine Acceptance Tests', () => {
  let database: DoflowDatabase;
  let engine: CoinEngine;

  beforeEach(() => {
    database = initializeDatabase(':memory:');
    engine = new CoinEngine(database);
  });

  afterEach(() => {
    database.close();
  });

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

  it('1. successfully executes atomic partner offer redemption with unique token allocation', () => {
    const userId = 'student-partner-alice';
    creditCoins(userId, 150);

    // Create a verified partner offer with authentic tokens
    const now = Date.now();
    const offer = engine.createPartnerOffer({
      partnerName: 'Academic Bookstore Consortium',
      title: '$15 Course Textbooks Discount',
      description: 'Verified student academic book allowance.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days
      totalLimit: 5,
      perUserLimit: 1,
      termsAndConditions: 'Valid on required course materials only. Non-transferable.',
      redemptionInstructions: 'Apply promo code at academicbookstore.edu/checkout.',
      initialTokens: ['BOOK-VOUCHER-001', 'BOOK-VOUCHER-002'],
    });

    const res = engine.redeemPartnerOffer({ userId, offerId: offer.id });

    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(50);
    expect(res.redemption).toBeDefined();
    expect(res.redemption?.tokenCode).toBe('BOOK-VOUCHER-001');
    expect(res.redemption?.status).toBe('fulfilled');
    expect(res.redemption?.partnerTerms).toContain('Valid on required course materials');
    expect(res.redemption?.redemptionInstructions).toContain('Apply promo code');

    // Balance in DB is deducted
    const balance = engine.getBalance(userId);
    expect(balance.balance).toBe(50);
    expect(balance.lifetimeSpent).toBe(100);

    // Token in DB is marked claimed
    const userRedemptions = engine.getUserPartnerRedemptions(userId);
    expect(userRedemptions).toHaveLength(1);
    expect(userRedemptions[0].tokenCode).toBe('BOOK-VOUCHER-001');

    // Offer stock is decremented
    const updatedOffers = engine.getPartnerOffers();
    const foundOffer = updatedOffers.find((o) => o.id === offer.id);
    expect(foundOffer?.redeemedCount).toBe(1);
    expect(foundOffer?.availableTokensCount).toBe(1);
  });

  it('2. rejects redemption when offer has expired (expiration test)', () => {
    const userId = 'student-late-sub';
    creditCoins(userId, 200);

    const now = Date.now();
    const expiredOffer = engine.createPartnerOffer({
      partnerName: 'Summer Tech Camp',
      title: 'Summer Student License',
      description: 'Expired summer license.',
      coinCost: 100,
      startDate: now - 60 * 24 * 60 * 60 * 1000,
      endDate: now - 1000, // Already expired in the past
      status: 'active',
      termsAndConditions: 'Expired offer terms.',
      redemptionInstructions: 'No longer redeemable.',
      initialTokens: ['SUMMER-EXPIRED-99'],
    });

    const res = engine.redeemPartnerOffer({ userId, offerId: expiredOffer.id });

    expect(res.success).toBe(false);
    expect(res.expired).toBe(true);
    expect(res.error).toContain('expired');
    expect(res.newBalance).toBe(200);

    // Zero coins deducted
    expect(engine.getBalance(userId).balance).toBe(200);
    expect(engine.getUserPartnerRedemptions(userId)).toHaveLength(0);
  });

  it('3. rejects redemption when inventory is exhausted or out of stock (inventory limits test)', () => {
    const user1 = 'student-first-in-line';
    const user2 = 'student-second-in-line';
    creditCoins(user1, 100);
    creditCoins(user2, 100);

    const now = Date.now();
    // Offer with total_limit = 1 and exactly 1 token
    const limitedOffer = engine.createPartnerOffer({
      partnerName: 'Limited Hardware Lab',
      title: 'Robotics Kit Component Pass',
      description: 'Exclusive hardware voucher.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 7 * 24 * 60 * 60 * 1000,
      totalLimit: 1,
      perUserLimit: 1,
      termsAndConditions: 'Limit 1 per department student.',
      redemptionInstructions: 'Collect at hardware lab desk.',
      initialTokens: ['ROBOT-KIT-FINAL-01'],
    });

    // User 1 redeems the only available voucher
    const res1 = engine.redeemPartnerOffer({ userId: user1, offerId: limitedOffer.id });
    expect(res1.success).toBe(true);

    // User 2 attempts to redeem when out of stock
    const res2 = engine.redeemPartnerOffer({ userId: user2, offerId: limitedOffer.id });
    expect(res2.success).toBe(false);
    expect(res2.outOfStock).toBe(true);
    expect(res2.error).toContain('out of stock');
    expect(res2.newBalance).toBe(100);

    // User 2 was not charged
    expect(engine.getBalance(user2).balance).toBe(100);
    expect(engine.getUserPartnerRedemptions(user2)).toHaveLength(0);
  });

  it('4. rejects duplicate redemptions by the same user exceeding per_user_limit', () => {
    const userId = 'student-greedy-gus';
    creditCoins(userId, 300);

    const now = Date.now();
    const offer = engine.createPartnerOffer({
      partnerName: 'Campus Coffee Co-op',
      title: '$5 Study Fuel Voucher',
      description: 'Single use student perk.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 14 * 24 * 60 * 60 * 1000,
      totalLimit: 10,
      perUserLimit: 1, // Max 1 per student
      termsAndConditions: 'Strictly 1 per student per semester.',
      redemptionInstructions: 'Show barcode to barista.',
      initialTokens: ['COFFEE-101', 'COFFEE-102', 'COFFEE-103'],
    });

    // First redemption succeeds
    const res1 = engine.redeemPartnerOffer({ userId, offerId: offer.id });
    expect(res1.success).toBe(true);
    expect(res1.newBalance).toBe(200);

    // Repeated redemption must be blocked
    const res2 = engine.redeemPartnerOffer({ userId, offerId: offer.id });
    expect(res2.success).toBe(false);
    expect(res2.alreadyRedeemedLimit).toBe(true);
    expect(res2.error).toContain('maximum redemption limit');
    expect(res2.newBalance).toBe(200);

    // Zero additional coins deducted
    expect(engine.getBalance(userId).balance).toBe(200);
    expect(engine.getUserPartnerRedemptions(userId)).toHaveLength(1);
  });

  it('5. handles failed transactions safely (insufficient balance & concurrent race conditions)', async () => {
    const userA = 'student-race-user-a';
    const userB = 'student-race-user-b';
    creditCoins(userA, 100);
    creditCoins(userB, 100);

    const now = Date.now();
    // Offer with exactly 1 single token remaining
    const singleOffer = engine.createPartnerOffer({
      partnerName: 'Exclusive Masterclass Partner',
      title: 'Solo VIP Pass',
      description: 'Only 1 seat available.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 5 * 24 * 60 * 60 * 1000,
      totalLimit: 1,
      perUserLimit: 1,
      termsAndConditions: 'Single seat voucher.',
      redemptionInstructions: 'Join online meeting portal.',
      initialTokens: ['SOLO-PASS-VIP-999'],
    });

    // Both users fire redemption at the same moment
    const [raceA, raceB] = await Promise.all([
      Promise.resolve().then(() => engine.redeemPartnerOffer({ userId: userA, offerId: singleOffer.id })),
      Promise.resolve().then(() => engine.redeemPartnerOffer({ userId: userB, offerId: singleOffer.id })),
    ]);

    const successes = [raceA, raceB].filter((r) => r.success);
    const failures = [raceA, raceB].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].outOfStock).toBe(true);

    // Total coins spent across both users is exactly 100, never 200
    const totalSpent =
      engine.getBalance(userA).lifetimeSpent + engine.getBalance(userB).lifetimeSpent;
    expect(totalSpent).toBe(100);

    // The single token was assigned to exactly one user
    const tokensInDb = database.db
      .prepare("SELECT * FROM partner_offer_tokens WHERE offer_id = ? AND status = 'claimed'")
      .all(singleOffer.id);
    expect(tokensInDb).toHaveLength(1);
  });

  it('6. rejects unauthorized administrator attempts with 403 Forbidden', async () => {
    // Call admin route without valid admin key
    const resNoKey = await handleCoinsApiRequest(
      'POST',
      '/api/admin/partner-offers',
      { 'content-type': 'application/json' },
      {
        partnerName: 'Hacker Partner',
        title: 'Fake Offer',
        description: 'Unauthorized',
        startDate: Date.now(),
        endDate: Date.now() + 10000,
        termsAndConditions: 'Terms',
        redemptionInstructions: 'Instructions',
      },
      engine
    );

    expect(resNoKey.status).toBe(403);
    expect((resNoKey.body as { error: string }).error).toContain('Administrator credentials required');

    // Call admin route with wrong key
    const resWrongKey = await handleCoinsApiRequest(
      'POST',
      '/api/admin/partner-offers',
      { 'x-doflow-admin-key': 'wrong-secret-key' },
      { title: 'Fake' },
      engine
    );

    expect(resWrongKey.status).toBe(403);
  });

  it('7. preserves strict coupon code privacy between different users', () => {
    const userA = 'student-alice-privacy';
    const userB = 'student-bob-privacy';
    creditCoins(userA, 100);
    creditCoins(userB, 100);

    const now = Date.now();
    const offer = engine.createPartnerOffer({
      partnerName: 'Academic Software Suite',
      title: 'Cloud Compute Voucher',
      description: 'Private student API credit.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 30 * 24 * 60 * 60 * 1000,
      termsAndConditions: 'Confidential activation code.',
      redemptionInstructions: 'Enter code in console.',
      initialTokens: ['SECRET-TOKEN-FOR-ALICE', 'SECRET-TOKEN-FOR-BOB'],
    });

    // Alice redeems
    const resA = engine.redeemPartnerOffer({ userId: userA, offerId: offer.id });
    expect(resA.success).toBe(true);
    expect(resA.redemption?.tokenCode).toBe('SECRET-TOKEN-FOR-ALICE');

    // Bob inspects his redemptions
    const bobRedemptions = engine.getUserPartnerRedemptions(userB);
    expect(bobRedemptions).toHaveLength(0);

    // Public offers catalogue never exposes token codes
    const publicOffers = engine.getPartnerOffers(false);
    const pubOffer = publicOffers.find((o) => o.id === offer.id);
    expect(JSON.stringify(pubOffer)).not.toContain('SECRET-TOKEN-FOR-ALICE');
    expect(JSON.stringify(pubOffer)).not.toContain('SECRET-TOKEN-FOR-BOB');
  });

  it('8. allows authorized administrators to manage offer lifecycle and add tokens', () => {
    const now = Date.now();
    const offer = engine.createPartnerOffer({
      partnerName: 'Student Printing Hub',
      title: 'Free Thesis Printing Pass',
      description: 'Full binding and printing.',
      coinCost: 100,
      startDate: now - 1000,
      endDate: now + 20 * 24 * 60 * 60 * 1000,
      status: 'active',
      termsAndConditions: 'One thesis per student.',
      redemptionInstructions: 'Visit desk 4.',
      initialTokens: [], // Starts out of stock with 0 tokens
    });

    // Admin pauses the offer
    const paused = engine.updatePartnerOffer(offer.id, { status: 'paused' });
    expect(paused.status).toBe('paused');

    // Admin adds verified tokens
    const result = engine.addPartnerOfferTokens(offer.id, ['PRINT-TOKEN-A', 'PRINT-TOKEN-B']);
    expect(result.countAdded).toBe(2);

    // Admin reactivates offer
    const active = engine.updatePartnerOffer(offer.id, { status: 'active' });
    expect(active.status).toBe('active');
    expect(active.availableTokensCount).toBe(2);
  });
});
