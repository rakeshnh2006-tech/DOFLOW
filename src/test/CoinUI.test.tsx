import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoinBalanceBadge } from '../components/CoinBalanceBadge';
import { CoinHistoryModal } from '../components/CoinHistoryModal';
import type { CoinTransaction } from '../types/coins';

describe('Coin UI Components', () => {
  it('renders CoinBalanceBadge with formatted balance and handles click', () => {
    const handleOpen = vi.fn();
    render(
      <CoinBalanceBadge
        balance={14}
        isAuthenticated={true}
        onOpenHistory={handleOpen}
      />
    );

    const badge = screen.getByTestId('coin-balance-badge');
    expect(badge).toBeInTheDocument();
    expect(screen.getByTestId('coin-balance-amount')).toHaveTextContent('14 DC');

    fireEvent.click(badge);
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('renders reward confirmation toast when rewardToast prop is set', () => {
    const handleClear = vi.fn();
    render(
      <CoinBalanceBadge
        balance={15}
        isAuthenticated={true}
        onOpenHistory={vi.fn()}
        rewardToast={{
          message: '+1 Doflow Coin earned! 🪙',
          coins: 1,
          id: 12345,
        }}
        onClearToast={handleClear}
      />
    );

    const toast = screen.getByTestId('coin-reward-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('+1 DC');
    expect(toast).toHaveTextContent('Doflow Coin earned');

    const closeBtn = screen.getByLabelText('Dismiss reward notification');
    fireEvent.click(closeBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders CoinHistoryModal with overview stats and transactions ledger', () => {
    const handleClose = vi.fn();
    const mockTransactions: CoinTransaction[] = [
      {
        id: 'tx-1',
        userId: 'u1',
        amount: 10,
        type: 'earned_focus',
        sessionId: 'sess-1',
        description: 'Completed 25-minute focus session (+10 DC)',
        balanceAfter: 10,
        timestamp: 1729000000000,
      },
      {
        id: 'tx-2',
        userId: 'u1',
        amount: 1,
        type: 'earned_break',
        sessionId: 'sess-2',
        description: 'Completed short break (+1 DC)',
        balanceAfter: 11,
        timestamp: 1729000100000,
      },
      {
        id: 'tx-3',
        userId: 'u1',
        amount: 2,
        type: 'earned_break',
        sessionId: 'sess-3',
        description: 'Completed long break (+2 DC)',
        balanceAfter: 13,
        timestamp: 1729000200000,
      },
    ];

    render(
      <CoinHistoryModal
        isOpen={true}
        onClose={handleClose}
        balance={13}
        lifetimeEarned={13}
        lifetimeSpent={0}
        transactions={mockTransactions}
        isAuthenticated={true}
      />
    );

    expect(screen.getByTestId('coin-history-modal')).toBeInTheDocument();
    expect(screen.getByTestId('coin-history-current-balance')).toHaveTextContent('13 DC');
    expect(screen.getByTestId('coin-history-total-earned')).toHaveTextContent('13 DC');
    expect(screen.getByTestId('coin-transactions-list')).toBeInTheDocument();
    expect(screen.getByText('Completed 25-minute focus session (+10 DC)')).toBeInTheDocument();
    expect(screen.getByText('Completed short break (+1 DC)')).toBeInTheDocument();
    expect(screen.getByText('Completed long break (+2 DC)')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-coin-history-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays empty state in CoinHistoryModal when no transactions exist', () => {
    render(
      <CoinHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        balance={0}
        lifetimeEarned={0}
        lifetimeSpent={0}
        transactions={[]}
        isAuthenticated={true}
      />
    );

    expect(screen.getByTestId('coin-history-empty')).toBeInTheDocument();
    expect(screen.getByText(/No transactions recorded yet/i)).toBeInTheDocument();
  });
});
