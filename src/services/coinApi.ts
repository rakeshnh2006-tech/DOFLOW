import type {
  BalanceResponse,
  CompleteSessionResponse,
  CreatePartnerOfferInput,
  PartnerOffer,
  PartnerOffersResponse,
  PerksCatalogueResponse,
  RedeemPartnerOfferResponse,
  RedeemPerkResponse,
  ResetSessionResponse,
  StartSessionResponse,
  TimerSessionMode,
  TransactionsResponse,
  UpdatePartnerOfferInput,
  UserOwnedPerksResponse,
  UserPartnerRedemptionsResponse,
} from '../types/coins';

export class CoinApiService {
  private baseUrl: string;

  constructor(baseUrl = '/api/coins') {
    this.baseUrl = baseUrl;
  }

  private getHeaders(userId?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['Authorization'] = `Bearer ${userId}`;
      headers['X-Doflow-User-Id'] = userId;
    }
    return headers;
  }

  private getAdminHeaders(adminKey: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Doflow-Admin-Key': adminKey,
    };
  }

  /**
   * Fetches the verified coin balance for the user.
   */
  async getBalance(userId: string): Promise<BalanceResponse> {
    if (!userId) {
      return {
        success: false,
        balance: {
          userId: '',
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          updatedAt: Date.now(),
        },
        error: 'Unauthenticated user',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/balance`, {
        method: 'GET',
        headers: this.getHeaders(userId),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          balance: {
            userId,
            balance: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
            updatedAt: Date.now(),
          },
          error: errorData.error || `HTTP ${res.status}: Failed to fetch balance`,
        };
      }

      const data: BalanceResponse = await res.json();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching balance';
      return {
        success: false,
        balance: {
          userId,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          updatedAt: Date.now(),
        },
        error: message,
      };
    }
  }

  /**
   * Fetches the append-only coin transactions ledger.
   */
  async getTransactions(userId: string): Promise<TransactionsResponse> {
    if (!userId) {
      return { success: false, transactions: [], error: 'Unauthenticated user' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/transactions`, {
        method: 'GET',
        headers: this.getHeaders(userId),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          transactions: [],
          error: errorData.error || `HTTP ${res.status}: Failed to fetch transactions`,
        };
      }

      const data: TransactionsResponse = await res.json();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching transactions';
      return {
        success: false,
        transactions: [],
        error: message,
      };
    }
  }

  /**
   * Registers a session start on the server.
   */
  async startSession(params: {
    userId: string;
    mode: TimerSessionMode;
    durationMs: number;
    sessionId?: string;
  }): Promise<StartSessionResponse> {
    const { userId, mode, durationMs, sessionId } = params;

    if (!userId) {
      return { success: false, error: 'Unauthenticated user' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/sessions/start`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ mode, durationMs, sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${res.status}: Failed to start session`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while starting session';
      return { success: false, error: message };
    }
  }

  /**
   * Abandons or resets an ongoing session on the server.
   */
  async resetSession(params: {
    userId: string;
    sessionId: string;
    reason?: string;
  }): Promise<ResetSessionResponse> {
    const { userId, sessionId, reason } = params;

    if (!userId || !sessionId) {
      return { success: false, error: 'User ID and Session ID required' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/sessions/reset`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ sessionId, reason }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${res.status}: Failed to reset session`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while resetting session';
      return { success: false, error: message };
    }
  }

  /**
   * Requests server-side verification and completion of an eligible focus session.
   */
  async completeSession(params: {
    userId: string;
    sessionId: string;
    skipElapsedCheckForTesting?: boolean;
  }): Promise<CompleteSessionResponse> {
    const { userId, sessionId, skipElapsedCheckForTesting } = params;

    if (!userId || !sessionId) {
      return {
        success: false,
        coinsAwarded: 0,
        newBalance: 0,
        lifetimeEarned: 0,
        error: 'User ID and Session ID required',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/sessions/complete`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ sessionId, skipElapsedCheckForTesting }),
      });

      const data: CompleteSessionResponse = await res.json().catch(() => ({
        success: false,
        coinsAwarded: 0,
        newBalance: 0,
        lifetimeEarned: 0,
        error: `HTTP ${res.status}: Failed to complete session`,
      }));

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while completing session';
      return {
        success: false,
        coinsAwarded: 0,
        newBalance: 0,
        lifetimeEarned: 0,
        error: message,
      };
    }
  }

  /**
   * Fetches the catalogue of available digital perks.
   */
  async getPerks(): Promise<PerksCatalogueResponse> {
    try {
      const res = await fetch('/api/perks', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          perks: [],
          error: errorData.error || `HTTP ${res.status}: Failed to fetch perks`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching perks catalogue';
      return { success: false, perks: [], error: message };
    }
  }

  /**
   * Fetches the array of perk IDs owned by the user.
   */
  async getUserOwnedPerks(userId: string): Promise<UserOwnedPerksResponse> {
    if (!userId) {
      return { success: false, ownedPerkIds: [], error: 'Unauthenticated user' };
    }

    try {
      const res = await fetch('/api/perks/owned', {
        method: 'GET',
        headers: this.getHeaders(userId),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          ownedPerkIds: [],
          error: errorData.error || `HTTP ${res.status}: Failed to fetch owned perks`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching owned perks';
      return { success: false, ownedPerkIds: [], error: message };
    }
  }

  /**
   * Atomically redeems a digital reward.
   */
  async redeemPerk(params: { userId: string; perkId: string }): Promise<RedeemPerkResponse> {
    const { userId, perkId } = params;

    if (!userId || !perkId) {
      return {
        success: false,
        newBalance: 0,
        error: 'User ID and Perk ID are required',
      };
    }

    try {
      const res = await fetch('/api/perks/redeem', {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ perkId }),
      });

      const data: RedeemPerkResponse = await res.json().catch(() => ({
        success: false,
        newBalance: 0,
        error: `HTTP ${res.status}: Failed to redeem perk`,
      }));

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while redeeming perk';
      return {
        success: false,
        newBalance: 0,
        error: message,
      };
    }
  }

  /**
   * Fetches public catalogue of third-party partner offers.
   */
  async getPartnerOffers(): Promise<PartnerOffersResponse> {
    try {
      const res = await fetch('/api/partner-offers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          offers: [],
          error: errorData.error || `HTTP ${res.status}: Failed to fetch partner offers`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching partner offers';
      return { success: false, offers: [], error: message };
    }
  }

  /**
   * Fetches user's redeemed partner offers and assigned coupon codes.
   */
  async getUserPartnerRedemptions(userId: string): Promise<UserPartnerRedemptionsResponse> {
    if (!userId) {
      return { success: false, redemptions: [], error: 'Unauthenticated user' };
    }

    try {
      const res = await fetch('/api/partner-offers/my-redemptions', {
        method: 'GET',
        headers: this.getHeaders(userId),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          redemptions: [],
          error: errorData.error || `HTTP ${res.status}: Failed to fetch user partner redemptions`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching user partner redemptions';
      return { success: false, redemptions: [], error: message };
    }
  }

  /**
   * Atomically redeems a third-party partner offer.
   */
  async redeemPartnerOffer(params: { userId: string; offerId: string }): Promise<RedeemPartnerOfferResponse> {
    const { userId, offerId } = params;

    if (!userId || !offerId) {
      return {
        success: false,
        newBalance: 0,
        error: 'User ID and Partner Offer ID are required',
      };
    }

    try {
      const res = await fetch('/api/partner-offers/redeem', {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ offerId }),
      });

      const data: RedeemPartnerOfferResponse = await res.json().catch(() => ({
        success: false,
        newBalance: 0,
        error: `HTTP ${res.status}: Failed to redeem partner offer`,
      }));

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while redeeming partner offer';
      return {
        success: false,
        newBalance: 0,
        error: message,
      };
    }
  }

  /**
   * Admin: Fetches complete partner offers list including private token inventories.
   */
  async getAdminPartnerOffers(adminKey: string): Promise<PartnerOffersResponse> {
    try {
      const res = await fetch('/api/admin/partner-offers', {
        method: 'GET',
        headers: this.getAdminHeaders(adminKey),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          offers: [],
          error: errorData.error || `HTTP ${res.status}: Admin request failed`,
        };
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while fetching admin partner offers';
      return { success: false, offers: [], error: message };
    }
  }

  /**
   * Admin: Creates a new partner offer.
   */
  async createAdminPartnerOffer(
    adminKey: string,
    input: CreatePartnerOfferInput
  ): Promise<{ success: boolean; offer?: PartnerOffer; error?: string }> {
    try {
      const res = await fetch('/api/admin/partner-offers', {
        method: 'POST',
        headers: this.getAdminHeaders(adminKey),
        body: JSON.stringify(input),
      });

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while creating partner offer';
      return { success: false, error: message };
    }
  }

  /**
   * Admin: Updates an existing partner offer.
   */
  async updateAdminPartnerOffer(
    adminKey: string,
    offerId: string,
    input: UpdatePartnerOfferInput
  ): Promise<{ success: boolean; offer?: PartnerOffer; error?: string }> {
    try {
      const res = await fetch(`/api/admin/partner-offers/${offerId}`, {
        method: 'PUT',
        headers: this.getAdminHeaders(adminKey),
        body: JSON.stringify(input),
      });

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while updating partner offer';
      return { success: false, error: message };
    }
  }

  /**
   * Admin: Adds verified coupon tokens into an offer's inventory pool.
   */
  async addAdminPartnerOfferTokens(
    adminKey: string,
    offerId: string,
    tokenCodes: string[]
  ): Promise<{ success: boolean; countAdded?: number; error?: string }> {
    try {
      const res = await fetch(`/api/admin/partner-offers/${offerId}/tokens`, {
        method: 'POST',
        headers: this.getAdminHeaders(adminKey),
        body: JSON.stringify({ tokenCodes }),
      });

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while adding tokens';
      return { success: false, error: message };
    }
  }
}

export const coinApi = new CoinApiService();

