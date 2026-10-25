import { randomUUID } from 'node:crypto';
import type { DoflowDatabase } from '../db/database.js';
import type {
  CoinBalance,
  CoinTransaction,
  CoinTransactionType,
  CompleteSessionResponse,
  CreatePartnerOfferInput,
  DigitalPerk,
  FocusSessionServerRecord,
  PartnerIntegrationStatus,
  PartnerOffer,
  PartnerOfferStatus,
  PerkCategory,
  RedeemPartnerOfferResponse,
  RedeemPerkResponse,
  TimerSessionMode,
  UpdatePartnerOfferInput,
  UserPartnerRedemptionRecord,
} from '../../src/types/coins.js';

export const MIN_FOCUS_DURATION_MS = 25 * 60 * 1000; // 25 minutes = 1,500,000 ms
const CLOCK_DRIFT_TOLERANCE_MS = 10 * 1000; // 10 seconds leeway for network latency

export class CoinEngine {
  private database: DoflowDatabase;

  constructor(database: DoflowDatabase) {
    this.database = database;
  }

  /**
   * Ensures user exists in users table and has an initialized balance row.
   */
  public ensureUser(userId: string, email?: string, name?: string): void {
    const db = this.database.db;
    const now = Date.now();

    const existingUser = db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(userId) as { id: string } | undefined;

    if (!existingUser) {
      const safeEmail = email || `${userId}@doflow.local`;
      const safeName = name || 'Doflow Flow User';

      db.prepare(
        'INSERT OR IGNORE INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
      ).run(userId, safeEmail, safeName, now);

      db.prepare(
        'INSERT OR IGNORE INTO coin_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at) VALUES (?, 0, 0, 0, ?)'
      ).run(userId, now);
    }
  }

  /**
   * Registers the start of a focus session on the server.
   */
  public startSession(params: {
    userId: string;
    mode: TimerSessionMode;
    durationMs: number;
    sessionId?: string;
  }): FocusSessionServerRecord {
    const { userId, mode, durationMs, sessionId } = params;

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid authenticated userId is required to start a session');
    }

    if (!durationMs || durationMs <= 0 || !Number.isFinite(durationMs) || !Number.isInteger(durationMs)) {
      throw new Error('Duration must be a positive integer in milliseconds');
    }

    this.ensureUser(userId);

    const now = Date.now();
    const id = sessionId && sessionId.trim() ? sessionId.trim() : randomUUID();
    const expectedCompletedAt = now + durationMs;

