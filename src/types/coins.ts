export type TimerSessionMode = 'focus' | 'shortBreak' | 'longBreak';

export type SessionServerStatus = 'active' | 'completed' | 'abandoned';

export type CoinTransactionType = 'earned_focus' | 'earned_break' | 'redeemed_perk' | 'adjustment';

export const DEFAULT_PERK_PRICE = 60;
export const DEFAULT_MILESTONE_DC = 60;
export const FOCUS_SESSION_COIN_REWARD = 10;
export const SHORT_BREAK_COIN_REWARD = 1;
export const LONG_BREAK_COIN_REWARD = 2;

export type PerkCategory = 'themes' | 'sounds' | 'badges' | 'customization';

export interface CoinBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: number;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CoinTransactionType;
  sessionId?: string | null;
  description: string;
  balanceAfter: number;
  timestamp: number;
}

export interface FocusSessionServerRecord {
  id: string;
  userId: string;
  mode: TimerSessionMode;
  durationMs: number;
  startedAt: number;
  expectedCompletedAt: number;
  status: SessionServerStatus;
  completedAt?: number | null;
  createdAt: number;
}

export interface DigitalPerk {
  id: string;
  title: string;
  description: string;
  category: PerkCategory;
  coinCost: number;
  assetKey: string;
  icon: string;
  previewColor?: string;
  isActive: boolean;
}

export interface UserOwnedPerkRecord {
  id: string;
  userId: string;
  perkId: string;
  coinsSpent: number;
  redeemedAt: number;
}

export interface StartSessionRequest {
  sessionId?: string;
  mode: TimerSessionMode;
  durationMs: number;
}

export interface StartSessionResponse {
  success: boolean;
  session?: FocusSessionServerRecord;
  error?: string;
}

export interface ResetSessionRequest {
  sessionId: string;
  reason?: string;
}

export interface ResetSessionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CompleteSessionRequest {
  sessionId: string;
}

export interface CompleteSessionResponse {
  success: boolean;
  coinsAwarded: number;
  newBalance: number;
  lifetimeEarned: number;
  duplicate?: boolean;
  message?: string;
  error?: string;
  transaction?: CoinTransaction;
}

export interface BalanceResponse {
  success: boolean;
  balance: CoinBalance;
  error?: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: CoinTransaction[];
  error?: string;
}

export interface PerksCatalogueResponse {
  success: boolean;
  perks: DigitalPerk[];
  error?: string;
}

export interface UserOwnedPerksResponse {
  success: boolean;
  ownedPerkIds: string[];
  error?: string;
}

export interface RedeemPerkRequest {
  perkId: string;
}

export interface RedeemPerkResponse {
  success: boolean;
  perk?: DigitalPerk;
  newBalance: number;
  transaction?: CoinTransaction;
  alreadyOwned?: boolean;
  insufficientBalance?: boolean;
  error?: string;
}

export type PartnerOfferStatus = 'active' | 'expired' | 'paused' | 'out_of_stock';
export type PartnerIntegrationStatus = 'pending_agreement' | 'configured' | 'direct_token';
export type PartnerRedemptionStatus = 'fulfilled' | 'canceled' | 'failed';

export interface PartnerOffer {
  id: string;
  partnerName: string;
  title: string;
  description: string;
  coinCost: number;
  startDate: number;
  endDate: number;
  status: PartnerOfferStatus;
  totalLimit?: number | null;
  redeemedCount: number;
  perUserLimit: number;
  termsAndConditions: string;
  redemptionInstructions: string;
  partnerWebsite?: string | null;
  integrationStatus: PartnerIntegrationStatus;
  availableTokensCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PartnerOfferToken {
  id: string;
  offerId: string;
  tokenCode: string;
  isClaimed: boolean;
  claimedByUserId?: string | null;
  claimedAt?: number | null;
  status: 'available' | 'claimed' | 'voided';
}

export interface UserPartnerRedemptionRecord {
  id: string;
  userId: string;
  offerId: string;
  offerTitle?: string;
  partnerName?: string;
  tokenCode?: string | null;
  coinsSpent: number;
  status: PartnerRedemptionStatus;
  partnerTerms: string;
  redemptionInstructions?: string;
  expirationDate: number;
  redeemedAt: number;
}

export interface PartnerOffersResponse {
  success: boolean;
  offers: PartnerOffer[];
  error?: string;
}

export interface UserPartnerRedemptionsResponse {
  success: boolean;
  redemptions: UserPartnerRedemptionRecord[];
  error?: string;
}

export interface RedeemPartnerOfferRequest {
  offerId: string;
}

export interface RedeemPartnerOfferResponse {
  success: boolean;
  redemption?: UserPartnerRedemptionRecord;
  newBalance: number;
  transaction?: CoinTransaction;
  error?: string;
  insufficientBalance?: boolean;
  alreadyRedeemedLimit?: boolean;
  outOfStock?: boolean;
  expired?: boolean;
  paused?: boolean;
  pendingAgreement?: boolean;
}

export interface CreatePartnerOfferInput {
  partnerName: string;
  title: string;
  description: string;
  coinCost?: number;
  startDate: number;
  endDate: number;
  status?: PartnerOfferStatus;
  totalLimit?: number | null;
  perUserLimit?: number;
  termsAndConditions: string;
  redemptionInstructions: string;
  partnerWebsite?: string;
  integrationStatus?: PartnerIntegrationStatus;
  initialTokens?: string[];
}

export interface UpdatePartnerOfferInput {
  partnerName?: string;
  title?: string;
  description?: string;
  coinCost?: number;
  startDate?: number;
  endDate?: number;
  status?: PartnerOfferStatus;
  totalLimit?: number | null;
  perUserLimit?: number;
  termsAndConditions?: string;
  redemptionInstructions?: string;
  partnerWebsite?: string;
  integrationStatus?: PartnerIntegrationStatus;
}

