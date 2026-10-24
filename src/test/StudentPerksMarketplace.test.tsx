import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentPerksMarketplace } from '../components/StudentPerksMarketplace';
import type { DigitalPerk } from '../types/coins';
import type { UsePerksReturn } from '../hooks/usePerks';

const MOCK_PERKS: DigitalPerk[] = [
  {
    id: 'theme_nordic',
    title: 'Nordic Midnight Theme',
    description: 'Cool slate blue and deep midnight aesthetic.',
    category: 'themes',
    coinCost: 100,
    assetKey: 'nordic',
    icon: '🌌',
    previewColor: '#0F172A',
    isActive: true,
  },
  {
    id: 'sound_ocean',
    title: 'Deep Ocean Waves',
    description: 'Soothing coastal tides and gentle surf.',
    category: 'sounds',
    coinCost: 100,
    assetKey: 'ocean',
    icon: '🌊',
    previewColor: '#0284C7',
    isActive: true,
  },
  {
    id: 'badge_student_scholar',
    title: 'Dean\'s List Scholar Badge',
    description: 'Exclusive academic flair badged on your profile.',
    category: 'badges',
    coinCost: 100,
    assetKey: 'scholar',
    icon: '🎓',
    previewColor: '#7C3AED',
    isActive: true,
  },
  {
    id: 'custom_completion_chime',
    title: 'Zen Singing Bowl Chime',
    description: 'Tibetan singing bowl tone replacing bell.',
    category: 'customization',
    coinCost: 100,
    assetKey: 'zen_bowl',
    icon: '🔔',
    previewColor: '#10B981',
    isActive: true,
  },
];

describe('StudentPerksMarketplace UI Acceptance Tests', () => {
  let mockPerksState: UsePerksReturn;
  const mockSetTheme = vi.fn();
  const mockOpenHistory = vi.fn();
  const mockNavigateToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockPerksState = {
      perks: MOCK_PERKS,
      ownedPerkIds: [],
      filteredPerks: MOCK_PERKS,
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
      isOwned: vi.fn((id: string) => mockPerksState.ownedPerkIds.includes(id)),
    };
  });

  it('1. renders prominent Doflow Coin balance and progress indicator towards next 100 DC', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={45}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    // Prominent balance display
    expect(screen.getByTestId('perks-balance-display')).toHaveTextContent('45');

    // Progress box towards next 100 DC milestone
    const progressBox = screen.getByTestId('perks-progress-indicator');
    expect(progressBox).toBeInTheDocument();
    expect(progressBox).toHaveTextContent('45 / 100 DC');
    expect(progressBox).toHaveTextContent('55 DC needed for your next 100-coin unlock');

    // Transaction History button
    const historyBtn = screen.getByTestId('perks-history-button');
    fireEvent.click(historyBtn);
    expect(mockOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('2. indicates ready reward unlock when user has exactly or more than 100 DC milestone', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={100}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const progressBox = screen.getByTestId('perks-progress-indicator');
    expect(progressBox).toHaveTextContent('100 / 100 DC (Reward Available!)');
    expect(progressBox).toHaveTextContent('You have enough coins to redeem a 100 DC reward now!');
  });

  it('3. renders category filter pills and updates selected category on click', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={150}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    expect(screen.getByTestId('category-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('category-filter-themes')).toBeInTheDocument();
    expect(screen.getByTestId('category-filter-sounds')).toBeInTheDocument();
    expect(screen.getByTestId('category-filter-badges')).toBeInTheDocument();
    expect(screen.getByTestId('category-filter-customization')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('category-filter-themes'));
    expect(mockPerksState.setSelectedCategory).toHaveBeenCalledWith('themes');
  });

  it('4. updates search query when typing in the search bar', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={150}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const searchInput = screen.getByTestId('perks-search-input');
    fireEvent.change(searchInput, { target: { value: 'ocean' } });
    expect(mockPerksState.setSearchQuery).toHaveBeenCalledWith('ocean');
  });

  it('5. prompts unauthenticated user to sign in when attempting to redeem', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={0}
        isAuthenticated={false}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const signinBtn = screen.getByTestId('signin-btn-theme_nordic');
    expect(signinBtn).toBeInTheDocument();
    expect(signinBtn).toHaveTextContent('Sign In to Redeem');

    fireEvent.click(signinBtn);
    expect(mockNavigateToLogin).toHaveBeenCalledTimes(1);
  });

  it('6. disables redemption button with clear insufficient balance indicator when balance < 100 DC', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={30}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const insufficientBtn = screen.getByTestId('insufficient-btn-theme_nordic');
    expect(insufficientBtn).toBeInTheDocument();
    expect(insufficientBtn).toHaveTextContent('Need 70 more DC');
    expect(insufficientBtn).toBeDisabled();
  });

  it('7. enables redemption button when balance >= 100 DC and triggers redemption on click', () => {
    render(
      <StudentPerksMarketplace
        coinBalance={100}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const redeemBtn = screen.getByTestId('redeem-btn-theme_nordic');
    expect(redeemBtn).toBeInTheDocument();
    expect(redeemBtn).toHaveTextContent('Redeem for 100 DC');
    expect(redeemBtn).not.toBeDisabled();

    fireEvent.click(redeemBtn);
    expect(mockPerksState.redeemPerk).toHaveBeenCalledWith(MOCK_PERKS[0]);
  });

  it('8. renders successful redemption confirmation modal with activation controls', () => {
    mockPerksState.successModalPerk = MOCK_PERKS[0]; // Nordic Theme

    render(
      <StudentPerksMarketplace
        coinBalance={0}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const modal = screen.getByTestId('redemption-success-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Redemption Successful!');
    expect(modal).toHaveTextContent('Nordic Midnight Theme');

    // Click "Activate Theme Now"
    const activateBtn = screen.getByTestId('activate-theme-success-btn');
    fireEvent.click(activateBtn);
    expect(mockSetTheme).toHaveBeenCalledWith('nordic');
    expect(mockPerksState.closeSuccessModal).toHaveBeenCalledTimes(1);
  });

  it('9. displays owned and active theme status on reward cards', () => {
    // User owns theme_nordic and has it currently activated
    mockPerksState.ownedPerkIds = ['theme_nordic', 'sound_ocean'];
    mockPerksState.isOwned = (id: string) => mockPerksState.ownedPerkIds.includes(id);

    render(
      <StudentPerksMarketplace
        coinBalance={50}
        isAuthenticated={true}
        currentTheme="nordic"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    // Nordic theme is active
    expect(screen.getByTestId('theme-active-theme_nordic')).toHaveTextContent('✓ Active Theme');

    // Sound is owned
    expect(screen.getByTestId('owned-btn-sound_ocean')).toHaveTextContent('✓ Owned');
  });

  it('10. allows activating an owned theme directly from the rewards card', () => {
    // User owns theme_nordic, but current theme is 'light'
    mockPerksState.ownedPerkIds = ['theme_nordic'];
    mockPerksState.isOwned = (id: string) => mockPerksState.ownedPerkIds.includes(id);

    render(
      <StudentPerksMarketplace
        coinBalance={50}
        isAuthenticated={true}
        currentTheme="light"
        onSetTheme={mockSetTheme}
        onOpenHistory={mockOpenHistory}
        onNavigateToLogin={mockNavigateToLogin}
        perksState={mockPerksState}
      />
    );

    const activateCardBtn = screen.getByTestId('theme-activate-btn-theme_nordic');
    expect(activateCardBtn).toHaveTextContent('Activate Theme');

    fireEvent.click(activateCardBtn);
    expect(mockSetTheme).toHaveBeenCalledWith('nordic');
  });
});
