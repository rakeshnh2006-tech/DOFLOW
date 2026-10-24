import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DigitalPerk, PerkCategory, CoinTransaction } from '../types/coins';
import { coinApi } from '../services/coinApi';

export interface UsePerksOptions {
  userId?: string;
  onRedeemSuccess?: () => void;
}

export interface UsePerksReturn {
  perks: DigitalPerk[];
  ownedPerkIds: string[];
  filteredPerks: DigitalPerk[];
  isLoading: boolean;
  isRedeemingId: string | null;
  error: string | null;
  clearError: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: PerkCategory | 'all';
  setSelectedCategory: (cat: PerkCategory | 'all') => void;
  successModalPerk: DigitalPerk | null;
  successModalTx: CoinTransaction | null;
  closeSuccessModal: () => void;
  redeemPerk: (perk: DigitalPerk) => Promise<boolean>;
  refreshOwned: () => Promise<void>;
  isOwned: (perkId: string) => boolean;
}

export function usePerks({ userId, onRedeemSuccess }: UsePerksOptions = {}): UsePerksReturn {
  const [perks, setPerks] = useState<DigitalPerk[]>([]);
  const [ownedPerkIds, setOwnedPerkIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRedeemingId, setIsRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PerkCategory | 'all'>('all');
  const [successModalPerk, setSuccessModalPerk] = useState<DigitalPerk | null>(null);
  const [successModalTx, setSuccessModalTx] = useState<CoinTransaction | null>(null);

  // Sync state during render when user changes
  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    if (!userId) {
      setOwnedPerkIds([]);
    }
  }

  // Load public catalogue and user owned list asynchronously
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      coinApi.getPerks(),
      userId ? coinApi.getUserOwnedPerks(userId) : Promise.resolve({ success: true, ownedPerkIds: [] }),
    ])
      .then(([catalogueRes, ownedRes]) => {
        if (!isMounted) return;
        if (catalogueRes.success && catalogueRes.perks) {
          setPerks(catalogueRes.perks);
        }
        if (ownedRes.success && ownedRes.ownedPerkIds) {
          setOwnedPerkIds(ownedRes.ownedPerkIds);
        } else {
          setOwnedPerkIds([]);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load perks marketplace';
        setError(message);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const refreshOwned = useCallback(async () => {
    if (!userId) {
      setOwnedPerkIds([]);
      return;
    }
    const res = await coinApi.getUserOwnedPerks(userId);
    if (res.success && res.ownedPerkIds) {
      setOwnedPerkIds(res.ownedPerkIds);
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeSuccessModal = useCallback(() => {
    setSuccessModalPerk(null);
    setSuccessModalTx(null);
  }, []);

  const isOwned = useCallback(
    (perkId: string): boolean => {
      return ownedPerkIds.includes(perkId);
    },
    [ownedPerkIds]
  );

  const redeemPerk = useCallback(
    async (perk: DigitalPerk): Promise<boolean> => {
      // Guard against double clicks / concurrent calls
      if (isRedeemingId !== null) {
        return false;
      }

      if (!userId) {
        setError('Please sign in to redeem rewards.');
        return false;
      }

      if (isOwned(perk.id)) {
        setError(`You already own '${perk.title}'. Permanent rewards cannot be redeemed twice.`);
        return false;
      }

      setIsRedeemingId(perk.id);
      setError(null);

      try {
        const res = await coinApi.redeemPerk({
          userId,
          perkId: perk.id,
        });

        if (!res.success) {
          setError(res.error || 'Redemption failed. Zero coins were deducted.');
          return false;
        }

        // Successfully redeemed: persist owned in client state
        setOwnedPerkIds((prev) => (prev.includes(perk.id) ? prev : [...prev, perk.id]));
        setSuccessModalPerk(res.perk || perk);
        setSuccessModalTx(res.transaction || null);

        if (onRedeemSuccess) {
          onRedeemSuccess();
        }

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error during redemption.';
        setError(message);
        return false;
      } finally {
        setIsRedeemingId(null);
      }
    },
    [isRedeemingId, userId, isOwned, onRedeemSuccess]
  );

  // Filter catalogue by category and search term
  const filteredPerks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return perks.filter((perk) => {
      const matchesCategory =
        selectedCategory === 'all' || perk.category === selectedCategory;

      const matchesSearch =
        query.length === 0 ||
        perk.title.toLowerCase().includes(query) ||
        perk.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [perks, selectedCategory, searchQuery]);

  return {
    perks,
    ownedPerkIds,
    filteredPerks,
    isLoading,
    isRedeemingId,
    error,
    clearError,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    successModalPerk,
    successModalTx,
    closeSuccessModal,
    redeemPerk,
    refreshOwned,
    isOwned,
  };
}
