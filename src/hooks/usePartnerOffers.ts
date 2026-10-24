import { useCallback, useEffect, useState } from 'react';
import type {
  CreatePartnerOfferInput,
  PartnerOffer,
  UpdatePartnerOfferInput,
  UserPartnerRedemptionRecord,
} from '../types/coins';
import { coinApi } from '../services/coinApi';

export interface UsePartnerOffersOptions {
  userId?: string;
  onRedeemSuccess?: () => void;
}

export interface UsePartnerOffersReturn {
  offers: PartnerOffer[];
  userRedemptions: UserPartnerRedemptionRecord[];
  isLoading: boolean;
  isRedeemingId: string | null;
  error: string | null;
  clearError: () => void;
  redeemedSuccessRecord: UserPartnerRedemptionRecord | null;
  closeSuccessModal: () => void;
  redeemPartnerOffer: (offerId: string) => Promise<boolean>;
  refreshOffers: () => Promise<void>;
  refreshUserRedemptions: () => Promise<void>;
  getUserRedemptionCount: (offerId: string) => number;
  getUserRedeemedCode: (offerId: string) => string | null;
  // Admin capabilities
  adminKey: string;
  setAdminKey: (key: string) => void;
  adminOffers: PartnerOffer[];
  isLoadingAdmin: boolean;
  loadAdminOffers: (key?: string) => Promise<boolean>;
  createOfferAsAdmin: (input: CreatePartnerOfferInput) => Promise<boolean>;
  updateOfferAsAdmin: (offerId: string, input: UpdatePartnerOfferInput) => Promise<boolean>;
  addTokensAsAdmin: (offerId: string, tokens: string[]) => Promise<boolean>;
}

