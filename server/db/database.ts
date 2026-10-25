import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

export interface DoflowDatabase {
  db: DatabaseSync;
  close: () => void;
  runTransaction: <T>(fn: () => T) => T;
}

export function initializeDatabase(dbPath?: string): DoflowDatabase {
  const targetPath = dbPath ?? resolve(process.cwd(), 'doflow.db');
  const db = new DatabaseSync(targetPath);

  // Configure pragmas for performance and data integrity
  db.exec('PRAGMA foreign_keys = ON;');
  if (targetPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // WAL may not be supported on certain file systems, continue safely
    }
  }

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      expected_completed_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')),
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_status ON focus_sessions(user_id, status);

    CREATE TABLE IF NOT EXISTS focus_session_rewards (
      session_id TEXT PRIMARY KEY REFERENCES focus_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      coins_awarded INTEGER NOT NULL DEFAULT 1 CHECK(coins_awarded > 0),
      awarded_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rewards_user ON focus_session_rewards(user_id);

    CREATE TABLE IF NOT EXISTS coin_balances (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
      lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_earned >= 0),
      lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_spent >= 0),
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coin_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earned_focus', 'earned_break', 'redeemed_perk', 'adjustment')),
      session_id TEXT REFERENCES focus_sessions(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS perks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      coin_cost INTEGER NOT NULL DEFAULT 60 CHECK(coin_cost > 0),
      asset_key TEXT NOT NULL,
      icon TEXT NOT NULL,
      preview_color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_owned_perks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      perk_id TEXT NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
      coins_spent INTEGER NOT NULL CHECK(coins_spent >= 0),
      redeemed_at INTEGER NOT NULL,
      UNIQUE(user_id, perk_id)
    );

    CREATE INDEX IF NOT EXISTS idx_owned_perks_user ON user_owned_perks(user_id);

    CREATE TABLE IF NOT EXISTS partner_offers (
      id TEXT PRIMARY KEY,
      partner_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      coin_cost INTEGER NOT NULL DEFAULT 60 CHECK(coin_cost > 0),
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'paused', 'out_of_stock')),
      total_limit INTEGER,
      redeemed_count INTEGER NOT NULL DEFAULT 0,
      per_user_limit INTEGER NOT NULL DEFAULT 1 CHECK(per_user_limit > 0),
      terms_and_conditions TEXT NOT NULL,
      redemption_instructions TEXT NOT NULL,
      partner_website TEXT,
      integration_status TEXT NOT NULL DEFAULT 'pending_agreement' CHECK(integration_status IN ('pending_agreement', 'configured', 'direct_token')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_partner_offers_status ON partner_offers(status);

    CREATE TABLE IF NOT EXISTS partner_offer_tokens (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL REFERENCES partner_offers(id) ON DELETE CASCADE,
      token_code TEXT NOT NULL,
      is_claimed INTEGER NOT NULL DEFAULT 0,
      claimed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      claimed_at INTEGER,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'claimed', 'voided')),
      UNIQUE(offer_id, token_code)
    );

    CREATE INDEX IF NOT EXISTS idx_partner_tokens_claim ON partner_offer_tokens(offer_id, is_claimed);

    CREATE TABLE IF NOT EXISTS user_partner_redemptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offer_id TEXT NOT NULL REFERENCES partner_offers(id) ON DELETE CASCADE,
      token_id TEXT REFERENCES partner_offer_tokens(id) ON DELETE SET NULL,
      token_code TEXT,
      coins_spent INTEGER NOT NULL CHECK(coins_spent >= 0),
      status TEXT NOT NULL CHECK(status IN ('fulfilled', 'canceled', 'failed')),
      partner_terms TEXT NOT NULL,
      expiration_date INTEGER NOT NULL,
      redeemed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_partner_redemptions_user ON user_partner_redemptions(user_id, offer_id);

    -- Seed digital rewards catalogue (60 DC default, configurable)
    INSERT OR IGNORE INTO perks (id, title, description, category, coin_cost, asset_key, icon, preview_color, is_active) VALUES
    ('theme_nordic', 'Nordic Midnight Theme', 'Cool slate blue and deep midnight aesthetic designed for restful late-night focus sessions.', 'themes', 60, 'nordic', '🌌', '#0F172A', 1),
    ('theme_forest', 'Emerald Forest Theme', 'Calming deep moss and sage green environment inspired by serene woodland walks.', 'themes', 60, 'forest', '🌲', '#0E1B13', 1),
    ('theme_sunset', 'Warm Terracotta Sunset Theme', 'Rich amber, bronze, and desert terracotta palette for warm, energizing concentration.', 'themes', 60, 'sunset', '🌅', '#1C1310', 1),
    ('sound_ocean', 'Deep Ocean Waves Soundscape', 'Soothing coastal tides and gentle rolling ocean surf synthesized purely browser-native.', 'sounds', 60, 'ocean', '🌊', '#0284C7', 1),
    ('sound_campfire', 'Cozy Campfire & Embers', 'Intimate hearth crackle and warm ambient wood embers synthesized via Web Audio.', 'sounds', 60, 'campfire', '🔥', '#EA580C', 1),
    ('badge_student_scholar', 'Dean''s List Scholar Badge', 'Exclusive academic achievement flair badged on your user profile and daily planner.', 'badges', 60, 'scholar', '🎓', '#7C3AED', 1),
    ('badge_century_master', 'Master of Focus Gold Seal', 'Prestige gold seal commemorating elite dedication to deep work and distraction resistance.', 'badges', 60, 'master', '🏆', '#F59E0B', 1),
    ('custom_completion_chime', 'Zen Singing Bowl Chime', 'Resonant Tibetan singing bowl harmonic tone replacing the default completion bell.', 'customization', 60, 'zen_bowl', '🔔', '#10B981', 1);

    -- Seed pilot partner offer slot (Awaiting real partner code allocation, transparent coming-soon state)
    INSERT OR IGNORE INTO partner_offers (
      id, partner_name, title, description, coin_cost, start_date, end_date, status, total_limit, redeemed_count, per_user_limit, terms_and_conditions, redemption_instructions, partner_website, integration_status, created_at, updated_at
    ) VALUES (
      'partner_pilot_academic_bookstore',
      'Campus Academic Partner Program',
      'University Academic Supplies & Printing Voucher',
      'Verified educational discount voucher pilot for eligible student study kits and printing supplies. (Awaiting active partner code allocation).',
      60,
      1704067200000,
      1893456000000,
      'out_of_stock',
      50,
      0,
      1,
      'Valid exclusively for verified students. One voucher per student account. Offer subject to partner agreement and voucher code availability.',
      'Present unique coupon code at partner checkout once voucher codes are allocated by the administrator.',
      'https://doflow.local/partners/academic-pilot',
      'pending_agreement',
      1704067200000,
      1704067200000
    );
  `);

  // Non-destructive schema migration check for coin_transactions CHECK constraint
  try {
    const txTable = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'coin_transactions'")
      .get() as { sql: string } | undefined;
    if (txTable && !txTable.sql.includes("'earned_break'")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE coin_transactions_migrated (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('earned_focus', 'earned_break', 'redeemed_perk', 'adjustment')),
          session_id TEXT REFERENCES focus_sessions(id) ON DELETE SET NULL,
          description TEXT NOT NULL,
          balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
          timestamp INTEGER NOT NULL
        );
        INSERT INTO coin_transactions_migrated SELECT id, user_id, amount, type, session_id, description, balance_after, timestamp FROM coin_transactions;
        DROP TABLE coin_transactions;
        ALTER TABLE coin_transactions_migrated RENAME TO coin_transactions;
        CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id, timestamp DESC);
        PRAGMA foreign_keys = ON;
      `);
    }

    // Migrate existing perks with 100 coin default to 60 coin
    db.exec(`UPDATE perks SET coin_cost = 60 WHERE coin_cost = 100;`);
  } catch {
    // Graceful fallback if in read-only or early setup
  }

  const runTransaction = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // Rollback failed (e.g. connection broken)
      }
      throw error;
    }
  };

  const close = () => {
    try {
      db.close();
    } catch {
      // Safe no-op on double close
    }
  };

  return {
    db,
    close,
    runTransaction,
  };
}
