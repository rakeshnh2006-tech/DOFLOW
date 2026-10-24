import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinApiService } from '../services/coinApi';

describe('CoinApiService Client Unit Tests', () => {
  let api: CoinApiService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    api = new CoinApiService('/api/test-coins');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns default empty balance when userId is missing', async () => {
    const res = await api.getBalance('');
    expect(res.success).toBe(false);
    expect(res.balance.balance).toBe(0);
    expect(res.error).toBe('Unauthenticated user');
  });

  it('fetches balance with Authorization headers', async () => {
    const mockBalance = {
      userId: 'user-123',
      balance: 5,
      lifetimeEarned: 5,
      lifetimeSpent: 0,
      updatedAt: Date.now(),
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, balance: mockBalance }),
    } as Response);

    const res = await api.getBalance('user-123');
    expect(res.success).toBe(true);
    expect(res.balance.balance).toBe(5);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/test-coins/balance', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer user-123',
        'X-Doflow-User-Id': 'user-123',
      },
    });
  });

  it('handles server network failure gracefully without crashing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const res = await api.getBalance('user-123');
    expect(res.success).toBe(false);
    expect(res.balance.balance).toBe(0);
    expect(res.error).toContain('Network offline');
  });

  it('completes session and parses reward payload', async () => {
    const mockComplete = {
      success: true,
      coinsAwarded: 1,
      newBalance: 6,
      lifetimeEarned: 6,
      message: 'Successfully earned 1 Doflow Coin!',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComplete,
    } as Response);

    const res = await api.completeSession({
      userId: 'user-123',
      sessionId: 'sess-abc',
    });

    expect(res.success).toBe(true);
    expect(res.coinsAwarded).toBe(1);
    expect(res.newBalance).toBe(6);
  });
});
