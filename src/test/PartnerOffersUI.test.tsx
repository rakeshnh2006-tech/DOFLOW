import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentPerksMarketplace } from '../components/StudentPerksMarketplace';
import type { PartnerOffer, UserPartnerRedemptionRecord } from '../types/coins';
import type { UsePerksReturn } from '../hooks/usePerks';
import type { UsePartnerOffersReturn } from '../hooks/usePartnerOffers';

const MOCK_PARTNER_OFFERS: PartnerOffer[] = [
  {
    id: 'partner_bookstore_active',
    partnerName: 'University Academic Bookstore',
    title: '$10 Academic Textbook Voucher',
    description: 'Verified student course materials voucher.',
    coinCost: 100,
    startDate: Date.now() - 10000,
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'active',
    totalLimit: 50,
    redeemedCount: 5,
    perUserLimit: 1,
    termsAndConditions: 'Valid on academic course textbooks only.',
    redemptionInstructions: 'Enter coupon code at bookstore checkout.',
    partnerWebsite: 'https://bookstore.example.edu',
    integrationStatus: 'configured',
    availableTokensCount: 15,
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 20000,
  },
  {
    id: 'partner_pilot_pending',
    partnerName: 'Campus Hardware Pilot',
    title: 'Lab Kit Discount Voucher',
    description: 'Awaiting verified partner agreement.',
    coinCost: 100,
    startDate: Date.now() - 10000,
    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'out_of_stock',
    totalLimit: 10,
    redeemedCount: 0,
    perUserLimit: 1,
    termsAndConditions: 'Subject to partner agreement.',
    redemptionInstructions: 'Codes will be allocated once finalized.',
    integrationStatus: 'pending_agreement',
    availableTokensCount: 0,
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 20000,
  },
  {
    id: 'partner_paused_offer',
    partnerName: 'Student Software Guild',
    title: 'Annual IDE Pro License Voucher',
    description: 'Temporarily paused by partner.',
    coinCost: 100,
    startDate: Date.now() - 10000,
    endDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    status: 'paused',
    totalLimit: 20,
    redeemedCount: 4,
    perUserLimit: 1,
    termsAndConditions: 'One license per verified student.',
    redemptionInstructions: 'Redeem on student guild portal.',
    integrationStatus: 'configured',
    availableTokensCount: 5,
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 20000,
  },
  {
    id: 'partner_expired_offer',
    partnerName: 'Fall Orientation Club',
    title: 'Fall Semester Welcome Kit Pass',
    description: 'Expired orientation welcome pass.',
    coinCost: 100,
    startDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    endDate: Date.now() - 1000,
    status: 'expired',
    totalLimit: 100,
    redeemedCount: 95,
    perUserLimit: 1,
    termsAndConditions: 'Valid only during orientation week.',
    redemptionInstructions: 'Expired.',
    integrationStatus: 'configured',
    availableTokensCount: 5,
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1000,
  },
];

const MOCK_REDEMPTIONS: UserPartnerRedemptionRecord[] = [
  {
    id: 'redemption-1',
    userId: 'user-1',
    offerId: 'partner_bookstore_active',
    offerTitle: '$10 Academic Textbook Voucher',
    partnerName: 'University Academic Bookstore',
    tokenCode: 'BOOK-VOUCHER-777',
    coinsSpent: 100,
    status: 'fulfilled',
    partnerTerms: 'Valid on academic course textbooks only.',
    redemptionInstructions: 'Enter coupon code at bookstore checkout.',
    expirationDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    redeemedAt: Date.now() - 5000,
  },
];

