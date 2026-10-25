import React, { useState } from 'react';
import type { UsePartnerOffersReturn } from '../hooks/usePartnerOffers';
import type { CreatePartnerOfferInput, PartnerOfferStatus } from '../types/coins';

export interface AdminPartnerOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerState: UsePartnerOffersReturn;
}

export const AdminPartnerOffersModal: React.FC<AdminPartnerOffersModalProps> = ({
  isOpen,
  onClose,
  partnerState,
}) => {
  const {
    adminKey,
    setAdminKey,
    adminOffers,
    isLoadingAdmin,
    loadAdminOffers,
    createOfferAsAdmin,
    updateOfferAsAdmin,
    addTokensAsAdmin,
  } = partnerState;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [addingTokensOfferId, setAddingTokensOfferId] = useState<string | null>(null);
  const [newTokensInput, setNewTokensInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state
  const [partnerName, setPartnerName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coinCost, setCoinCost] = useState<number>(60);
  const [totalLimit, setTotalLimit] = useState<string>('');
  const [perUserLimit, setPerUserLimit] = useState<number>(1);
  const [terms, setTerms] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [initialCodes, setInitialCodes] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(30);

  if (!isOpen) return null;

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setStatusMessage(null);
    const success = await loadAdminOffers(adminKey);
    if (success) {
      setIsAuthenticated(true);
      setStatusMessage('Authenticated successfully as administrator.');
    } else {
      setAuthError('Unauthorized: Invalid administrator key.');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const now = Date.now();
    const endDate = now + durationDays * 24 * 60 * 60 * 1000;
    const tokens = initialCodes
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const input: CreatePartnerOfferInput = {
      partnerName,
      title,
      description,
      coinCost: Number(coinCost) || 60,
      startDate: now,
      endDate,
      status: tokens.length > 0 ? 'active' : 'out_of_stock',
      totalLimit: totalLimit ? Number(totalLimit) : null,
      perUserLimit: Number(perUserLimit) || 1,
      termsAndConditions: terms,
      redemptionInstructions: instructions,
      partnerWebsite: website || undefined,
      integrationStatus: 'configured',
      initialTokens: tokens,
    };

    const success = await createOfferAsAdmin(input);
    if (success) {
      setStatusMessage(`Offer '${title}' created successfully.`);
      setShowCreateForm(false);
      // Reset form
      setPartnerName('');
      setTitle('');
      setDescription('');
      setTerms('');
      setInstructions('');
      setInitialCodes('');
      setWebsite('');
    }
  };

  const handleToggleStatus = async (offerId: string, currentStatus: PartnerOfferStatus) => {
    setStatusMessage(null);
    const nextStatus: PartnerOfferStatus = currentStatus === 'active' ? 'paused' : 'active';
    const success = await updateOfferAsAdmin(offerId, { status: nextStatus });
    if (success) {
      setStatusMessage(`Offer status updated to ${nextStatus}.`);
    }
  };

  const handleAddTokensSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingTokensOfferId) return;

    const tokens = newTokensInput
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (tokens.length === 0) return;

    const success = await addTokensAsAdmin(addingTokensOfferId, tokens);
    if (success) {
      setStatusMessage(`Added ${tokens.length} tokens to offer.`);
      setAddingTokensOfferId(null);
      setNewTokensInput('');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" data-testid="admin-partner-modal">
      <div
        className="modal-card admin-partner-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h3 id="admin-title" className="modal-title">
            🔒 Partner Offers Administration
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close admin modal"
            data-testid="admin-modal-close-btn"
          >
            ✕
          </button>
        </div>

        {statusMessage && (
          <div
            className="soundscape-alert-banner"
            style={{ marginBottom: '12px', background: 'rgba(34, 197, 94, 0.15)', color: '#16A34A' }}
            role="status"
          >
            <span>✓ {statusMessage}</span>
          </div>
        )}

        {authError && (
          <div
            className="soundscape-alert-banner"
            style={{ marginBottom: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' }}
            role="alert"
          >
            <span>⚠️ {authError}</span>
          </div>
        )}

        {!isAuthenticated ? (
          <form onSubmit={handleAuthenticate} className="admin-auth-form" data-testid="admin-auth-form">
            <p className="admin-instruction" style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
              Enter your authorized Doflow administrator secret key to manage third-party offers,
              view inventory pools, and upload verified partner tokens.
            </p>
            <div className="form-group" style={{ margin: '14px 0' }}>
              <label htmlFor="admin-key-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Administrator Key:
              </label>
              <input
                id="admin-key-input"
                type="password"
                className="perks-search-input"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter administrator key..."
                style={{ marginTop: '6px' }}
                data-testid="admin-key-input"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoadingAdmin}
              data-testid="admin-auth-submit-btn"
            >
              {isLoadingAdmin ? 'Verifying...' : 'Authorize Admin Session'}
            </button>
          </form>
        ) : (
          <div className="admin-management-panel" data-testid="admin-management-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16A34A' }}>
                ✓ Admin Mode Active
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateForm(!showCreateForm)}
                data-testid="toggle-create-offer-btn"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {showCreateForm ? 'Cancel Form' : '+ Create New Partner Offer'}
              </button>
            </div>

            {showCreateForm && (
              <form
                onSubmit={handleCreateOffer}
                className="admin-create-form"
                style={{
                  background: 'var(--color-surface-subtle)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  border: 'var(--border-subtle)',
                }}
                data-testid="admin-create-offer-form"
              >
                <h4 style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 700 }}>
                  Create Verified Partner Offer
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Partner Organization:</label>
                    <input
                      type="text"
                      className="perks-search-input"
                      placeholder="e.g. University Bookstore Pilot"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      required
                      data-testid="input-partner-name"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Offer Title:</label>
                    <input
                      type="text"
                      className="perks-search-input"
                      placeholder="e.g. 25% Off Textbooks Voucher"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      data-testid="input-offer-title"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description:</label>
                  <textarea
                    className="perks-search-input"
                    rows={2}
                    placeholder="Verified offer details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    data-testid="input-offer-desc"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Coin Price (DC):</label>
                    <input
                      type="number"
                      min={1}
                      className="perks-search-input"
                      value={coinCost}
                      onChange={(e) => setCoinCost(Number(e.target.value))}
                      required
                      data-testid="input-coin-cost"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Inventory Cap:</label>
                    <input
                      type="number"
                      min={1}
                      className="perks-search-input"
                      placeholder="Leave blank for uncap"
                      value={totalLimit}
                      onChange={(e) => setTotalLimit(e.target.value)}
                      data-testid="input-total-limit"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Per Student Limit:</label>
                    <input
                      type="number"
                      min={1}
                      className="perks-search-input"
                      value={perUserLimit}
                      onChange={(e) => setPerUserLimit(Number(e.target.value))}
                      required
                      data-testid="input-per-user-limit"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Duration (Days until Expiration):</label>
                  <input
                    type="number"
                    min={1}
                    className="perks-search-input"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    data-testid="input-duration-days"
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Terms & Eligibility Conditions:</label>
                  <textarea
                    className="perks-search-input"
                    rows={2}
                    placeholder="Verified terms..."
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    required
                    data-testid="input-terms"
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Redemption Instructions:</label>
                  <textarea
                    className="perks-search-input"
                    rows={2}
                    placeholder="How student redeems at partner platform..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    required
                    data-testid="input-instructions"
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Initial Partner Coupon Codes (One per line):</label>
                  <textarea
                    className="perks-search-input"
                    rows={3}
                    placeholder="PARTNER-VOUCHER-01&#10;PARTNER-VOUCHER-02"
                    value={initialCodes}
                    onChange={(e) => setInitialCodes(e.target.value)}
                    data-testid="input-initial-codes"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  data-testid="submit-create-offer-btn"
                >
                  Create and Publish Offer
                </button>
              </form>
            )}

            {/* List of Managed Offers */}
            <div className="admin-offers-list">
              <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', fontWeight: 700 }}>
                Existing Partner Offers ({adminOffers.length})
              </h4>

              {adminOffers.map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    background: 'var(--color-surface-subtle)',
                    border: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    marginBottom: '12px',
                  }}
                  data-testid={`admin-offer-item-${offer.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706' }}>
                        {offer.partnerName}
                      </span>
                      <h5 style={{ fontSize: '1rem', fontWeight: 700, margin: '2px 0' }}>{offer.title}</h5>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        Price: {offer.coinCost} DC • Status: <strong>{offer.status}</strong> • Redeemed: {offer.redeemedCount}
                        {offer.totalLimit ? `/${offer.totalLimit}` : ''} • Available Tokens: <strong>{offer.availableTokensCount ?? 0}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleToggleStatus(offer.id, offer.status)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        data-testid={`toggle-status-btn-${offer.id}`}
                      >
                        {offer.status === 'active' ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setAddingTokensOfferId(addingTokensOfferId === offer.id ? null : offer.id)
                        }
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        data-testid={`add-tokens-btn-${offer.id}`}
                      >
                        + Add Tokens
                      </button>
                    </div>
                  </div>

                  {addingTokensOfferId === offer.id && (
                    <form onSubmit={handleAddTokensSubmit} style={{ marginTop: '12px' }}>
                      <textarea
                        className="perks-search-input"
                        rows={2}
                        placeholder="Paste new partner codes (one per line)..."
                        value={newTokensInput}
                        onChange={(e) => setNewTokensInput(e.target.value)}
                        required
                        data-testid={`tokens-input-${offer.id}`}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ marginTop: '6px', fontSize: '0.8rem', padding: '4px 12px' }}
                        data-testid={`submit-tokens-btn-${offer.id}`}
                      >
                        Upload Tokens
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
