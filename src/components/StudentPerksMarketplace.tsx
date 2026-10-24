import React, { useState } from 'react';
import type { ThemeMode } from '../types/settings';
import type { AuthUser } from '../types/auth';
import type { PerkCategory } from '../types/coins';
import type { UsePerksReturn } from '../hooks/usePerks';
import type { UsePartnerOffersReturn } from '../hooks/usePartnerOffers';
import { AdminPartnerOffersModal } from './AdminPartnerOffersModal';

export interface StudentPerksMarketplaceProps {
  coinBalance: number;
  isAuthenticated: boolean;
  user?: AuthUser | null;
  currentTheme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onOpenHistory: () => void;
  onNavigateToLogin: () => void;
  perksState: UsePerksReturn;
  partnerState?: UsePartnerOffersReturn;
}

export type MarketplaceTab = PerkCategory | 'all' | 'partner_offers' | 'my_vouchers';

const CATEGORIES: Array<{ key: MarketplaceTab; label: string }> = [
  { key: 'all', label: 'All Digital' },
  { key: 'themes', label: 'Themes' },
  { key: 'sounds', label: 'Sounds' },
  { key: 'badges', label: 'Badges' },
  { key: 'customization', label: 'Customization' },
  { key: 'partner_offers', label: 'Partner Offers' },
  { key: 'my_vouchers', label: 'My Vouchers' },
];

