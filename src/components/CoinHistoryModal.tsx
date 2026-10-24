import React, { useEffect } from 'react';
import type { CoinTransaction } from '../types/coins';

export interface CoinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: CoinTransaction[];
  isAuthenticated: boolean;
  onLoginPrompt?: () => void;
}

export const CoinHistoryModal: React.FC<CoinHistoryModalProps> = ({
  isOpen,
  onClose,
  balance,
  lifetimeEarned,
  lifetimeSpent,
  transactions,
  isAuthenticated,
  onLoginPrompt,
}) => {
  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coin-history-title"
      data-testid="coin-history-modal"
      onClick={onClose}
    >
      <div
        className="modal-content coin-history-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="coin-modal-title-group">
            <span className="coin-modal-icon" aria-hidden="true">🪙</span>
            <div>
              <h2 id="coin-history-title" className="modal-title">
                Doflow Coins & Ledger
              </h2>
              <p className="coin-modal-subtitle">
                Permanent productivity currency earned through deep work.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close coins ledger modal"
            data-testid="close-coin-history-btn"
          >
            ✕
          </button>
        </div>

        {/* Balance & Stats Overview */}
        <div className="coin-stats-row">
          <div className="coin-stat-card primary">
            <span className="coin-stat-label">Current Balance</span>
            <span className="coin-stat-value" data-testid="coin-history-current-balance">
              {balance} DC
            </span>
          </div>
          <div className="coin-stat-card">
            <span className="coin-stat-label">Total Earned</span>
            <span className="coin-stat-value" data-testid="coin-history-total-earned">
              {lifetimeEarned} DC
            </span>
          </div>
          <div className="coin-stat-card">
            <span className="coin-stat-label">Total Spent</span>
            <span className="coin-stat-value" data-testid="coin-history-total-spent">
              {lifetimeSpent} DC
            </span>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="coin-auth-notice" data-testid="coin-unauthenticated-notice">
            <span className="coin-auth-icon" aria-hidden="true">ℹ️</span>
            <div>
              <strong>Sign in with Google</strong> to persist your coin balance and redeem student perks across devices.
            </div>
            {onLoginPrompt && (
              <button
                type="button"
                className="coin-auth-login-btn"
                onClick={() => {
                  onClose();
                  onLoginPrompt();
                }}
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Ledger Transaction History */}
        <div className="coin-history-section">
          <h3 className="coin-history-section-title">Append-Only Transaction Ledger</h3>

          {transactions.length === 0 ? (
            <div className="coin-history-empty" data-testid="coin-history-empty">
              <span className="coin-empty-icon" aria-hidden="true">⏳</span>
              <p className="coin-empty-text">No transactions recorded yet.</p>
              <p className="coin-empty-subtext">
                Complete an eligible 25-minute focus session to earn your first Doflow Coin!
              </p>
            </div>
          ) : (
            <div className="coin-transactions-list" data-testid="coin-transactions-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="coin-transaction-item">
                  <div className="coin-tx-left">
                    <span className="coin-tx-badge" aria-hidden="true">
                      {tx.amount > 0 ? '🟢' : '🔴'}
                    </span>
                    <div>
                      <div className="coin-tx-desc">{tx.description}</div>
                      <div className="coin-tx-meta">
                        {formatTimestamp(tx.timestamp)} • Balance after: {tx.balanceAfter} DC
                      </div>
                    </div>
                  </div>
                  <div className={`coin-tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                    {tx.amount > 0 ? `+${tx.amount} DC` : `${tx.amount} DC`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="action-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
