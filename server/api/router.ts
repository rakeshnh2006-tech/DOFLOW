import { timingSafeEqual } from 'node:crypto';
import type { CoinEngine } from '../engine/coinEngine.js';
import type {
  BalanceResponse,
  CompleteSessionResponse,
  CreatePartnerOfferInput,
  PartnerOffersResponse,
  PerksCatalogueResponse,
  RedeemPartnerOfferResponse,
  RedeemPerkResponse,
  StartSessionResponse,
  TransactionsResponse,
  UpdatePartnerOfferInput,
  UserOwnedPerksResponse,
  UserPartnerRedemptionsResponse,
} from '../../src/types/coins.js';

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

export function getAdminSecretKey(): string | null {
  if (process.env.DOFLOW_ADMIN_KEY && process.env.DOFLOW_ADMIN_KEY.trim().length > 0) {
    return process.env.DOFLOW_ADMIN_KEY.trim();
  }
  // In non-production environments (test/dev), allow development default
  if (process.env.NODE_ENV !== 'production') {
    return 'doflow-admin-secret-2026';
  }
  return null;
}

export const DEFAULT_ADMIN_KEY = getAdminSecretKey() || '';

/**
 * Validates whether the incoming request is authorized for administrative actions.
 * Employs timing-safe string comparison to protect against side-channel timing attacks.
 */
export function isAuthorizedAdmin(headers: Record<string, string | string[] | undefined>): boolean {
  const expectedKey = getAdminSecretKey();
  if (!expectedKey) {
    return false;
  }
  const rawAdminKey = headers['x-doflow-admin-key'] || headers['X-Doflow-Admin-Key'];
  if (typeof rawAdminKey !== 'string') {
    return false;
  }
  const keyBuf = Buffer.from(rawAdminKey.trim());
  const expectedBuf = Buffer.from(expectedKey);
  if (keyBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(keyBuf, expectedBuf);
}

/**
 * Extracts and authenticates user ID from incoming request headers.
 * Supports standard Bearer token header or x-doflow-user-id.
 */
export function extractAuthUserId(headers: Record<string, string | string[] | undefined>): string | null {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) return token;
  }

  const customHeader = headers['x-doflow-user-id'] || headers['X-Doflow-User-Id'];
  if (typeof customHeader === 'string' && customHeader.trim().length > 0) {
    return customHeader.trim();
  }

  return null;
}

