import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoinTransaction, TimerSessionMode } from '../types/coins';
import { coinApi } from '../services/coinApi';

export interface UseCoinsProps {
  userId?: string | null;
}

export interface UseCoinsReturn {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: CoinTransaction[];
  isLoading: boolean;
  rewardToast: { message: string; coins: number; id: number } | null;
  clearRewardToast: () => void;
  isHistoryModalOpen: boolean;
  openHistoryModal: () => void;
  closeHistoryModal: () => void;
  activeServerSessionId: string | null;
  startSession: (mode: TimerSessionMode, durationMs: number) => Promise<string | null>;
  resetSession: () => Promise<void>;
  completeSession: (mode: TimerSessionMode, durationMs: number) => Promise<void>;
  refreshCoins: () => Promise<void>;
  error: string | null;
}

export function useCoins({ userId }: UseCoinsProps): UseCoinsReturn {
  const [balance, setBalance] = useState<number>(0);
  const [lifetimeEarned, setLifetimeEarned] = useState<number>(0);
  const [lifetimeSpent, setLifetimeSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rewardToast, setRewardToast] = useState<{ message: string; coins: number; id: number } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeServerSessionId, setActiveServerSessionId] = useState<string | null>(null);

  const activeSessionRef = useRef<string | null>(null);

  const refreshCoins = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setLifetimeEarned(0);
      setLifetimeSpent(0);
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [balanceRes, transRes] = await Promise.all([
        coinApi.getBalance(userId),
        coinApi.getTransactions(userId),
      ]);

      if (balanceRes.success && balanceRes.balance) {
        setBalance(balanceRes.balance.balance);
        setLifetimeEarned(balanceRes.balance.lifetimeEarned);
        setLifetimeSpent(balanceRes.balance.lifetimeSpent);
      } else if (balanceRes.error) {
        setError(balanceRes.error);
      }

      if (transRes.success && transRes.transactions) {
        setTransactions(transRes.transactions);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh coin balance';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    if (!userId) {
      setBalance(0);
      setLifetimeEarned(0);
      setLifetimeSpent(0);
      setTransactions([]);
    }
  }

  // Sync balance when authenticated user changes
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      return;
    }

    Promise.all([coinApi.getBalance(userId), coinApi.getTransactions(userId)])
      .then(([balanceRes, transRes]) => {
        if (!isMounted) return;
        if (balanceRes.success && balanceRes.balance) {
          setBalance(balanceRes.balance.balance);
          setLifetimeEarned(balanceRes.balance.lifetimeEarned);
          setLifetimeSpent(balanceRes.balance.lifetimeSpent);
        }
        if (transRes.success && transRes.transactions) {
          setTransactions(transRes.transactions);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Auto-dismiss reward toast after 5 seconds
  useEffect(() => {
    if (rewardToast) {
      const timer = setTimeout(() => {
        setRewardToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [rewardToast]);

  const clearRewardToast = useCallback(() => {
    setRewardToast(null);
  }, []);

  const openHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(true);
    if (userId) {
      refreshCoins();
    }
  }, [refreshCoins, userId]);

  const closeHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
  }, []);

  const startSession = useCallback(
    async (mode: TimerSessionMode, durationMs: number): Promise<string | null> => {
      const sessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      activeSessionRef.current = sessionId;
      setActiveServerSessionId(sessionId);

      if (userId) {
        try {
          await coinApi.startSession({
            userId,
            mode,
            durationMs,
            sessionId,
          });
        } catch {
          // Non-blocking on start
        }
      }

      return sessionId;
    },
    [userId]
  );

  const resetSession = useCallback(async () => {
    const currentId = activeSessionRef.current;
    activeSessionRef.current = null;
    setActiveServerSessionId(null);

    if (userId && currentId) {
      try {
        await coinApi.resetSession({
          userId,
          sessionId: currentId,
          reason: 'Timer reset by user',
        });
      } catch {
        // Non-blocking
      }
    }
  }, [userId]);

  const completeSession = useCallback(
    async (mode: TimerSessionMode, durationMs: number): Promise<void> => {
      const currentId = activeSessionRef.current;
      activeSessionRef.current = null;
      setActiveServerSessionId(null);

      // Focus sessions require min 25 mins. Break sessions require positive duration.
      if (mode === 'focus' && durationMs < 25 * 60 * 1000) {
        return;
      }
      if ((mode === 'shortBreak' || mode === 'longBreak') && durationMs <= 0) {
        return;
      }

      // If user is unauthenticated, do not call coin API
      if (!userId || !currentId) {
        return;
      }

      try {
        const res = await coinApi.completeSession({
          userId,
          sessionId: currentId,
        });

        if (res.success && res.coinsAwarded > 0) {
          setBalance(res.newBalance);
          setLifetimeEarned(res.lifetimeEarned);
          setRewardToast({
            message: res.message || `+${res.coinsAwarded} Doflow Coin${res.coinsAwarded > 1 ? 's' : ''} earned! 🪙`,
            coins: res.coinsAwarded,
            id: Date.now(),
          });

          // Refresh transactions to show latest ledger entry
          refreshCoins();
        } else if (res.duplicate) {
          // Graceful handling of duplicate without error banner
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to award session coins';
        setError(msg);
      }
    },
    [refreshCoins, userId]
  );

  return {
    balance,
    lifetimeEarned,
    lifetimeSpent,
    transactions,
    isLoading,
    rewardToast,
    clearRewardToast,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
    activeServerSessionId,
    startSession,
    resetSession,
    completeSession,
    refreshCoins,
    error,
  };
}