export const StudentPerksMarketplace: React.FC<StudentPerksMarketplaceProps> = ({
  coinBalance,
  isAuthenticated,
  currentTheme,
  onSetTheme,
  onOpenHistory,
  onNavigateToLogin,
  perksState,
  partnerState,
}) => {
  const {
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
    closeSuccessModal,
    redeemPerk,
    isOwned,
  } = perksState;

  // Active top-level marketplace tab
  const [activeTab, setActiveTab] = useState<MarketplaceTab>(
    (selectedCategory as MarketplaceTab) || 'all'
  );
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Calculate progress toward next 100-coin reward
  const cycleProgress = coinBalance % 100;
  const coinsNeeded = 100 - cycleProgress;
  const progressPercent = coinBalance >= 100 && cycleProgress === 0 ? 100 : cycleProgress;

  const handleTabChange = (tab: MarketplaceTab) => {
    setActiveTab(tab);
    if (tab === 'partner_offers' || tab === 'my_vouchers') {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(tab);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Filter partner offers by search query
  const filteredPartnerOffers = (partnerState?.offers || []).filter((offer) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      offer.title.toLowerCase().includes(query) ||
      offer.partnerName.toLowerCase().includes(query) ||
      offer.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="perks-view-container" data-testid="student-perks-marketplace">
      {/* Hero Header */}
      <div className="perks-hero-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="perks-hero-title">
            <span>🎓</span> Student Perks & Rewards
          </h2>

          {partnerState && (
            <button
              type="button"
              className="partner-admin-btn"
              onClick={() => setIsAdminModalOpen(true)}
              data-testid="open-admin-offers-modal"
              title="Manage Partner Offers and Voucher Inventories"
            >
              ⚙️ Partner Admin
            </button>
          )}
        </div>
        <p className="perks-hero-tagline">
          Earn 1 Doflow Coin for every verified 25-minute focus session. Redeem coins for exclusive
          themes, soundscapes, and verified third-party student partner offers.
        </p>
      </div>

      {/* Prominent Balance & Progress Card */}
      <div className="perks-balance-card" data-testid="perks-balance-card">
        <div className="perks-balance-header">
          <div className="perks-balance-info">
            <span className="perks-balance-label">Your Doflow Balance</span>
            <div className="perks-balance-amount" data-testid="perks-balance-display">
              <span aria-hidden="true">🪙</span>
              <span>{coinBalance}</span>
              <span className="perks-balance-unit">DC</span>
            </div>
          </div>

          <button
            type="button"
            className="perks-history-btn"
            onClick={onOpenHistory}
            data-testid="perks-history-button"
            aria-label="View coin transaction history"
          >
            <span>📜</span>
            <span>Transaction History</span>
          </button>
        </div>

        {/* Progress indicator toward next 100-coin reward */}
        <div className="perks-progress-box" data-testid="perks-progress-indicator">
          <div className="perks-progress-header">
            <span>Next Reward Milestone (100 DC)</span>
            <span>
              {coinBalance >= 100 && cycleProgress === 0
                ? '100 / 100 DC (Reward Available!)'
                : `${cycleProgress} / 100 DC`}
            </span>
          </div>
          <div
            className="perks-progress-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward next 100 coin reward"
          >
            <div className="perks-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="perks-progress-subtitle">
            {coinBalance >= 100 && cycleProgress === 0
              ? 'You have enough coins to redeem a 100 DC reward now!'
              : `${coinsNeeded} DC needed for your next 100-coin unlock`}
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {(error || partnerState?.error) && (
        <div className="soundscape-alert-banner" role="alert" data-testid="perks-error-banner">
          <span>{error || partnerState?.error}</span>
          <button
            type="button"
            className="btn-danger-link"
            onClick={() => {
              clearError();
              partnerState?.clearError();
            }}
            style={{ marginLeft: 'auto' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Category Filters */}
      <div className="perks-controls-bar">
        <div className="perks-search-wrap">
          <span className="perks-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="perks-search-input"
            placeholder="Search rewards & partner offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search rewards catalogue"
            data-testid="perks-search-input"
          />
        </div>

        <div className="perks-categories-group" role="tablist" aria-label="Filter by perk category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={activeTab === cat.key}
              className={`perk-category-pill ${activeTab === cat.key ? 'active' : ''}`}
              onClick={() => handleTabChange(cat.key)}
              data-testid={`category-filter-${cat.key}`}
            >
              {cat.label}
              {cat.key === 'my_vouchers' && partnerState && partnerState.userRedemptions.length > 0 && (
                <span
                  style={{
                    marginLeft: '6px',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {partnerState.userRedemptions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: MY CLAIMED PARTNER VOUCHERS */}
      {activeTab === 'my_vouchers' ? (
        <div className="my-vouchers-container" data-testid="my-vouchers-section">
          {!isAuthenticated ? (
            <div className="perks-empty-state">
              <div className="perks-empty-icon">🔒</div>
              <h3>Sign in to view your vouchers</h3>
              <p>Your claimed partner coupon codes and redemption instructions are safely tied to your account.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={onNavigateToLogin}
                style={{ marginTop: '12px' }}
              >
                Sign In With Google
              </button>
            </div>
          ) : !partnerState || partnerState.userRedemptions.length === 0 ? (
            <div className="perks-empty-state" data-testid="empty-vouchers-note">
              <div className="perks-empty-icon">🎟️</div>
              <h3>No partner vouchers claimed yet</h3>
              <p>Redeem third-party offers using Doflow Coins to view your exclusive coupon codes here.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleTabChange('partner_offers')}
                style={{ marginTop: '12px' }}
              >
                Browse Partner Offers
              </button>
            </div>
          ) : (
            <div className="perks-grid" data-testid="my-vouchers-grid">
              {partnerState.userRedemptions.map((redemption) => (
                <div key={redemption.id} className="perk-card partner-card" data-testid={`voucher-card-${redemption.id}`}>
                  <div>
                    <div className="partner-badge-header">
                      <span className="partner-org-tag">{redemption.partnerName || 'Partner Voucher'}</span>
                      <span className={`partner-status-pill ${redemption.status}`}>{redemption.status}</span>
                    </div>

                    <h3 className="perk-title">{redemption.offerTitle || 'Partner Offer Voucher'}</h3>

                    {redemption.tokenCode ? (
                      <div className="partner-code-card">
                        <span className="partner-code-label">Your Unique Coupon Code:</span>
                        <div className="partner-code-display">
                          <code data-testid={`voucher-code-${redemption.id}`}>{redemption.tokenCode}</code>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleCopyCode(redemption.tokenCode!)}
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            data-testid={`copy-voucher-btn-${redemption.id}`}
                          >
                            {copiedCode === redemption.tokenCode ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="partner-code-card" style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                        Redemption recorded. Present account confirmation at partner venue.
                      </div>
                    )}

                    <div className="partner-meta-row">
                      <span>Expires: <strong>{new Date(redemption.expirationDate).toLocaleDateString()}</strong></span>
                      <span>Claimed: {new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                    </div>

                    {redemption.redemptionInstructions && (
                      <div className="partner-terms-collapse">
                        <strong>Redemption Instructions:</strong>
                        <p style={{ marginTop: '4px' }}>{redemption.redemptionInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'partner_offers' ? (
        /* VIEW 2: PARTNER OFFERS CATALOGUE */
        <div className="partner-offers-container" data-testid="partner-offers-section">
          {filteredPartnerOffers.length === 0 ? (
            <div className="perks-empty-state" data-testid="empty-partner-offers-state">
              <div className="perks-empty-icon">🤝</div>
              <h3>No Partner Offers Available</h3>
              <p>
                Genuine student discounts and third-party offers will be displayed here as verified
                agreements are configured.
              </p>
            </div>
          ) : (
            <div className="perks-grid" data-testid="partner-offers-grid">
              {filteredPartnerOffers.map((offer) => {
                const userCount = partnerState ? partnerState.getUserRedemptionCount(offer.id) : 0;
                const hasReachedLimit = userCount >= offer.perUserLimit;
                const claimedCode = partnerState ? partnerState.getUserRedeemedCode(offer.id) : null;
                const isOutOfStock = offer.status === 'out_of_stock';
                const isExpired = offer.status === 'expired';
                const isPaused = offer.status === 'paused';
                const isPending = offer.integrationStatus === 'pending_agreement';
                const hasEnoughCoins = coinBalance >= offer.coinCost;
                const isRedeeming = partnerState?.isRedeemingId === offer.id;

                return (
                  <div key={offer.id} className="perk-card partner-card" data-testid={`partner-card-${offer.id}`}>
                    <div>
                      <div className="partner-badge-header">
                        <span className="partner-org-tag" data-testid={`partner-org-${offer.id}`}>
                          {offer.partnerName}
                        </span>
                        <span className={`partner-status-pill ${offer.status}`} data-testid={`partner-status-${offer.id}`}>
                          {isPending ? 'Pending Agreement' : offer.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 className="perk-title" data-testid={`partner-title-${offer.id}`}>
                          {offer.title}
                        </h3>
                        <span className="perk-price-pill" data-testid={`partner-cost-${offer.id}`}>
                          {offer.coinCost} DC
                        </span>
                      </div>

                      <p className="perk-description">{offer.description}</p>

                      <div className="partner-meta-row">
                        <span>
                          Valid until: <strong>{new Date(offer.endDate).toLocaleDateString()}</strong>
                        </span>
                        <span>Limit: {offer.perUserLimit} per student account</span>
                        {offer.availableTokensCount !== undefined && offer.availableTokensCount > 0 && (
                          <span>Vouchers remaining: {offer.availableTokensCount}</span>
                        )}
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setExpandedTermsId(expandedTermsId === offer.id ? null : offer.id)}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          data-testid={`terms-btn-${offer.id}`}
                        >
                          {expandedTermsId === offer.id ? 'Hide Terms & Instructions' : 'View Terms & Instructions'}
                        </button>

                        {expandedTermsId === offer.id && (
                          <div className="partner-terms-collapse" data-testid={`terms-content-${offer.id}`}>
                            <strong>Terms & Conditions:</strong>
                            <p style={{ margin: '4px 0 8px' }}>{offer.termsAndConditions}</p>
                            <strong>How to Redeem:</strong>
                            <p style={{ marginTop: '4px' }}>{offer.redemptionInstructions}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="perk-card-actions">
                      {!isAuthenticated ? (
                        <button
                          type="button"
                          className="btn-redeem-perk"
                          onClick={onNavigateToLogin}
                          data-testid={`partner-signin-btn-${offer.id}`}
                        >
                          Sign In to Redeem
                        </button>
                      ) : hasReachedLimit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-owned-status"
                            onClick={() => handleTabChange('my_vouchers')}
                            data-testid={`partner-claimed-btn-${offer.id}`}
                          >
                            ✓ Already Claimed (View Voucher)
                          </button>
                          {claimedCode && (
                            <code style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--color-accent)' }}>
                              Code: {claimedCode}
                            </code>
                          )}
                        </div>
                      ) : isPending ? (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          data-testid={`partner-pending-btn-${offer.id}`}
                        >
                          Partner Agreement Pending
                        </button>
                      ) : isExpired ? (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          data-testid={`partner-expired-btn-${offer.id}`}
                        >
                          Offer Expired
                        </button>
                      ) : isPaused ? (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          data-testid={`partner-paused-btn-${offer.id}`}
                        >
                          Offer Paused
                        </button>
                      ) : isOutOfStock ? (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          data-testid={`partner-outofstock-btn-${offer.id}`}
                        >
                          Out of Stock
                        </button>
                      ) : hasEnoughCoins ? (
                        <button
                          type="button"
                          className="btn-redeem-perk"
                          disabled={isRedeeming || Boolean(partnerState?.isRedeemingId)}
                          onClick={() => partnerState?.redeemPartnerOffer(offer.id)}
                          data-testid={`redeem-partner-btn-${offer.id}`}
                        >
                          {isRedeeming ? 'Reserving...' : `Redeem for ${offer.coinCost} DC`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          title={`Need ${offer.coinCost - coinBalance} more DC`}
                          data-testid={`insufficient-partner-btn-${offer.id}`}
                        >
                          Need {offer.coinCost - coinBalance} more DC
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 3: DIGITAL REWARDS CATALOGUE */
        <>
          {isLoading ? (
            <div className="perks-empty-state" data-testid="perks-loading">
              <div className="perks-empty-icon">⏳</div>
              <p>Loading digital perks catalogue...</p>
            </div>
          ) : filteredPerks.length === 0 ? (
            <div className="perks-empty-state" data-testid="perks-empty-state">
              <div className="perks-empty-icon">🔍</div>
              <h3>No matching rewards found</h3>
              <p>Try refining your search keyword or switching category tabs.</p>
            </div>
          ) : (
            <div className="perks-grid" data-testid="perks-catalogue-grid">
              {filteredPerks.map((perk) => {
                const owned = isOwned(perk.id);
                const isTheme = perk.category === 'themes';
                const isCurrentActiveTheme = isTheme && currentTheme === perk.assetKey;
                const hasEnoughCoins = coinBalance >= perk.coinCost;
                const isRedeeming = isRedeemingId === perk.id;

                return (
                  <div key={perk.id} className="perk-card" data-testid={`perk-card-${perk.id}`}>
                    <div>
                      <div className="perk-card-header">
                        <span
                          className={`perk-category-badge ${perk.category}`}
                          data-testid={`perk-category-${perk.id}`}
                        >
                          {perk.category}
                        </span>
                        <span className="perk-price-pill" data-testid={`perk-cost-${perk.id}`}>
                          {perk.coinCost} DC
                        </span>
                      </div>

                      <div className="perk-visual-preview">
                        <span className="perk-icon-avatar" aria-hidden="true">
                          {perk.icon}
                        </span>
                        {perk.previewColor && (
                          <div
                            className="perk-color-swatch"
                            style={{ backgroundColor: perk.previewColor }}
                            title={`Color: ${perk.previewColor}`}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <h3 className="perk-title" data-testid={`perk-title-${perk.id}`}>
                        {perk.title}
                      </h3>
                      <p className="perk-description">{perk.description}</p>
                    </div>

                    <div className="perk-card-actions">
                      {!isAuthenticated ? (
                        <button
                          type="button"
                          className="btn-redeem-perk"
                          onClick={onNavigateToLogin}
                          data-testid={`signin-btn-${perk.id}`}
                        >
                          Sign In to Redeem
                        </button>
                      ) : owned ? (
                        isTheme ? (
                          isCurrentActiveTheme ? (
                            <button
                              type="button"
                              className="btn-activate-perk active"
                              disabled
                              data-testid={`theme-active-${perk.id}`}
                            >
                              ✓ Active Theme
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-activate-perk"
                              onClick={() => onSetTheme(perk.assetKey as ThemeMode)}
                              data-testid={`theme-activate-btn-${perk.id}`}
                            >
                              Activate Theme
                            </button>
                          )
                        ) : (
                          <div className="btn-owned-status" data-testid={`owned-btn-${perk.id}`}>
                            ✓ Owned
                          </div>
                        )
                      ) : hasEnoughCoins ? (
                        <button
                          type="button"
                          className="btn-redeem-perk"
                          disabled={isRedeeming || isRedeemingId !== null}
                          onClick={() => redeemPerk(perk)}
                          data-testid={`redeem-btn-${perk.id}`}
                        >
                          {isRedeeming ? 'Redeeming...' : `Redeem for ${perk.coinCost} DC`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-insufficient-coins"
                          disabled
                          title={`You need ${perk.coinCost - coinBalance} more Doflow Coins`}
                          data-testid={`insufficient-btn-${perk.id}`}
                        >
                          Need {perk.coinCost - coinBalance} more DC
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Successful Digital Reward Confirmation Modal */}
      {successModalPerk && (
        <div className="modal-backdrop" role="presentation" data-testid="redemption-success-modal">
          <div
            className="modal-card perk-success-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perk-success-title"
          >
            <div className="perk-success-confetti-icon" aria-hidden="true">
              🎉
            </div>
            <h3 id="perk-success-title" className="perk-success-title">
              Redemption Successful!
            </h3>
            <p className="perk-success-desc">
              You unlocked <strong>{successModalPerk.title}</strong>! Your permanent digital reward has
              been securely saved to your account.
            </p>

            <div className="perk-success-details">
              <span>Price Paid:</span>
              <strong>{successModalPerk.coinCost} DC</strong>
            </div>

            <div className="perk-success-details">
              <span>Remaining Balance:</span>
              <strong>{coinBalance} DC</strong>
            </div>

            <div className="perk-success-actions">
              {successModalPerk.category === 'themes' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onSetTheme(successModalPerk.assetKey as ThemeMode);
                    closeSuccessModal();
                  }}
                  data-testid="activate-theme-success-btn"
                >
                  Activate Theme Now
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={closeSuccessModal}
                data-testid="close-success-modal-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Successful Partner Offer Confirmation Modal */}
      {partnerState?.redeemedSuccessRecord && (
        <div className="modal-backdrop" role="presentation" data-testid="partner-redemption-success-modal">
          <div
            className="modal-card perk-success-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-success-title"
          >
            <div className="perk-success-confetti-icon" aria-hidden="true">
              🎟️
            </div>
            <h3 id="partner-success-title" className="perk-success-title">
              Partner Offer Claimed!
            </h3>
            <p className="perk-success-desc">
              You redeemed <strong>{partnerState.redeemedSuccessRecord.offerTitle}</strong> from{' '}
              <strong>{partnerState.redeemedSuccessRecord.partnerName}</strong>.
            </p>

            {partnerState.redeemedSuccessRecord.tokenCode ? (
              <div className="partner-code-card" style={{ width: '100%' }}>
                <span className="partner-code-label">Your Unique Partner Coupon Code:</span>
                <div className="partner-code-display">
                  <code data-testid="partner-coupon-code">{partnerState.redeemedSuccessRecord.tokenCode}</code>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleCopyCode(partnerState.redeemedSuccessRecord!.tokenCode!)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    data-testid="copy-partner-code-btn"
                  >
                    {copiedCode === partnerState.redeemedSuccessRecord.tokenCode ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="perk-success-details">
              <span>Valid Until:</span>
              <strong>{new Date(partnerState.redeemedSuccessRecord.expirationDate).toLocaleDateString()}</strong>
            </div>

            {partnerState.redeemedSuccessRecord.redemptionInstructions && (
              <div className="partner-terms-collapse" style={{ textAlign: 'left', width: '100%' }}>
                <strong>Redemption Instructions:</strong>
                <p style={{ marginTop: '4px' }}>{partnerState.redeemedSuccessRecord.redemptionInstructions}</p>
              </div>
            )}

            <div className="perk-success-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  partnerState.closeSuccessModal();
                  handleTabChange('my_vouchers');
                }}
                data-testid="view-my-vouchers-btn"
              >
                View in My Vouchers
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={partnerState.closeSuccessModal}
                data-testid="close-partner-success-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Administrator Management Modal */}
      {partnerState && (
        <AdminPartnerOffersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          partnerState={partnerState}
        />
      )}
    </div>
  );
};