export function usePartnerOffers({
  userId,
  onRedeemSuccess,
}: UsePartnerOffersOptions = {}): UsePartnerOffersReturn {
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [userRedemptions, setUserRedemptions] = useState<UserPartnerRedemptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRedeemingId, setIsRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemedSuccessRecord, setRedeemedSuccessRecord] =
    useState<UserPartnerRedemptionRecord | null>(null);

  // Admin state
  const [adminKey, setAdminKey] = useState<string>('doflow-admin-secret-2026');
  const [adminOffers, setAdminOffers] = useState<PartnerOffer[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);

  // User switching sync
  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    if (!userId) {
      setUserRedemptions([]);
    }
  }

  // Load public partner offers and student redemptions asynchronously
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      coinApi.getPartnerOffers(),
      userId
        ? coinApi.getUserPartnerRedemptions(userId)
        : Promise.resolve({ success: true, redemptions: [] }),
    ])
      .then(([offersRes, redemptionsRes]) => {
        if (!isMounted) return;
        if (offersRes.success && offersRes.offers) {
          setOffers(offersRes.offers);
        }
        if (redemptionsRes.success && redemptionsRes.redemptions) {
          setUserRedemptions(redemptionsRes.redemptions);
        } else {
          setUserRedemptions([]);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load partner offers';
        setError(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const refreshOffers = useCallback(async () => {
    try {
      const res = await coinApi.getPartnerOffers();
      if (res.success && res.offers) {
        setOffers(res.offers);
      }
    } catch {
      // Safe no-op on failure
    }
  }, []);

  const refreshUserRedemptions = useCallback(async () => {
    if (!userId) {
      setUserRedemptions([]);
      return;
    }
    try {
      const res = await coinApi.getUserPartnerRedemptions(userId);
      if (res.success && res.redemptions) {
        setUserRedemptions(res.redemptions);
      }
    } catch {
      // Safe no-op on failure
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeSuccessModal = useCallback(() => {
    setRedeemedSuccessRecord(null);
  }, []);

  const getUserRedemptionCount = useCallback(
    (offerId: string): number => {
      return userRedemptions.filter(
        (r) => r.offerId === offerId && r.status === 'fulfilled'
      ).length;
    },
    [userRedemptions]
  );

  const getUserRedeemedCode = useCallback(
    (offerId: string): string | null => {
      const record = userRedemptions.find(
        (r) => r.offerId === offerId && r.status === 'fulfilled' && r.tokenCode
      );
      return record?.tokenCode ?? null;
    },
    [userRedemptions]
  );

  const redeemPartnerOffer = useCallback(
    async (offerId: string): Promise<boolean> => {
      if (isRedeemingId !== null) {
        return false;
      }

      if (!userId) {
        setError('Please sign in to redeem third-party partner offers.');
        return false;
      }

      setIsRedeemingId(offerId);
      setError(null);

      try {
        const res = await coinApi.redeemPartnerOffer({ userId, offerId });

        if (!res.success) {
          setError(res.error || 'Partner offer redemption failed. Zero coins were deducted.');
          return false;
        }

        if (res.redemption) {
          setRedeemedSuccessRecord(res.redemption);
          setUserRedemptions((prev) => [res.redemption!, ...prev]);
        }

        if (onRedeemSuccess) {
          onRedeemSuccess();
        }

        // Refresh offers to update remaining inventory counts
        await refreshOffers();
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error during partner redemption.';
        setError(msg);
        return false;
      } finally {
        setIsRedeemingId(null);
      }
    },
    [isRedeemingId, userId, onRedeemSuccess, refreshOffers]
  );

  // Admin Actions
  const loadAdminOffers = useCallback(
    async (key?: string): Promise<boolean> => {
      const targetKey = key || adminKey;
      if (!targetKey) {
        setError('Administrator authorization key is required.');
        return false;
      }

      setIsLoadingAdmin(true);
      setError(null);

      try {
        const res = await coinApi.getAdminPartnerOffers(targetKey);
        if (!res.success) {
          setError(res.error || 'Failed to authenticate as administrator.');
          return false;
        }

        if (res.offers) {
          setAdminOffers(res.offers);
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Admin authentication error.';
        setError(msg);
        return false;
      } finally {
        setIsLoadingAdmin(false);
      }
    },
    [adminKey]
  );

  const createOfferAsAdmin = useCallback(
    async (input: CreatePartnerOfferInput): Promise<boolean> => {
      if (!adminKey) {
        setError('Admin key is required to create offers.');
        return false;
      }

      try {
        const res = await coinApi.createAdminPartnerOffer(adminKey, input);
        if (!res.success) {
          setError(res.error || 'Failed to create partner offer.');
          return false;
        }

        await Promise.all([loadAdminOffers(adminKey), refreshOffers()]);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error creating partner offer.';
        setError(msg);
        return false;
      }
    },
    [adminKey, loadAdminOffers, refreshOffers]
  );

  const updateOfferAsAdmin = useCallback(
    async (offerId: string, input: UpdatePartnerOfferInput): Promise<boolean> => {
      if (!adminKey) {
        setError('Admin key is required to update offers.');
        return false;
      }

      try {
        const res = await coinApi.updateAdminPartnerOffer(adminKey, offerId, input);
        if (!res.success) {
          setError(res.error || 'Failed to update partner offer.');
          return false;
        }

        await Promise.all([loadAdminOffers(adminKey), refreshOffers()]);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error updating partner offer.';
        setError(msg);
        return false;
      }
    },
    [adminKey, loadAdminOffers, refreshOffers]
  );

  const addTokensAsAdmin = useCallback(
    async (offerId: string, tokens: string[]): Promise<boolean> => {
      if (!adminKey) {
        setError('Admin key is required to add tokens.');
        return false;
      }

      try {
        const res = await coinApi.addAdminPartnerOfferTokens(adminKey, offerId, tokens);
        if (!res.success) {
          setError(res.error || 'Failed to upload partner tokens.');
          return false;
        }

        await Promise.all([loadAdminOffers(adminKey), refreshOffers()]);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error uploading partner tokens.';
        setError(msg);
        return false;
      }
    },
    [adminKey, loadAdminOffers, refreshOffers]
  );

  return {
    offers,
    userRedemptions,
    isLoading,
    isRedeemingId,
    error,
    clearError,
    redeemedSuccessRecord,
    closeSuccessModal,
    redeemPartnerOffer,
    refreshOffers,
    refreshUserRedemptions,
    getUserRedemptionCount,
    getUserRedeemedCode,
    adminKey,
    setAdminKey,
    adminOffers,
    isLoadingAdmin,
    loadAdminOffers,
    createOfferAsAdmin,
    updateOfferAsAdmin,
    addTokensAsAdmin,
  };
}