export async function handleCoinsApiRequest(
  method: string,
  pathname: string,
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | undefined,
  engine: CoinEngine
): Promise<ApiResponse> {
  const normalizedMethod = method.toUpperCase();

  // Public endpoint: GET /api/perks
  if (normalizedMethod === 'GET' && (pathname === '/api/perks' || pathname === '/api/perks/')) {
    try {
      const perks = engine.getPerksCatalogue();
      const resBody: PerksCatalogueResponse = {
        success: true,
        perks,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve perks';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // Public endpoint: GET /api/partner-offers
  if (normalizedMethod === 'GET' && (pathname === '/api/partner-offers' || pathname === '/api/partner-offers/')) {
    try {
      const offers = engine.getPartnerOffers(false);
      const resBody: PartnerOffersResponse = {
        success: true,
        offers,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve partner offers';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // Admin-only endpoints (/api/admin/*)
  if (pathname.startsWith('/api/admin/')) {
    if (!isAuthorizedAdmin(headers)) {
      return {
        status: 403,
        body: { success: false, error: 'Forbidden: Administrator credentials required' },
      };
    }

    // GET /api/admin/partner-offers
    if (normalizedMethod === 'GET' && (pathname === '/api/admin/partner-offers' || pathname === '/api/admin/partner-offers/')) {
      const offers = engine.getPartnerOffers(true);
      return { status: 200, body: { success: true, offers } };
    }

    // POST /api/admin/partner-offers
    if (normalizedMethod === 'POST' && (pathname === '/api/admin/partner-offers' || pathname === '/api/admin/partner-offers/')) {
      try {
        const offer = engine.createPartnerOffer(body as unknown as CreatePartnerOfferInput);
        return { status: 201, body: { success: true, offer } };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create partner offer';
        return { status: 400, body: { success: false, error: message } };
      }
    }

    // PUT /api/admin/partner-offers/:id
    const updateMatch = pathname.match(/^\/api\/admin\/partner-offers\/([^/]+)\/?$/);
    if (normalizedMethod === 'PUT' && updateMatch) {
      try {
        const offerId = updateMatch[1];
        const offer = engine.updatePartnerOffer(offerId, body as unknown as UpdatePartnerOfferInput);
        return { status: 200, body: { success: true, offer } };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update partner offer';
        return { status: 400, body: { success: false, error: message } };
      }
    }

    // POST /api/admin/partner-offers/:id/tokens
    const tokensMatch = pathname.match(/^\/api\/admin\/partner-offers\/([^/]+)\/tokens\/?$/);
    if (normalizedMethod === 'POST' && tokensMatch) {
      try {
        const offerId = tokensMatch[1];
        const tokenCodes = Array.isArray(body?.tokenCodes) ? body.tokenCodes.map(String) : [];
        const result = engine.addPartnerOfferTokens(offerId, tokenCodes);
        return { status: 200, body: { success: true, ...result } };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add tokens';
        return { status: 400, body: { success: false, error: message } };
      }
    }

    return { status: 404, body: { success: false, error: `Admin endpoint not found: ${pathname}` } };
  }

  // Authentication check for student-protected endpoints
  const userId = extractAuthUserId(headers);
  if (!userId) {
    return {
      status: 401,
      body: { success: false, error: 'Unauthorized: missing authentication credentials' },
    };
  }

  // 1. POST /api/coins/sessions/start
  if (normalizedMethod === 'POST' && (pathname === '/api/coins/sessions/start' || pathname === '/api/coins/sessions/start/')) {
    try {
      const mode = (body?.mode as 'focus' | 'shortBreak' | 'longBreak') || 'focus';
      const durationMs = Number(body?.durationMs) || 25 * 60 * 1000;
      const sessionId = body?.sessionId ? String(body.sessionId) : undefined;

      const session = engine.startSession({
        userId,
        mode,
        durationMs,
        sessionId,
      });

      const resBody: StartSessionResponse = {
        success: true,
        session,
      };

      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      return { status: 400, body: { success: false, error: message } };
    }
  }

  // 2. POST /api/coins/sessions/reset
  if (normalizedMethod === 'POST' && (pathname === '/api/coins/sessions/reset' || pathname === '/api/coins/sessions/reset/')) {
    try {
      const sessionId = String(body?.sessionId || '');
      const reason = body?.reason ? String(body.reason) : undefined;

      if (!sessionId) {
        return { status: 400, body: { success: false, error: 'sessionId is required' } };
      }

      const result = engine.abandonSession({
        userId,
        sessionId,
        reason,
      });

      return { status: 200, body: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset session';
      const status = message.includes('Unauthorized') ? 403 : 400;
      return { status, body: { success: false, error: message } };
    }
  }

  // 3. POST /api/coins/sessions/complete
  if (normalizedMethod === 'POST' && (pathname === '/api/coins/sessions/complete' || pathname === '/api/coins/sessions/complete/')) {
    try {
      const sessionId = String(body?.sessionId || '');
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
      const skipElapsedCheckForTesting = isTestEnv && Boolean(body?.skipElapsedCheckForTesting);

      if (!sessionId) {
        return { status: 400, body: { success: false, error: 'sessionId is required' } };
      }

      const result: CompleteSessionResponse = engine.completeSession({
        userId,
        sessionId,
        skipElapsedCheckForTesting,
      });

      if (!result.success && !result.duplicate) {
        const isForbidden = result.error?.includes('Forbidden') || result.error?.includes('Unauthorized');
        return { status: isForbidden ? 403 : 400, body: result };
      }

      return { status: 200, body: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete session';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 4. GET /api/coins/balance
  if (normalizedMethod === 'GET' && (pathname === '/api/coins/balance' || pathname === '/api/coins/balance/')) {
    try {
      const balance = engine.getBalance(userId);
      const resBody: BalanceResponse = {
        success: true,
        balance,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve balance';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 5. GET /api/coins/transactions
  if (normalizedMethod === 'GET' && (pathname === '/api/coins/transactions' || pathname === '/api/coins/transactions/')) {
    try {
      const transactions = engine.getTransactions(userId);
      const resBody: TransactionsResponse = {
        success: true,
        transactions,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve transactions';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 6. GET /api/perks/owned
  if (normalizedMethod === 'GET' && (pathname === '/api/perks/owned' || pathname === '/api/perks/owned/')) {
    try {
      const ownedPerkIds = engine.getUserOwnedPerkIds(userId);
      const resBody: UserOwnedPerksResponse = {
        success: true,
        ownedPerkIds,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve owned perks';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 7. POST /api/perks/redeem
  if (normalizedMethod === 'POST' && (pathname === '/api/perks/redeem' || pathname === '/api/perks/redeem/')) {
    try {
      const perkId = String(body?.perkId || '');
      if (!perkId) {
        return { status: 400, body: { success: false, error: 'perkId is required' } };
      }

      const result: RedeemPerkResponse = engine.redeemPerk({
        userId,
        perkId,
      });

      if (!result.success) {
        return { status: 400, body: result };
      }

      return { status: 200, body: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to redeem perk';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 8. GET /api/partner-offers/my-redemptions
  if (normalizedMethod === 'GET' && (pathname === '/api/partner-offers/my-redemptions' || pathname === '/api/partner-offers/my-redemptions/')) {
    try {
      const redemptions = engine.getUserPartnerRedemptions(userId);
      const resBody: UserPartnerRedemptionsResponse = {
        success: true,
        redemptions,
      };
      return { status: 200, body: resBody };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve partner redemptions';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  // 9. POST /api/partner-offers/redeem
  if (normalizedMethod === 'POST' && (pathname === '/api/partner-offers/redeem' || pathname === '/api/partner-offers/redeem/')) {
    try {
      const offerId = String(body?.offerId || '');
      if (!offerId) {
        return { status: 400, body: { success: false, error: 'offerId is required' } };
      }

      const result: RedeemPartnerOfferResponse = engine.redeemPartnerOffer({
        userId,
        offerId,
      });

      if (!result.success) {
        return { status: 400, body: result };
      }

      return { status: 200, body: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to redeem partner offer';
      return { status: 500, body: { success: false, error: message } };
    }
  }

  return {
    status: 404,
    body: { success: false, error: `Endpoint not found: ${normalizedMethod} ${pathname}` },
  };
}
