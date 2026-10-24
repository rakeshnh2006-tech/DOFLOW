import React from 'react';

export interface CoinBalanceBadgeProps {
  balance: number;
  isLoading?: boolean;
  isAuthenticated: boolean;
  onOpenHistory: () => void;
  rewardToast?: { message: string; coins: number; id: number } | null;
  onClearToast?: () => void;
}

export const CoinBalanceBadge: React.FC<CoinBalanceBadgeProps> = ({
  balance,
  isLoading = false,
  isAuthenticated,
  onOpenHistory,
  rewardToast,
  onClearToast,
}) => {
  return (
    <div className="coin-badge-container">
      <button
        type="button"
        className="coin-balance-badge"
        onClick={onOpenHistory}
        aria-label={`Doflow Coins: ${balance} DC. Click to view transaction history.`}
        title={
          isAuthenticated
            ? `Doflow Coins: ${balance} DC. Click to view transaction history.`
            : 'Sign in with Google to start earning Doflow Coins'
        }
        data-testid="coin-balance-badge"
      >
        <span className="coin-icon" aria-hidden="true">🪙</span>
        <span className="coin-amount" data-testid="coin-balance-amount">
          {isLoading ? '...' : `${balance} DC`}
        </span>
      </button>

      {/* Floating reward confirmation banner */}
      {rewardToast && (
        <div
          className="coin-reward-toast"
          role="status"
          aria-live="polite"
          data-testid="coin-reward-toast"
        >
          <div className="coin-reward-content">
            <span className="coin-reward-icon" aria-hidden="true">🎉</span>
            <span className="coin-reward-text">
              <strong>+{rewardToast.coins} DC</strong> — {rewardToast.message}
            </span>
          </div>
          {onClearToast && (
            <button
              type="button"
              className="coin-reward-close-btn"
              onClick={onClearToast}
              aria-label="Dismiss reward notification"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};