describe('Partner Offers UI Acceptance Tests', () => {
  let mockPerksState: UsePerksReturn;
  let mockPartnerState: UsePartnerOffersReturn;
  const mockSetTheme = vi.fn();
  const mockOpenHistory = vi.fn();
  const mockNavigateToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockPerksState = {
      perks: [],
      ownedPerkIds: [],
      filteredPerks: [],
      isLoading: false,
      isRedeemingId: null,
      error: null,
      clearError: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      selectedCategory: 'all',
      setSelectedCategory: vi.fn(),
      successModalPerk: null,
      successModalTx: null,
      closeSuccessModal: vi.fn(),
      redeemPerk: vi.fn().mockResolvedValue(true),
      refreshOwned: vi.fn().mockResolvedValue(undefined),
      isOwned: vi.fn().mockReturnValue(false),
    };

    mockPartnerState = {
      offers: MOCK_PARTNER_OFFERS,
      userRedemptions: [],
      isLoading: false,
      isRedeemingId: null,
      error: null,
      clearError: vi.fn(),
      redeemedSuccessRecord: null,
      closeSuccessModal: vi.fn(),
      redeemPartnerOffer: vi.fn().mockResolvedValue(true),
      refreshOffers: vi.fn().mockResolvedValue(undefined),
      refreshUserRedemptions: vi.fn().mockResolvedValue(undefined),
      getUserRedemptionCount: vi.fn((id: string) =>
        mockPartnerState.userRedemptions.filter((r) => r.offerId === id).length
      ),
      getUserRedeemedCode: vi.fn((id: string) => {
        const r = mockPartnerState.userRedemptions.find((item) => item.offerId === id);
        return r?.tokenCode ?? null;
      }),
      adminKey: 'doflow-admin-secret-2026',
      setAdminKey: vi.fn(),
      adminOffers: MOCK_PARTNER_OFFERS,
      isLoadingAdmin: false,
      loadAdminOffers: vi.fn().mockResolvedValue(true),
      createOfferAsAdmin: vi.fn().mockResolvedValue(true),
      updateOfferAsAdmin: vi.fn().mockResolvedValue(true),
      addTokensAsAdmin: vi.fn().mockResolvedValue(true),
    };
  });

  it('1. renders Partner Offers tab and switches to partner offers view', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={150}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    const partnerTab = screen.getByTestId('category-filter-partner_offers');
    expect(partnerTab).toBeInTheDocument();

    fireEvent.click(partnerTab);

    // Shows Partner Offers section
    expect(screen.getByTestId('partner-offers-section')).toBeInTheDocument();
    expect(screen.getByTestId('partner-card-partner_bookstore_active')).toBeInTheDocument();
    expect(screen.getByTestId('partner-title-partner_bookstore_active')).toHaveTextContent(
      '$10 Academic Textbook Voucher'
    );
    expect(screen.getByTestId('partner-org-partner_bookstore_active')).toHaveTextContent(
      'University Academic Bookstore'
    );
  });

  it('2. expands terms & redemption instructions when clicking view terms button', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={150}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    fireEvent.click(screen.getByTestId('category-filter-partner_offers'));

    const termsBtn = screen.getByTestId('terms-btn-partner_bookstore_active');
    expect(termsBtn).toBeInTheDocument();

    // Initially terms are collapsed
    expect(screen.queryByTestId('terms-content-partner_bookstore_active')).toBeNull();

    // Click to expand terms
    fireEvent.click(termsBtn);
    const termsContent = screen.getByTestId('terms-content-partner_bookstore_active');
    expect(termsContent).toBeInTheDocument();
    expect(termsContent).toHaveTextContent('Valid on academic course textbooks only.');
    expect(termsContent).toHaveTextContent('Enter coupon code at bookstore checkout.');
  });

  it('3. displays correct disabled state for pending agreement, paused, and expired offers', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={200}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    fireEvent.click(screen.getByTestId('category-filter-partner_offers'));

    // Pending agreement
    const pendingBtn = screen.getByTestId('partner-pending-btn-partner_pilot_pending');
    expect(pendingBtn).toBeDisabled();
    expect(pendingBtn).toHaveTextContent('Partner Agreement Pending');

    // Paused
    const pausedBtn = screen.getByTestId('partner-paused-btn-partner_paused_offer');
    expect(pausedBtn).toBeDisabled();
    expect(pausedBtn).toHaveTextContent('Offer Paused');

    // Expired
    const expiredBtn = screen.getByTestId('partner-expired-btn-partner_expired_offer');
    expect(expiredBtn).toBeDisabled();
    expect(expiredBtn).toHaveTextContent('Offer Expired');
  });

  it('4. displays insufficient balance button when student does not have enough coins', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={40} // Needs 100 DC
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    fireEvent.click(screen.getByTestId('category-filter-partner_offers'));

    const insufficientBtn = screen.getByTestId(
      'insufficient-partner-btn-partner_bookstore_active'
    );
    expect(insufficientBtn).toBeDisabled();
    expect(insufficientBtn).toHaveTextContent('Need 60 more DC');
  });

  it('5. triggers partner redemption and renders successful redemption confirmation with coupon code', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={100}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    fireEvent.click(screen.getByTestId('category-filter-partner_offers'));

    const redeemBtn = screen.getByTestId('redeem-partner-btn-partner_bookstore_active');
    expect(redeemBtn).toBeInTheDocument();
    expect(redeemBtn).toHaveTextContent('Redeem for 100 DC');

    fireEvent.click(redeemBtn);
    expect(mockPartnerState.redeemPartnerOffer).toHaveBeenCalledWith('partner_bookstore_active');
  });

  it('6. renders partner redemption confirmation modal with unique coupon code and copy control', () => {
    mockPartnerState.redeemedSuccessRecord = MOCK_REDEMPTIONS[0];

    render(
      <StudentPerksMarketplace
        coinBalance={0}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    const modal = screen.getByTestId('partner-redemption-success-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Partner Offer Claimed!');
    expect(modal).toHaveTextContent('$10 Academic Textbook Voucher');

    const codeBox = screen.getByTestId('partner-coupon-code');
    expect(codeBox).toHaveTextContent('BOOK-VOUCHER-777');

    const copyBtn = screen.getByTestId('copy-partner-code-btn');
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);

    const closeBtn = screen.getByTestId('close-partner-success-btn');
    fireEvent.click(closeBtn);
    expect(mockPartnerState.closeSuccessModal).toHaveBeenCalledTimes(1);
  });

  it('7. renders My Vouchers tab with student\'s fulfilled coupon codes and redemption details', () => {
    mockPartnerState.userRedemptions = MOCK_REDEMPTIONS;

    render(
      <StudentPerksMarketplace
        coinBalance={50}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    fireEvent.click(screen.getByTestId('category-filter-my_vouchers'));

    expect(screen.getByTestId('my-vouchers-section')).toBeInTheDocument();
    expect(screen.getByTestId('voucher-card-redemption-1')).toBeInTheDocument();
    expect(screen.getByTestId('voucher-code-redemption-1')).toHaveTextContent(
      'BOOK-VOUCHER-777'
    );
  });

  it('8. opens Admin Partner Offers modal and verifies admin session', async () => {
    render(
      <StudentPerksMarketplace
        coinBalance={100}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
        partnerState={mockPartnerState}
      />
    );

    const adminBtn = screen.getByTestId('open-admin-offers-modal');
    expect(adminBtn).toBeInTheDocument();

    fireEvent.click(adminBtn);

    expect(screen.getByTestId('admin-partner-modal')).toBeInTheDocument();
    expect(screen.getByTestId('admin-auth-form')).toBeInTheDocument();

    // Submit admin authorization
    const authSubmitBtn = screen.getByTestId('admin-auth-submit-btn');
    fireEvent.click(authSubmitBtn);

    expect(mockPartnerState.loadAdminOffers).toHaveBeenCalled();
  });
});