    this.database.db
      .prepare(
        `INSERT INTO focus_sessions (
          id, user_id, mode, duration_ms, started_at, expected_completed_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
      )
      .run(id, userId, mode, durationMs, now, expectedCompletedAt, now);

    return {
      id,
      userId,
      mode,
      durationMs,
      startedAt: now,
      expectedCompletedAt,
      status: 'active',
      createdAt: now,
    };
  }

  /**
   * Abandons or resets an ongoing session. Never awards coins.
   */
  public abandonSession(params: {
    userId: string;
    sessionId: string;
    reason?: string;
  }): { success: boolean; message: string } {
    const { userId, sessionId } = params;

    const session = this.database.db
      .prepare('SELECT id, user_id, status FROM focus_sessions WHERE id = ?')
      .get(sessionId) as { id: string; user_id: string; status: string } | undefined;

    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    if (session.user_id !== userId) {
      throw new Error('Unauthorized: Session belongs to another user');
    }

    if (session.status === 'active') {
      this.database.db
        .prepare("UPDATE focus_sessions SET status = 'abandoned' WHERE id = ?")
        .run(sessionId);
    }

    return { success: true, message: 'Session abandoned with zero coins awarded' };
  }

  /**
   * Verifies and completes a session in an atomic database transaction.
   * Exactly 1 coin awarded per eligible completed 25-minute focus session.
   * Replays and duplicates return 0 coins.
   */
  public completeSession(params: {
    userId: string;
    sessionId: string;
    skipElapsedCheckForTesting?: boolean;
  }): CompleteSessionResponse {
    const { userId, sessionId, skipElapsedCheckForTesting = false } = params;

    if (!userId) {
      return {
        success: false,
        coinsAwarded: 0,
        newBalance: 0,
        lifetimeEarned: 0,
        error: 'Unauthorized: missing authentication',
      };
    }

    return this.database.runTransaction<CompleteSessionResponse>(() => {
      const db = this.database.db;

      // 1. Fetch current user balance
      const balanceRow = db
        .prepare('SELECT balance, lifetime_earned, lifetime_spent FROM coin_balances WHERE user_id = ?')
        .get(userId) as { balance: number; lifetime_earned: number; lifetime_spent: number } | undefined;

      const currentBalance = balanceRow?.balance ?? 0;
      const currentLifetime = balanceRow?.lifetime_earned ?? 0;

      // 2. Fetch session record
      const session = db
        .prepare(
          'SELECT id, user_id, mode, duration_ms, started_at, expected_completed_at, status FROM focus_sessions WHERE id = ?'
        )
        .get(sessionId) as
        | {
            id: string;
            user_id: string;
            mode: TimerSessionMode;
            duration_ms: number;
            started_at: number;
            expected_completed_at: number;
            status: string;
          }
        | undefined;

      if (!session) {
        return {
          success: false,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          error: 'Session not found or invalid',
        };
      }

      // 3. User verification: Session must belong to authenticated user
      if (session.user_id !== userId) {
        return {
          success: false,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          error: 'Forbidden: Session belongs to another user',
        };
      }

      // 4. Duplicate Check: Has this session already received a reward?
      const existingReward = db
        .prepare('SELECT session_id, coins_awarded FROM focus_session_rewards WHERE session_id = ?')
        .get(sessionId) as { session_id: string; coins_awarded: number } | undefined;

      if (existingReward) {
        return {
          success: false,
          duplicate: true,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          message: 'This focus session has already been rewarded.',
        };
      }

      // 5. Status check: Only 'active' sessions can be completed
      if (session.status === 'completed') {
        return {
          success: false,
          duplicate: true,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          message: 'This focus session has already been completed.',
        };
      }

      if (session.status === 'abandoned') {
        return {
          success: false,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          error: 'Session was abandoned or reset. Zero coins awarded.',
        };
      }

      // 6. Mode & duration checks:
      // Focus: 10 DC (min 25 min)
      // Short break: 1 DC
      // Long break: 2 DC
      let coinsToAward: number;
      let txType: CoinTransactionType;
      let txDesc: string;

      if (session.mode === 'focus') {
        if (session.duration_ms < MIN_FOCUS_DURATION_MS) {
          return {
            success: false,
            coinsAwarded: 0,
            newBalance: currentBalance,
            lifetimeEarned: currentLifetime,
            error: 'Only focus sessions of at least 25 minutes earn Doflow Coins.',
          };
        }
        coinsToAward = 10;
        txType = 'earned_focus';
        txDesc = 'Completed 25-minute focus session (+10 DC)';
      } else if (session.mode === 'shortBreak') {
        if (session.duration_ms <= 0) {
          return {
            success: false,
            coinsAwarded: 0,
            newBalance: currentBalance,
            lifetimeEarned: currentLifetime,
            error: 'Invalid short break duration.',
          };
        }
        coinsToAward = 1;
        txType = 'earned_break';
        txDesc = 'Completed short break (+1 DC)';
      } else if (session.mode === 'longBreak') {
        if (session.duration_ms <= 0) {
          return {
            success: false,
            coinsAwarded: 0,
            newBalance: currentBalance,
            lifetimeEarned: currentLifetime,
            error: 'Invalid long break duration.',
          };
        }
        coinsToAward = 2;
        txType = 'earned_break';
        txDesc = 'Completed long break (+2 DC)';
      } else {
        return {
          success: false,
          coinsAwarded: 0,
          newBalance: currentBalance,
          lifetimeEarned: currentLifetime,
          error: 'Only focus sessions and break sessions earn Doflow Coins.',
        };
      }

      // 7. Server-side elapsed time verification
      const now = Date.now();
      if (!skipElapsedCheckForTesting) {
        const elapsedMs = now - session.started_at;
        const requiredMs = session.duration_ms - CLOCK_DRIFT_TOLERANCE_MS;
        if (elapsedMs < requiredMs) {
          return {
            success: false,
            coinsAwarded: 0,
            newBalance: currentBalance,
            lifetimeEarned: currentLifetime,
            error: 'Session completed prematurely. Verified server elapsed time not met.',
          };
        }
      }

      // 8. All business validations passed: execute atomic reward
      // Update session status
      db.prepare(
        "UPDATE focus_sessions SET status = 'completed', completed_at = ? WHERE id = ?"
      ).run(now, sessionId);

      // Record reward (unique primary key on session_id prevents any duplicate insert)
      db.prepare(
        'INSERT INTO focus_session_rewards (session_id, user_id, coins_awarded, awarded_at) VALUES (?, ?, ?, ?)'
      ).run(sessionId, userId, coinsToAward, now);

      // Update coin balance atomically
      const newBalance = currentBalance + coinsToAward;
      const newLifetime = currentLifetime + coinsToAward;

      db.prepare(
        `INSERT INTO coin_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
         VALUES (?, ?, ?, 0, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           balance = balance + ?,
           lifetime_earned = lifetime_earned + ?,
           updated_at = excluded.updated_at`
      ).run(userId, newBalance, newLifetime, now, coinsToAward, coinsToAward);

      // Append transaction to immutable ledger
      const transactionId = randomUUID();
      const transaction: CoinTransaction = {
        id: transactionId,
        userId,
        amount: coinsToAward,
        type: txType,
        sessionId,
        description: txDesc,
        balanceAfter: newBalance,
        timestamp: now,
      };

      db.prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        transactionId,
        userId,
        coinsToAward,
        txType,
        sessionId,
        txDesc,
        newBalance,
        now
      );

      const successMsg =
        coinsToAward === 1
          ? 'Successfully earned 1 Doflow Coin!'
          : `Successfully earned ${coinsToAward} Doflow Coins!`;

      return {
        success: true,
        coinsAwarded: coinsToAward,
        newBalance,
        lifetimeEarned: newLifetime,
        message: successMsg,
        transaction,
      };
    });
  }

  /**
   * Retrieves verified user coin balance.
   */
  public getBalance(userId: string): CoinBalance {
    this.ensureUser(userId);

    const row = this.database.db
      .prepare('SELECT user_id, balance, lifetime_earned, lifetime_spent, updated_at FROM coin_balances WHERE user_id = ?')
      .get(userId) as
      | {
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          updated_at: number;
        }
      | undefined;

    return {
      userId,
      balance: row?.balance ?? 0,
      lifetimeEarned: row?.lifetime_earned ?? 0,
      lifetimeSpent: row?.lifetime_spent ?? 0,
      updatedAt: row?.updated_at ?? Date.now(),
    };
  }

  /**
   * Retrieves user's transaction ledger history.
   */
  public getTransactions(userId: string, limit = 50): CoinTransaction[] {
    this.ensureUser(userId);

    const rows = this.database.db
      .prepare(
        `SELECT id, user_id, amount, type, session_id, description, balance_after, timestamp
         FROM coin_transactions
         WHERE user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(userId, limit) as Array<{
      id: string;
      user_id: string;
      amount: number;
      type: 'earned_focus' | 'redeemed_perk' | 'adjustment';
      session_id: string | null;
      description: string;
      balance_after: number;
      timestamp: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      amount: r.amount,
      type: r.type,
      sessionId: r.session_id,
      description: r.description,
      balanceAfter: r.balance_after,
      timestamp: r.timestamp,
    }));
  }

  /**
   * Retrieves full catalogue of active digital perks.
   */
  public getPerksCatalogue(): DigitalPerk[] {
    const rows = this.database.db
      .prepare(
        `SELECT id, title, description, category, coin_cost, asset_key, icon, preview_color, is_active
         FROM perks
         WHERE is_active = 1
         ORDER BY coin_cost ASC, title ASC`
      )
      .all() as Array<{
        id: string;
        title: string;
        description: string;
        category: PerkCategory;
        coin_cost: number;
        asset_key: string;
        icon: string;
        preview_color: string | null;
        is_active: number;
      }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      coinCost: r.coin_cost,
      assetKey: r.asset_key,
      icon: r.icon,
      previewColor: r.preview_color || undefined,
      isActive: r.is_active === 1,
    }));
  }

  /**
   * Retrieves array of perk IDs owned by the user.
   */
  public getUserOwnedPerkIds(userId: string): string[] {
    this.ensureUser(userId);

    const rows = this.database.db
      .prepare('SELECT perk_id FROM user_owned_perks WHERE user_id = ? ORDER BY redeemed_at DESC')
      .all(userId) as Array<{ perk_id: string }>;

    return rows.map((r) => r.perk_id);
  }

  /**
   * Atomically redeems a digital reward for the user.
   */
  public redeemPerk(params: { userId: string; perkId: string }): RedeemPerkResponse {
    const { userId, perkId } = params;

    if (!userId) {
      return {
        success: false,
        newBalance: 0,
        error: 'Unauthorized: missing authentication',
      };
    }

    if (!perkId) {
      return {
        success: false,
        newBalance: 0,
        error: 'Reward perk ID is required',
      };
    }

    this.ensureUser(userId);

    return this.database.runTransaction<RedeemPerkResponse>(() => {
      const db = this.database.db;

      // 1. Fetch perk
      const perkRow = db
        .prepare(
          `SELECT id, title, description, category, coin_cost, asset_key, icon, preview_color, is_active
           FROM perks
           WHERE id = ? AND is_active = 1`
        )
        .get(perkId) as
        | {
            id: string;
            title: string;
            description: string;
            category: PerkCategory;
            coin_cost: number;
            asset_key: string;
            icon: string;
            preview_color: string | null;
            is_active: number;
          }
        | undefined;

      const balanceRow = db
        .prepare('SELECT balance, lifetime_spent FROM coin_balances WHERE user_id = ?')
        .get(userId) as { balance: number; lifetime_spent: number } | undefined;

      const currentBalance = balanceRow?.balance ?? 0;
      const currentSpent = balanceRow?.lifetime_spent ?? 0;

      if (!perkRow) {
        return {
          success: false,
          newBalance: currentBalance,
          error: `Reward '${perkId}' not found or is currently inactive.`,
        };
      }

      // 2. Ownership check: Prevent duplicate redemption of permanent rewards
      const alreadyOwned = db
        .prepare('SELECT id FROM user_owned_perks WHERE user_id = ? AND perk_id = ?')
        .get(userId, perkId) as { id: string } | undefined;

      if (alreadyOwned) {
        return {
          success: false,
          alreadyOwned: true,
          newBalance: currentBalance,
          error: `You already own '${perkRow.title}'. Permanent digital rewards cannot be claimed repeatedly.`,
        };
      }

      // 3. Balance verification
      if (currentBalance < perkRow.coin_cost) {
        return {
          success: false,
          insufficientBalance: true,
          newBalance: currentBalance,
          error: `Insufficient Doflow Coins. You have ${currentBalance} DC, but '${perkRow.title}' costs ${perkRow.coin_cost} DC.`,
        };
      }

      // 4. Atomic deduction and persistence
      const now = Date.now();
      const newBalance = currentBalance - perkRow.coin_cost;
      const newSpent = currentSpent + perkRow.coin_cost;

      // Deduct balance
      db.prepare(
        'UPDATE coin_balances SET balance = ?, lifetime_spent = ?, updated_at = ? WHERE user_id = ?'
      ).run(newBalance, newSpent, now, userId);

      // Record ownership
      const redemptionId = randomUUID();
      db.prepare(
        'INSERT INTO user_owned_perks (id, user_id, perk_id, coins_spent, redeemed_at) VALUES (?, ?, ?, ?, ?)'
      ).run(redemptionId, userId, perkId, perkRow.coin_cost, now);

      // Append transaction to immutable ledger
      const txId = randomUUID();
      const transaction: CoinTransaction = {
        id: txId,
        userId,
        amount: -perkRow.coin_cost,
        type: 'redeemed_perk',
        sessionId: null,
        description: `Redeemed ${perkRow.title}`,
        balanceAfter: newBalance,
        timestamp: now,
      };

      db.prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        txId,
        userId,
        -perkRow.coin_cost,
        'redeemed_perk',
        null,
        `Redeemed ${perkRow.title}`,
        newBalance,
        now
      );

      const perk: DigitalPerk = {
        id: perkRow.id,
        title: perkRow.title,
        description: perkRow.description,
        category: perkRow.category,
        coinCost: perkRow.coin_cost,
        assetKey: perkRow.asset_key,
        icon: perkRow.icon,
        previewColor: perkRow.preview_color || undefined,
        isActive: perkRow.is_active === 1,
      };

      return {
        success: true,
        perk,
        newBalance,
        transaction,
      };
    });
  }

  /**
   * Retrieves catalogue of partner offers with current inventory counts.
   */
  public getPartnerOffers(includeAllForAdmin = false): PartnerOffer[] {
    const db = this.database.db;
    const now = Date.now();

    // Auto-expire any active offers past their end_date
    db.prepare(
      "UPDATE partner_offers SET status = 'expired', updated_at = ? WHERE status = 'active' AND end_date < ?"
    ).run(now, now);

    const query = includeAllForAdmin
      ? `SELECT o.*,
           (SELECT COUNT(*) FROM partner_offer_tokens t WHERE t.offer_id = o.id AND t.is_claimed = 0 AND t.status = 'available') as available_tokens
         FROM partner_offers o
         ORDER BY o.created_at DESC`
      : `SELECT o.*,
           (SELECT COUNT(*) FROM partner_offer_tokens t WHERE t.offer_id = o.id AND t.is_claimed = 0 AND t.status = 'available') as available_tokens
         FROM partner_offers o
         ORDER BY o.created_at DESC`;

    const rows = db.prepare(query).all() as Array<{
      id: string;
      partner_name: string;
      title: string;
      description: string;
      coin_cost: number;
      start_date: number;
      end_date: number;
      status: PartnerOfferStatus;
      total_limit: number | null;
      redeemed_count: number;
      per_user_limit: number;
      terms_and_conditions: string;
      redemption_instructions: string;
      partner_website: string | null;
      integration_status: PartnerIntegrationStatus;
      created_at: number;
      updated_at: number;
      available_tokens: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      partnerName: r.partner_name,
      title: r.title,
      description: r.description,
      coinCost: r.coin_cost,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      totalLimit: r.total_limit ?? null,
      redeemedCount: r.redeemed_count,
      perUserLimit: r.per_user_limit,
      termsAndConditions: r.terms_and_conditions,
      redemptionInstructions: r.redemption_instructions,
      partnerWebsite: r.partner_website ?? null,
      integrationStatus: r.integration_status,
      availableTokensCount: r.available_tokens,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Retrieves user's redeemed partner offers and assigned coupon codes.
   */
  public getUserPartnerRedemptions(userId: string): UserPartnerRedemptionRecord[] {
    this.ensureUser(userId);

    const rows = this.database.db
      .prepare(
        `SELECT r.id, r.user_id, r.offer_id, r.token_code, r.coins_spent, r.status,
                r.partner_terms, r.expiration_date, r.redeemed_at,
                o.title as offer_title, o.partner_name, o.redemption_instructions
         FROM user_partner_redemptions r
         JOIN partner_offers o ON r.offer_id = o.id
         WHERE r.user_id = ?
         ORDER BY r.redeemed_at DESC`
      )
      .all(userId) as Array<{
        id: string;
        user_id: string;
        offer_id: string;
        token_code: string | null;
        coins_spent: number;
        status: 'fulfilled' | 'canceled' | 'failed';
        partner_terms: string;
        expiration_date: number;
        redeemed_at: number;
        offer_title: string;
        partner_name: string;
        redemption_instructions: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      offerId: r.offer_id,
      offerTitle: r.offer_title,
      partnerName: r.partner_name,
      tokenCode: r.token_code,
      coinsSpent: r.coins_spent,
      status: r.status,
      partnerTerms: r.partner_terms,
      redemptionInstructions: r.redemption_instructions,
      expirationDate: r.expiration_date,
      redeemedAt: r.redeemed_at,
    }));
  }

  /**
   * Atomically verifies and executes a partner offer redemption.
   */
  public redeemPartnerOffer(params: { userId: string; offerId: string }): RedeemPartnerOfferResponse {
    const { userId, offerId } = params;

    if (!userId) {
      return {
        success: false,
        newBalance: 0,
        error: 'Unauthorized: missing authentication',
      };
    }

    if (!offerId) {
      return {
        success: false,
        newBalance: 0,
        error: 'Partner offer ID is required',
      };
    }

    this.ensureUser(userId);

    return this.database.runTransaction<RedeemPartnerOfferResponse>(() => {
      const db = this.database.db;
      const now = Date.now();

      // 1. Fetch user balance
      const balanceRow = db
        .prepare('SELECT balance, lifetime_spent FROM coin_balances WHERE user_id = ?')
        .get(userId) as { balance: number; lifetime_spent: number } | undefined;

      const currentBalance = balanceRow?.balance ?? 0;
      const currentSpent = balanceRow?.lifetime_spent ?? 0;

      // 2. Fetch offer
      const offer = db
        .prepare(
          `SELECT id, partner_name, title, description, coin_cost, start_date, end_date,
                  status, total_limit, redeemed_count, per_user_limit,
                  terms_and_conditions, redemption_instructions, integration_status
           FROM partner_offers
           WHERE id = ?`
        )
        .get(offerId) as
        | {
            id: string;
            partner_name: string;
            title: string;
            description: string;
            coin_cost: number;
            start_date: number;
            end_date: number;
            status: PartnerOfferStatus;
            total_limit: number | null;
            redeemed_count: number;
            per_user_limit: number;
            terms_and_conditions: string;
            redemption_instructions: string;
            integration_status: PartnerIntegrationStatus;
          }
        | undefined;

      if (!offer) {
        return {
          success: false,
          newBalance: currentBalance,
          error: `Partner offer '${offerId}' was not found.`,
        };
      }

      // 3. Status checks
      if (offer.status === 'paused') {
        return {
          success: false,
          paused: true,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' is currently paused by the partner.`,
        };
      }

      if (offer.status === 'expired' || now > offer.end_date) {
        if (offer.status !== 'expired') {
          db.prepare("UPDATE partner_offers SET status = 'expired', updated_at = ? WHERE id = ?").run(now, offerId);
        }
        return {
          success: false,
          expired: true,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' has expired.`,
        };
      }

      if (now < offer.start_date) {
        return {
          success: false,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' is not active yet (Starts on ${new Date(offer.start_date).toLocaleDateString()}).`,
        };
      }

      if (offer.integration_status === 'pending_agreement') {
        return {
          success: false,
          pendingAgreement: true,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' is awaiting partner agreement and is not yet available for redemption.`,
        };
      }

      if (offer.status === 'out_of_stock') {
        return {
          success: false,
          outOfStock: true,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' is currently out of stock.`,
        };
      }

      // 4. Total redemption limit check
      if (offer.total_limit !== null && offer.redeemed_count >= offer.total_limit) {
        db.prepare("UPDATE partner_offers SET status = 'out_of_stock', updated_at = ? WHERE id = ?").run(now, offerId);
        return {
          success: false,
          outOfStock: true,
          newBalance: currentBalance,
          error: `Partner offer '${offer.title}' has reached its total inventory limit.`,
        };
      }

      // 5. Per-user redemption limit check
      const userRedemptions = db
        .prepare(
          "SELECT COUNT(*) as count FROM user_partner_redemptions WHERE user_id = ? AND offer_id = ? AND status = 'fulfilled'"
        )
        .get(userId, offerId) as { count: number };

      if (userRedemptions.count >= offer.per_user_limit) {
        return {
          success: false,
          alreadyRedeemedLimit: true,
          newBalance: currentBalance,
          error: `You have reached the maximum redemption limit (${offer.per_user_limit}) for '${offer.title}'.`,
        };
      }

      // 6. Balance verification
      if (currentBalance < offer.coin_cost) {
        return {
          success: false,
          insufficientBalance: true,
          newBalance: currentBalance,
          error: `Insufficient Doflow Coins. You have ${currentBalance} DC, but '${offer.title}' costs ${offer.coin_cost} DC.`,
        };
      }

      // 7. Token allocation (atomic reservation)
      // Check if this offer has tokens configured
      const tokenCount = db
        .prepare('SELECT COUNT(*) as count FROM partner_offer_tokens WHERE offer_id = ?')
        .get(offerId) as { count: number };

      if (tokenCount.count === 0) {
        db.prepare("UPDATE partner_offers SET status = 'out_of_stock', updated_at = ? WHERE id = ?").run(now, offerId);
        return {
          success: false,
          outOfStock: true,
          newBalance: currentBalance,
          error: `No coupon codes are currently available for '${offer.title}'.`,
        };
      }

      const availableToken = db
        .prepare(
          "SELECT id, token_code FROM partner_offer_tokens WHERE offer_id = ? AND is_claimed = 0 AND status = 'available' LIMIT 1"
        )
        .get(offerId) as { id: string; token_code: string } | undefined;

      if (!availableToken) {
        db.prepare("UPDATE partner_offers SET status = 'out_of_stock', updated_at = ? WHERE id = ?").run(now, offerId);
        return {
          success: false,
          outOfStock: true,
          newBalance: currentBalance,
          error: `All coupon codes for '${offer.title}' are currently out of stock.`,
        };
      }

      const allocatedTokenId = availableToken.id;
      const allocatedTokenCode = availableToken.token_code;

      // Claim token atomically
      db.prepare(
        "UPDATE partner_offer_tokens SET is_claimed = 1, claimed_by_user_id = ?, claimed_at = ?, status = 'claimed' WHERE id = ?"
      ).run(userId, now, allocatedTokenId);

      // 8. Deduct user coins atomically
      const newBalance = currentBalance - offer.coin_cost;
      const newSpent = currentSpent + offer.coin_cost;

      db.prepare(
        'UPDATE coin_balances SET balance = ?, lifetime_spent = ?, updated_at = ? WHERE user_id = ?'
      ).run(newBalance, newSpent, now, userId);

      // 9. Increment offer redeemed count and update stock if limit reached
      const newRedeemedCount = offer.redeemed_count + 1;
      let newStatus: PartnerOfferStatus = offer.status;
      if (offer.total_limit !== null && newRedeemedCount >= offer.total_limit) {
        newStatus = 'out_of_stock';
      }

      db.prepare(
        'UPDATE partner_offers SET redeemed_count = ?, status = ?, updated_at = ? WHERE id = ?'
      ).run(newRedeemedCount, newStatus, now, offerId);

      // 10. Record transaction in immutable ledger
      const txId = randomUUID();
      const transaction: CoinTransaction = {
        id: txId,
        userId,
        amount: -offer.coin_cost,
        type: 'redeemed_perk',
        sessionId: null,
        description: `Redeemed partner offer: ${offer.title}`,
        balanceAfter: newBalance,
        timestamp: now,
      };

      db.prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        txId,
        userId,
        -offer.coin_cost,
        'redeemed_perk',
        null,
        `Redeemed partner offer: ${offer.title}`,
        newBalance,
        now
      );

      // 11. Create fulfilled redemption record
      const redemptionId = randomUUID();
      const redemption: UserPartnerRedemptionRecord = {
        id: redemptionId,
        userId,
        offerId,
        offerTitle: offer.title,
        partnerName: offer.partner_name,
        tokenCode: allocatedTokenCode,
        coinsSpent: offer.coin_cost,
        status: 'fulfilled',
        partnerTerms: offer.terms_and_conditions,
        redemptionInstructions: offer.redemption_instructions,
        expirationDate: offer.end_date,
        redeemedAt: now,
      };

      db.prepare(
        `INSERT INTO user_partner_redemptions (
          id, user_id, offer_id, token_id, token_code, coins_spent, status, partner_terms, expiration_date, redeemed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        redemptionId,
        userId,
        offerId,
        allocatedTokenId,
        allocatedTokenCode,
        offer.coin_cost,
        'fulfilled',
        offer.terms_and_conditions,
        offer.end_date,
        now
      );

      return {
        success: true,
        redemption,
        newBalance,
        transaction,
      };
    });
  }

  /**
   * Admin: Creates a new partner offer with optional initial coupon tokens.
   */
  public createPartnerOffer(input: CreatePartnerOfferInput): PartnerOffer {
    const {
      partnerName,
      title,
      description,
      coinCost = 60,
      startDate,
      endDate,
      status = 'active',
      totalLimit = null,
      perUserLimit = 1,
      termsAndConditions,
      redemptionInstructions,
      partnerWebsite = null,
      integrationStatus = 'configured',
      initialTokens = [],
    } = input;

    if (!partnerName || !title || !description || !termsAndConditions || !redemptionInstructions) {
      throw new Error('All required partner offer fields must be provided.');
    }

    if (coinCost <= 0) {
      throw new Error('Coin cost must be a positive integer.');
    }

    if (endDate <= startDate) {
      throw new Error('Expiration end date must be after start date.');
    }

    const id = `offer_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = Date.now();

    return this.database.runTransaction(() => {
      this.database.db
        .prepare(
          `INSERT INTO partner_offers (
            id, partner_name, title, description, coin_cost, start_date, end_date,
            status, total_limit, redeemed_count, per_user_limit, terms_and_conditions,
            redemption_instructions, partner_website, integration_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          partnerName,
          title,
          description,
          coinCost,
          startDate,
          endDate,
          status,
          totalLimit,
          perUserLimit,
          termsAndConditions,
          redemptionInstructions,
          partnerWebsite,
          integrationStatus,
          now,
          now
        );

      if (initialTokens && initialTokens.length > 0) {
        const stmt = this.database.db.prepare(
          `INSERT OR IGNORE INTO partner_offer_tokens (
            id, offer_id, token_code, is_claimed, status
          ) VALUES (?, ?, ?, 0, 'available')`
        );
        for (const token of initialTokens) {
          if (token && token.trim()) {
            stmt.run(randomUUID(), id, token.trim());
          }
        }
      }

      return {
        id,
        partnerName,
        title,
        description,
        coinCost,
        startDate,
        endDate,
        status,
        totalLimit,
        redeemedCount: 0,
        perUserLimit,
        termsAndConditions,
        redemptionInstructions,
        partnerWebsite,
        integrationStatus,
        availableTokensCount: initialTokens.length,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  /**
   * Admin: Updates an existing partner offer.
   */
  public updatePartnerOffer(offerId: string, input: UpdatePartnerOfferInput): PartnerOffer {
    const existing = this.database.db
      .prepare('SELECT * FROM partner_offers WHERE id = ?')
      .get(offerId) as { id: string } | undefined;

    if (!existing) {
      throw new Error(`Partner offer '${offerId}' not found.`);
    }

    if (input.coinCost !== undefined && (input.coinCost <= 0 || !Number.isInteger(input.coinCost))) {
      throw new Error('Coin cost must be a positive integer.');
    }

    const currentDates = this.database.db
      .prepare('SELECT start_date, end_date FROM partner_offers WHERE id = ?')
      .get(offerId) as { start_date: number; end_date: number };
    const effectiveStart = input.startDate !== undefined ? input.startDate : currentDates.start_date;
    const effectiveEnd = input.endDate !== undefined ? input.endDate : currentDates.end_date;
    if (effectiveEnd <= effectiveStart) {
      throw new Error('Expiration end date must be after start date.');
    }

    const now = Date.now();
    const fields: string[] = ['updated_at = ?'];
    const values: Array<string | number | null> = [now];

    if (input.partnerName !== undefined) {
      fields.push('partner_name = ?');
      values.push(input.partnerName);
    }
    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description);
    }
    if (input.coinCost !== undefined) {
      fields.push('coin_cost = ?');
      values.push(input.coinCost);
    }
    if (input.startDate !== undefined) {
      fields.push('start_date = ?');
      values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      fields.push('end_date = ?');
      values.push(input.endDate);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }
    if (input.totalLimit !== undefined) {
      fields.push('total_limit = ?');
      values.push(input.totalLimit);
    }
    if (input.perUserLimit !== undefined) {
      fields.push('per_user_limit = ?');
      values.push(input.perUserLimit);
    }
    if (input.termsAndConditions !== undefined) {
      fields.push('terms_and_conditions = ?');
      values.push(input.termsAndConditions);
    }
    if (input.redemptionInstructions !== undefined) {
      fields.push('redemption_instructions = ?');
      values.push(input.redemptionInstructions);
    }
    if (input.partnerWebsite !== undefined) {
      fields.push('partner_website = ?');
      values.push(input.partnerWebsite);
    }
    if (input.integrationStatus !== undefined) {
      fields.push('integration_status = ?');
      values.push(input.integrationStatus);
    }

    values.push(offerId);

    this.database.db
      .prepare(`UPDATE partner_offers SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    const updated = this.getPartnerOffers(true).find((o) => o.id === offerId);
    if (!updated) {
      throw new Error(`Failed to load updated offer '${offerId}'.`);
    }
    return updated;
  }

  /**
   * Admin: Adds new verified partner coupon codes/tokens into an offer's inventory pool.
   */
  public addPartnerOfferTokens(offerId: string, tokenCodes: string[]): { countAdded: number } {
    const offer = this.database.db
      .prepare('SELECT id, status FROM partner_offers WHERE id = ?')
      .get(offerId) as { id: string; status: string } | undefined;

    if (!offer) {
      throw new Error(`Partner offer '${offerId}' not found.`);
    }

    let countAdded = 0;
    this.database.runTransaction(() => {
      const stmt = this.database.db.prepare(
        `INSERT OR IGNORE INTO partner_offer_tokens (
          id, offer_id, token_code, is_claimed, status
        ) VALUES (?, ?, ?, 0, 'available')`
      );

      for (const code of tokenCodes) {
        if (code && code.trim()) {
          const res = stmt.run(randomUUID(), offerId, code.trim());
          if (res.changes > 0) {
            countAdded++;
          }
        }
      }

      // If offer was out_of_stock and we just added tokens, restore to active only if not expired
      if (offer.status === 'out_of_stock' && countAdded > 0) {
        const now = Date.now();
        const offerDetails = this.database.db
          .prepare('SELECT end_date FROM partner_offers WHERE id = ?')
          .get(offerId) as { end_date: number } | undefined;
        if (offerDetails && now <= offerDetails.end_date) {
          this.database.db
            .prepare("UPDATE partner_offers SET status = 'active', updated_at = ? WHERE id = ?")
            .run(now, offerId);
        }
      }
    });

    return { countAdded };
  }

  /**
   * Distinguishable redemption state management:
   * Cancels a previously fulfilled partner redemption and atomically refunds coins to the user.
   */
  public cancelUserPartnerRedemption(params: {
    userId: string;
    redemptionId: string;
    reason?: string;
  }): { success: boolean; newBalance: number; error?: string } {
    const { userId, redemptionId, reason = 'Canceled partner offer redemption' } = params;

    return this.database.runTransaction(() => {
      const db = this.database.db;
      const now = Date.now();

      const redemption = db
        .prepare('SELECT id, user_id, offer_id, token_id, coins_spent, status FROM user_partner_redemptions WHERE id = ?')
        .get(redemptionId) as
        | {
            id: string;
            user_id: string;
            offer_id: string;
            token_id: string | null;
            coins_spent: number;
            status: string;
          }
        | undefined;

      if (!redemption) {
        throw new Error(`Redemption '${redemptionId}' not found.`);
      }

      if (redemption.user_id !== userId) {
        throw new Error('Unauthorized: Redemption record belongs to another user.');
      }

      if (redemption.status !== 'fulfilled') {
        throw new Error(`Redemption cannot be canceled because it is already '${redemption.status}'.`);
      }

      // 1. Mark status as 'canceled'
      db.prepare("UPDATE user_partner_redemptions SET status = 'canceled' WHERE id = ?").run(redemptionId);

      // 2. Return token to pool if one was assigned
      if (redemption.token_id) {
        db.prepare(
          "UPDATE partner_offer_tokens SET is_claimed = 0, claimed_by_user_id = NULL, claimed_at = NULL, status = 'available' WHERE id = ?"
        ).run(redemption.token_id);
      }

      // 3. Refund coins atomically
      const balanceRow = db
        .prepare('SELECT balance, lifetime_spent FROM coin_balances WHERE user_id = ?')
        .get(userId) as { balance: number; lifetime_spent: number };

      const newBalance = balanceRow.balance + redemption.coins_spent;
      const newSpent = Math.max(0, balanceRow.lifetime_spent - redemption.coins_spent);

      db.prepare('UPDATE coin_balances SET balance = ?, lifetime_spent = ?, updated_at = ? WHERE user_id = ?').run(
        newBalance,
        newSpent,
        now,
        userId
      );

      // 4. Record refund in immutable ledger
      const txId = randomUUID();
      db.prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, 'adjustment', NULL, ?, ?, ?)`
      ).run(txId, userId, redemption.coins_spent, `Refund: ${reason}`, newBalance, now);

      return {
        success: true,
        newBalance,
      };
    });
  }

  /**
   * Distinguishable redemption state management:
   * Marks a redemption as failed and refunds any deducted coins.
   */
  public failUserPartnerRedemption(params: {
    userId: string;
    redemptionId: string;
    failureReason: string;
  }): { success: boolean; newBalance: number; error?: string } {
    const { userId, redemptionId, failureReason } = params;

    return this.database.runTransaction(() => {
      const db = this.database.db;
      const now = Date.now();

      const redemption = db
        .prepare('SELECT id, user_id, offer_id, token_id, coins_spent, status FROM user_partner_redemptions WHERE id = ?')
        .get(redemptionId) as
        | {
            id: string;
            user_id: string;
            offer_id: string;
            token_id: string | null;
            coins_spent: number;
            status: string;
          }
        | undefined;

      if (!redemption) {
        throw new Error(`Redemption '${redemptionId}' not found.`);
      }

      if (redemption.user_id !== userId) {
        throw new Error('Unauthorized: Redemption record belongs to another user.');
      }

      if (redemption.status === 'failed') {
        throw new Error('Redemption is already marked as failed.');
      }

      // 1. Mark status as 'failed'
      db.prepare("UPDATE user_partner_redemptions SET status = 'failed' WHERE id = ?").run(redemptionId);

      // 2. Release token if assigned
      if (redemption.token_id) {
        db.prepare(
          "UPDATE partner_offer_tokens SET is_claimed = 0, claimed_by_user_id = NULL, claimed_at = NULL, status = 'available' WHERE id = ?"
        ).run(redemption.token_id);
      }

      // 3. Refund coins if they were deducted
      const balanceRow = db
        .prepare('SELECT balance, lifetime_spent FROM coin_balances WHERE user_id = ?')
        .get(userId) as { balance: number; lifetime_spent: number };

      const newBalance = balanceRow.balance + redemption.coins_spent;
      const newSpent = Math.max(0, balanceRow.lifetime_spent - redemption.coins_spent);

      db.prepare('UPDATE coin_balances SET balance = ?, lifetime_spent = ?, updated_at = ? WHERE user_id = ?').run(
        newBalance,
        newSpent,
        now,
        userId
      );

      // 4. Ledger record
      const txId = randomUUID();
      db.prepare(
        `INSERT INTO coin_transactions (
          id, user_id, amount, type, session_id, description, balance_after, timestamp
        ) VALUES (?, ?, ?, 'adjustment', NULL, ?, ?, ?)`
      ).run(txId, userId, redemption.coins_spent, `Failed Redemption: ${failureReason}`, newBalance, now);

      return {
        success: true,
        newBalance,
      };
    });
  }
}
