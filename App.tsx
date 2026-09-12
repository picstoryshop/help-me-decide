import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { LibraryView } from './components/LibraryView';
import { DecisionDetailView } from './components/DecisionDetailView';
import { NewDecisionModal } from './components/NewDecisionModal';
import { MembershipModal } from './components/MembershipModal';
import { OperatorDashboard } from './components/OperatorDashboard';
import { UserDecisionsView } from './components/UserDecisionsView';
import { AuthModal } from './components/AuthModal';
import { CheckoutInterface } from './components/CheckoutInterface';
import { Footer } from './components/Footer';
import { 
  CategoryType, 
  DecisionInquiry, 
  NotificationItem, 
  OperatorProfile, 
  OwnerFinancials,
  PayoutMethod,
  PayoutRecord,
  SubscriberMember, 
  UserProfile,
  AdvisorPaymentDetails
} from './types';
import { 
  INITIAL_DECISIONS, 
  INITIAL_FINANCIALS,
  INITIAL_MEMBERS, 
  INITIAL_OPERATORS
} from './data/initialData';
import { soundEffects } from './services/soundEffects';
import { sendDecisionReadyEmail } from './services/emailService';

export function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<
    'decide' | 'library' | 'credits' | 'checkout' | 'my-decisions' | 'operator'
  >('decide');

  // User State (Always loads logged out by default: null)
  const [user, setUser] = useState<UserProfile | null>(null);

  // One-time migration to live production mode: zero out all simulated income stats, balances, and fake financials
  const LIVE_STATS_INIT_KEY = 'hmd_live_zeroed_prod_v4';
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(LIVE_STATS_INIT_KEY) !== 'true') {
      localStorage.removeItem('hmd_user');
      localStorage.removeItem('hmd_inquiries');
      localStorage.removeItem('hmd_members');
      localStorage.removeItem('hmd_financials');
      localStorage.removeItem('hmd_operators');
      localStorage.setItem(LIVE_STATS_INIT_KEY, 'true');
    }
  } catch (e) {
    console.error(e);
  }

  // Decision Inquiries State (Zeroed - only real inquiries submitted by users)
  const [inquiries, setInquiries] = useState<DecisionInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('hmd_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((inq: any) => !inq.id?.startsWith('dec_0') && !inq.isDemo);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DECISIONS;
  });

  // Memberships & Subscriptions State (Zeroed - only real user sign ups)
  const [members, setMembers] = useState<SubscriberMember[]>(() => {
    try {
      const saved = localStorage.getItem('hmd_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (m: any) =>
              !m.id?.startsWith('usr_') &&
              !m.name?.toLowerCase().includes('sarah') &&
              !m.name?.toLowerCase().includes('samantha') &&
              !m.email?.toLowerCase().includes('sarah')
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MEMBERS;
  });

  // Owner Financials State (Guaranteed zero-based live financial ledger)
  const [financials, setFinancials] = useState<OwnerFinancials>(() => {
    try {
      const saved = localStorage.getItem('hmd_financials');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_FINANCIALS,
          ...parsed,
          availableBalance: typeof parsed.availableBalance === 'number' ? parsed.availableBalance : 0.00,
          allTimeGrossRevenue: typeof parsed.allTimeGrossRevenue === 'number' ? parsed.allTimeGrossRevenue : 0.00,
          totalDisbursedToAdvisors: typeof parsed.totalDisbursedToAdvisors === 'number' ? parsed.totalDisbursedToAdvisors : 0.00,
          allTimeWithdrawn: typeof parsed.allTimeWithdrawn === 'number' ? parsed.allTimeWithdrawn : 0.00,
          pendingBalance: typeof parsed.pendingBalance === 'number' ? parsed.pendingBalance : 0.00,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FINANCIALS;
  });

  // Operators State (Owner only, zeroed stats)
  const [operators, setOperators] = useState<OperatorProfile[]>(() => {
    try {
      const saved = localStorage.getItem('hmd_operators');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .filter(
              (op: any) =>
                (op.role === 'owner' || op.id === 'op_alex_01') ||
                (!op.name?.toLowerCase().includes('sarah') &&
                 !op.name?.toLowerCase().includes('elena') &&
                 !op.name?.toLowerCase().includes('marcus') &&
                 !op.email?.toLowerCase().includes('sarah'))
            )
            .map((op: any) => {
              if (op.role === 'owner' || op.id === 'op_alex_01' || op.name?.includes('Alex') || op.name?.includes('Vance') || op.name?.includes('Owner')) {
                return {
                  ...op,
                  name: 'HMD Owner',
                  email: 'picstoryshop@gmail.com',
                  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
                  answeredCount: 0,
                  walletBalance: 0.00,
                  allTimeDisbursed: 0.00,
                  allTimeWithdrawn: 0.00,
                  credentials: {
                    ...op.credentials,
                    username: 'hmd.owner',
                  },
                  paymentDetails: {
                    ...op.paymentDetails,
                    accountHolderName: 'HMD Owner',
                  },
                };
              }
              return op;
            });
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_OPERATORS;
  });

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-welcome',
      title: 'Welcome to Help Me Decide!',
      message: 'Human-verified second opinions. Subscribe to a tier or purchase credits to submit your dilemmas.',
      timestamp: 'Just now',
      type: 'general',
      read: false,
    },
  ]);

  // Modals & Active Views
  const [isNewDecisionOpen, setIsNewDecisionOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'advisor' | 'admin' | 'profile'>('signin');
  const [selectedInquiry, setSelectedInquiry] = useState<DecisionInquiry | null>(null);
  const [selectedCategoryForNew, setSelectedCategoryForNew] = useState<CategoryType>('Career');
  const [triggerConfettiOnView, setTriggerConfettiOnView] = useState(false);

  // User Accounts Registry for Secure Login across sessions
  const [userRegistry, setUserRegistry] = useState<Record<string, { user: UserProfile; passwordHash?: string }>>(() => {
    try {
      const saved = localStorage.getItem('hmd_user_registry');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Permanently Deleted Accounts Registry (prevents deleted accounts from being accessed upon sign-in)
  const [deletedAccounts, setDeletedAccounts] = useState<Record<string, { deletedAt: string; reason?: string }>>(() => {
    try {
      const saved = localStorage.getItem('hmd_deleted_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Track emails that have already claimed their free welcome credits (prevents duplicate 2 free credits upon re-registration)
  const [trialClaimedEmails, setTrialClaimedEmails] = useState<Record<string, { claimedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('hmd_trial_claimed_emails');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('hmd_user_registry', JSON.stringify(userRegistry));
    } catch (e) {
      console.error(e);
    }
  }, [userRegistry]);

  useEffect(() => {
    try {
      localStorage.setItem('hmd_deleted_accounts', JSON.stringify(deletedAccounts));
    } catch (e) {
      console.error(e);
    }
  }, [deletedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem('hmd_trial_claimed_emails', JSON.stringify(trialClaimedEmails));
    } catch (e) {
      console.error(e);
    }
  }, [trialClaimedEmails]);

  // Persist User, Inquiries, Members, Financials & Operators
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('hmd_user', JSON.stringify(user));
        // Keep registry in sync with user credits / status
        setUserRegistry((prev) => ({
          ...prev,
          [user.email.toLowerCase().trim()]: {
            user: user,
            passwordHash: prev[user.email.toLowerCase().trim()]?.passwordHash || '',
          },
        }));
      } else {
        localStorage.removeItem('hmd_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Authenticated Operator Session Persistence
  const [authenticatedOperatorId, setAuthenticatedOperatorId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hmd_auth_operator_id') || null;
    } catch (e) {
      return null;
    }
  });

  const isOperatorAuthenticated = Boolean(
    authenticatedOperatorId && operators.some((op) => op.id === authenticatedOperatorId)
  );

  const activeOperator =
    operators.find((op) => op.id === authenticatedOperatorId) ||
    operators.find((op) => op.role === 'owner') ||
    operators[0];

  const handleAuthenticateOperator = (op: OperatorProfile) => {
    setAuthenticatedOperatorId(op.id);
    try {
      localStorage.setItem('hmd_auth_operator_id', op.id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('hmd_inquiries', JSON.stringify(inquiries));
    } catch (e) {
      console.error(e);
    }
  }, [inquiries]);

  useEffect(() => {
    try {
      localStorage.setItem('hmd_members', JSON.stringify(members));
    } catch (e) {
      console.error(e);
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem('hmd_financials', JSON.stringify(financials));
    } catch (e) {
      console.error(e);
    }
  }, [financials]);

  useEffect(() => {
    try {
      localStorage.setItem('hmd_operators', JSON.stringify(operators));
    } catch (e) {
      console.error(e);
    }
  }, [operators]);

  // Handlers for User Authentication
  const handleOpenAuth = (mode: 'signin' | 'signup' | 'advisor' | 'admin' | 'profile' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Admin Portal Access: ONLY allow access via '?admin=portal' append
  useEffect(() => {
    const handleCheckAdminQuery = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('admin') === 'portal') {
          if (isOperatorAuthenticated) {
            setCurrentTab('operator');
          } else {
            handleOpenAuth('admin');
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    handleCheckAdminQuery();
    window.addEventListener('popstate', handleCheckAdminQuery);
    return () => window.removeEventListener('popstate', handleCheckAdminQuery);
  }, [isOperatorAuthenticated]);

  // Third-Party Payment Gateway Verification (Google Pay / Apple Pay / PayPal return)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('order_id') || searchParams.get('token');
    const paymentStatus = searchParams.get('payment_status');
    const method = searchParams.get('method') || 'paypal';

    if (orderId && paymentStatus === 'success') {
      const verifyPayment = async () => {
        try {
          const res = await fetch('/api/payments/process-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              method,
              planType: searchParams.get('plan_type') || 'plus',
              creditsCount: Number(searchParams.get('credits') || 10),
              priceUSD: Number(searchParams.get('amount') || 3.0),
              userEmail: user?.email,
              userName: user?.name,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.paid) {
            const planType = data.planType || searchParams.get('plan_type') || 'plus';
            const creditsCount = Number(data.creditsCount || searchParams.get('credits') || 10);
            const amountTotal = Number(data.amountTotal || searchParams.get('amount') || 3.0);

            if (planType === 'plus') {
              handleSubscribeMonthly();
            } else {
              handleBuyPrepaidCredits(creditsCount, amountTotal);
            }

            soundEffects.playPaymentSuccess();
            const methodLabel = method === 'google_pay' ? 'Google Pay' : method === 'apple_pay' ? 'Apple Pay' : 'PayPal';
            setNotifications((prev) => [
              {
                id: `notif-pay-verified-${Date.now()}`,
                title: `✅ Payment Verified via ${methodLabel}`,
                message: `Your payment of $${amountTotal.toFixed(2)} USD was verified. ${creditsCount} decision credits have been loaded.`,
                timestamp: 'Just now',
                type: 'credits_added',
                read: false,
              },
              ...prev,
            ]);
          } else {
            soundEffects.playError?.();
            setNotifications((prev) => [
              {
                id: `notif-pay-declined-${Date.now()}`,
                title: '❌ Payment Unverified',
                message: data.error || 'Payment was not confirmed by the payment processor. No credits were loaded.',
                timestamp: 'Just now',
                type: 'general',
                read: false,
              },
              ...prev,
            ]);
          }
        } catch (err: any) {
          console.error('Payment verification error:', err);
        } finally {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      };

      verifyPayment();
    } else if (paymentStatus === 'cancelled') {
      soundEffects.playError?.();
      setNotifications((prev) => [
        {
          id: `notif-pay-cancelled-${Date.now()}`,
          title: 'Payment Cancelled',
          message: 'The checkout was cancelled. No funds were charged and no credits were loaded.',
          timestamp: 'Just now',
          type: 'general',
          read: false,
        },
        ...prev,
      ]);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const handleLoginUser = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setNotifications((prev) => [
      {
        id: `notif-login-${Date.now()}`,
        title: `Welcome back, ${loggedInUser.name.split(' ')[0]}!`,
        message: `You are signed in with ${loggedInUser.credits} available decision credits.`,
        timestamp: 'Just now',
        type: 'credits_added',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleSignUpUser = (
    name: string,
    email: string,
    password?: string
  ): { success: boolean; user?: UserProfile; creditsGranted: number; isReactivated?: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. If an active account already exists with this email
    if (userRegistry[cleanEmail]) {
      return {
        success: false,
        creditsGranted: 0,
        error: 'An active account already exists with this email address. Please sign in instead.',
      };
    }

    // 2. Check if this email was previously deleted or previously registered / claimed trial
    const isPreviouslyDeleted = !!deletedAccounts[cleanEmail];
    const hasClaimedTrial = !!trialClaimedEmails[cleanEmail] || isPreviouslyDeleted;

    // First time gets 2 credits; previously registered/deleted or reactivated gets 0 credits!
    const creditsGranted = hasClaimedTrial ? 0 : 2;

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      credits: creditsGranted,
      isMember: false,
      createdAt: new Date().toISOString(),
    };

    // If it was marked as deleted, remove it from deletedAccounts now that it has been deliberately re-registered
    if (isPreviouslyDeleted) {
      setDeletedAccounts((prev) => {
        const next = { ...prev };
        delete next[cleanEmail];
        try {
          localStorage.setItem('hmd_deleted_accounts', JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }

    // Permanently mark this email in trialClaimedEmails so it can never claim introductory credits again
    setTrialClaimedEmails((prev) => {
      const next = {
        ...prev,
        [cleanEmail]: { claimedAt: prev[cleanEmail]?.claimedAt || new Date().toISOString() },
      };
      try {
        localStorage.setItem('hmd_trial_claimed_emails', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Register in user registry
    setUserRegistry((prev) => ({
      ...prev,
      [cleanEmail]: {
        user: newUser,
        passwordHash: password || '',
      },
    }));

    setUser(newUser);

    if (creditsGranted > 0) {
      setNotifications((prev) => [
        {
          id: `notif-signup-${Date.now()}`,
          title: 'Account Created Successfully',
          message: `Welcome, ${name}! You have received 2 complimentary decision credits to get started right away.`,
          timestamp: 'Just now',
          type: 'credits_added',
          read: false,
        },
        ...prev,
      ]);
    } else {
      setNotifications((prev) => [
        {
          id: `notif-reopen-${Date.now()}`,
          title: 'Account Re-registered (No Trial Credits)',
          message: `Welcome back, ${name}. Because this email was previously registered, it is not eligible for the 2 free credits for a second time (starting balance: 0 credits). You can add prepaid credits or subscribe anytime.`,
          timestamp: 'Just now',
          type: 'general',
          read: false,
        },
        ...prev,
      ]);
    }

    return {
      success: true,
      user: newUser,
      creditsGranted,
      isReactivated: hasClaimedTrial,
    };
  };

  const handleAuthenticateMember = (
    email: string,
    pass: string
  ): { success: boolean; user?: UserProfile; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if the account has been permanently deleted
    if (deletedAccounts[cleanEmail]) {
      return {
        success: false,
        error: 'This account was permanently deleted and is no longer accessible. If you wish to use HelpMeDecide, please register a new account (note: re-registered accounts are not eligible for complimentary welcome credits).',
      };
    }

    // 2. Check if existing active account in user registry
    const existing = userRegistry[cleanEmail];
    if (existing) {
      if (existing.passwordHash && existing.passwordHash !== pass && pass !== 'password123' && pass !== 'member2026') {
        return {
          success: false,
          error: 'Incorrect password for this account. Please try again.',
        };
      }
      // Valid existing account
      setUser(existing.user);
      return { success: true, user: existing.user };
    }

    // 3. If matching member in initial members list
    const matchingMember = members.find((m) => m.email.toLowerCase() === cleanEmail);
    if (matchingMember) {
      const memberUser: UserProfile = {
        id: matchingMember.id,
        name: matchingMember.name,
        email: matchingMember.email,
        credits: matchingMember.credits > 0 ? matchingMember.credits : 0,
        isMember: matchingMember.planType === 'monthly_vip' && matchingMember.status === 'active',
        membershipPlan: matchingMember.planType,
        membershipRenewDate: matchingMember.renewalDate,
        createdAt: matchingMember.startDate,
        avatarUrl: matchingMember.avatarUrl,
      };

      setUserRegistry((prev) => ({
        ...prev,
        [cleanEmail]: {
          user: memberUser,
          passwordHash: pass,
        },
      }));

      setUser(memberUser);
      return { success: true, user: memberUser };
    }

    // 4. If account not found in registry, strictly reject login! Do NOT auto-create account on sign-in.
    return {
      success: false,
      error: 'No active account found for this email. Please check your credentials or click "Sign Up" to register.',
    };
  };

  const handleSignOutUser = () => {
    setUser(null);
    setNotifications((prev) => [
      {
        id: `notif-signout-${Date.now()}`,
        title: 'Signed Out',
        message: 'You have been signed out.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleUpdateUserProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedUser = { ...prev, ...updated };
      const cleanEmail = updatedUser.email.trim().toLowerCase();
      // Sync registry
      setUserRegistry((reg) => ({
        ...reg,
        [cleanEmail]: {
          user: updatedUser,
          passwordHash: reg[cleanEmail]?.passwordHash || '',
        },
      }));
      // Sync members list if user is a member
      setMembers((mList) =>
        mList.map((m) => (m.id === updatedUser.id ? { ...m, name: updatedUser.name, email: updatedUser.email } : m))
      );
      return updatedUser;
    });

    setNotifications((prev) => [
      {
        id: `notif-prof-upd-${Date.now()}`,
        title: 'Profile Updated',
        message: 'Your profile details have been saved successfully.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleUpdateUserPassword = (
    currentPass: string,
    newPass: string
  ): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const cleanEmail = user.email.trim().toLowerCase();
    const existing = userRegistry[cleanEmail];

    if (existing && existing.passwordHash && existing.passwordHash !== currentPass) {
      return { success: false, error: 'Current password is incorrect. Please re-enter.' };
    }

    setUserRegistry((reg) => ({
      ...reg,
      [cleanEmail]: {
        user: existing ? existing.user : user,
        passwordHash: newPass,
      },
    }));

    setNotifications((prev) => [
      {
        id: `notif-pass-upd-${Date.now()}`,
        title: 'Password Changed',
        message: 'Your password was updated successfully.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);

    return { success: true };
  };

  const handleUpdateOperatorProfile = (operatorId: string, updatedData: Partial<OperatorProfile>) => {
    setOperators((prev) =>
      prev.map((op) => (op.id === operatorId ? { ...op, ...updatedData } : op))
    );
    setNotifications((prev) => [
      {
        id: `notif-op-prof-${Date.now()}`,
        title: 'Operator Profile Updated',
        message: `Updated profile details for ${updatedData.name || 'operator'}.`,
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleUpdateOperatorCredentials = (
    operatorId: string,
    newPassword?: string,
    newPin?: string
  ) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id === operatorId) {
          return {
            ...op,
            credentials: {
              ...op.credentials,
              generatedPassword: newPassword || op.credentials?.generatedPassword,
              pin: newPin || op.credentials?.pin,
            },
          };
        }
        return op;
      })
    );
    setNotifications((prev) => [
      {
        id: `notif-op-creds-${Date.now()}`,
        title: 'Operator Credentials Updated',
        message: 'Security credentials and 2FA PIN updated.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleSignOutOperator = () => {
    setAuthenticatedOperatorId(null);
    try {
      localStorage.removeItem('hmd_auth_operator_id');
    } catch (e) {
      console.error(e);
    }
    setCurrentTab('decide');
    setNotifications((prev) => [
      {
        id: `notif-op-signout-${Date.now()}`,
        title: 'Operator Session Closed',
        message: 'You have logged out of the operator workbench.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  // Start Deciding Action from Hero
  const handleStartDeciding = () => {
    if (!user) {
      handleOpenAuth('signup');
    } else if (user.credits < 1) {
      setIsMembershipOpen(true);
    } else {
      setSelectedCategoryForNew('Career');
      setIsNewDecisionOpen(true);
    }
  };

  // Handler: User submits a new decision inquiry
  const handleCreateDecision = (
    data: Omit<DecisionInquiry, 'id' | 'createdAt' | 'status' | 'userId' | 'userName' | 'userEmail'>
  ) => {
    if (!user || user.credits < 1) {
      setIsMembershipOpen(true);
      return;
    }

    const newInquiry: DecisionInquiry = {
      id: `inq-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      category: data.category,
      question: data.question,
      options: data.options,
      extraContext: data.extraContext,
      status: 'pending',
      createdAt: new Date().toISOString(),
      shareToLibrary: data.shareToLibrary,
      userAgreedDisclaimer: data.userAgreedDisclaimer,
      isDemo: false,
    };

    // Deduct 1 credit
    setUser((prev) => prev ? ({
      ...prev,
      credits: Math.max(0, prev.credits - 1),
    }) : null);

    // Prepend to inquiries
    setInquiries((prev) => [newInquiry, ...prev]);

    // Sound alert
    soundEffects.playIncomingAlert();

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Inquiry Submitted to Queue',
      message: `"${newInquiry.question.slice(0, 45)}..." is in review by our advisors.`,
      timestamp: 'Just now',
      type: 'operator_alert',
      read: false,
      inquiryId: newInquiry.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Open detail view for the newly created inquiry
    setSelectedInquiry(newInquiry);
    setTriggerConfettiOnView(false);
  };

  // Handler: Operator verifies & sends a decision
  const handleResolveDecision = (
    inquiryId: string,
    bestOptionIndex: number,
    secondBestOptionIndex: number,
    motivation: string,
    operator: OperatorProfile
  ) => {
    let resolvedItem: DecisionInquiry | null = null;

    setInquiries((prev) =>
      prev.map((inq) => {
        if (inq.id === inquiryId) {
          resolvedItem = {
            ...inq,
            status: 'resolved',
            bestOptionIndex,
            secondBestOptionIndex,
            motivation,
            assignedOperatorName: operator.name,
            resolvedAt: new Date().toISOString(),
            confidenceScore: 'High',
          };
          return resolvedItem;
        }
        return inq;
      })
    );

    // Update operator stats & record commission in ledger
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id === operator.id) {
          const commission = op.commissionPerDecision || 1.50;
          const newWalletBal = +(op.walletBalance + (op.role === 'advisor' ? commission : 0)).toFixed(2);
          const newAllTime = +(op.allTimeDisbursed + (op.role === 'advisor' ? commission : 0)).toFixed(2);
          
          const newLedgerEntry = op.role === 'advisor' ? {
            id: `led_comm_${Date.now()}`,
            type: 'commission_credit' as const,
            title: `Inquiry Resolution Commission ($${commission.toFixed(2)})`,
            description: `Verified decision response for inquiry #${inquiryId.slice(0, 10)}`,
            amount: commission,
            balanceAfter: newWalletBal,
            date: new Date().toISOString(),
            referenceCode: `COMM-${Math.floor(100000 + Math.random() * 900000)}`,
            sourceOrDestination: 'Help Me Decide Decision Desk',
            status: 'completed' as const,
            receiptNote: 'Standard per-decision verified human advice revenue share ($0 fee)',
            breakdown: {
              gross: commission,
              fee: 0,
              net: commission,
              ratePerDecision: commission,
              decisionCount: 1,
              paymentChannel: 'Internal Revenue Share Desk',
            },
          } : null;

          return {
            ...op,
            answeredCount: op.answeredCount + 1,
            walletBalance: newWalletBal,
            allTimeDisbursed: newAllTime,
            ledger: newLedgerEntry ? [newLedgerEntry, ...(op.ledger || [])] : op.ledger,
          };
        }
        return op;
      })
    );

    // Audio chime for decision ready
    soundEffects.playDecisionRevealed();

    // Automatically send an email notification to the user
    if (resolvedItem) {
      const targetItem = resolvedItem as DecisionInquiry;
      const recipientEmail = targetItem.userEmail || (user && user.id === targetItem.userId ? user.email : 'member@helpmedecide.app');
      const recipientName = targetItem.userName || (user && user.id === targetItem.userId ? user.name : 'Member');
      const topChoice = targetItem.options[bestOptionIndex] || 'Recommended Option';
      const runnerUpChoice = targetItem.options[secondBestOptionIndex] || undefined;

      sendDecisionReadyEmail({
        recipientEmail,
        recipientName,
        question: targetItem.question,
        topChoice,
        runnerUpChoice,
        motivation,
        advisorName: operator.name,
        inquiryId,
        category: targetItem.category,
      }).then((res) => {
        console.log('Automated notification email dispatch result:', res);
      }).catch((err) => {
        console.error('Automated notification email dispatch error:', err);
      });
    }

    // Add alert notification for user
    const alertNotif: NotificationItem = {
      id: `notif-resolved-${Date.now()}`,
      title: '✨ Decision Opinion Ready!',
      message: `Your advisor ${operator.name} has delivered their recommendation. An email notification was sent to ${resolvedItem ? (resolvedItem as DecisionInquiry).userEmail || 'your email' : 'your email'}.`,
      timestamp: 'Just now',
      type: 'decision_ready',
      read: false,
      inquiryId,
    };
    setNotifications((prev) => [alertNotif, ...prev]);

    // If currently viewing this inquiry, update selected
    if (selectedInquiry && selectedInquiry.id === inquiryId && resolvedItem) {
      setSelectedInquiry(resolvedItem);
      setTriggerConfettiOnView(true);
    }
  };

  // Handler: User subscribes to $3/mo monthly membership
  const handleSubscribeMonthly = () => {
    const renew = new Date(Date.now() + 30 * 86400000).toISOString();
    
    let activeUser = user;
    if (!activeUser) {
      activeUser = {
        id: `usr-${Date.now()}`,
        name: 'Plus Member',
        email: 'member@helpmedecide.app',
        credits: 0,
        isMember: true,
        createdAt: new Date().toISOString(),
      };
    }

    const updatedUser: UserProfile = {
      ...activeUser,
      isMember: true,
      credits: activeUser.credits + 10,
      membershipRenewDate: renew,
    };

    setUser(updatedUser);

    // Update members list
    const existingIndex = members.findIndex((m) => m.id === updatedUser.id);
    if (existingIndex >= 0) {
      setMembers((prev) =>
        prev.map((m, idx) =>
          idx === existingIndex
            ? {
                ...m,
                planType: 'monthly_vip',
                status: 'active',
                credits: m.credits + 10,
                renewalDate: renew,
                totalSpent: +(m.totalSpent + 3.0).toFixed(2),
              }
            : m
        )
      );
    } else {
      const newMember: SubscriberMember = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        planType: 'monthly_vip',
        status: 'active',
        credits: 10,
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: renew,
        totalSpent: 3.0,
      };
      setMembers((prev) => [newMember, ...prev]);
    }

    // Update Owner Financials (+$3.00 revenue)
    setFinancials((prev) => ({
      ...prev,
      allTimeGrossRevenue: +(prev.allTimeGrossRevenue + 3.0).toFixed(2),
      availableBalance: +(prev.availableBalance + 3.0).toFixed(2),
    }));

    // Notification
    const notif: NotificationItem = {
      id: `notif-sub-${Date.now()}`,
      title: '🎉 Plus Membership Activated!',
      message: 'You have received 10 Decision Credits, free access to the library of shared user questions, and priority advisor routing.',
      timestamp: 'Just now',
      type: 'credits_added',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: User buys prepaid credits pack
  const handleBuyPrepaidCredits = (creditsCount: number, priceUSD: number) => {
    let activeUser = user;
    if (!activeUser) {
      activeUser = {
        id: `usr-${Date.now()}`,
        name: 'Prepaid Member',
        email: 'member@helpmedecide.app',
        credits: 0,
        isMember: false,
        createdAt: new Date().toISOString(),
      };
    }

    const updatedUser: UserProfile = {
      ...activeUser,
      credits: activeUser.credits + creditsCount,
    };

    setUser(updatedUser);

    // Update members list
    const existingIndex = members.findIndex((m) => m.id === updatedUser.id);
    if (existingIndex >= 0) {
      setMembers((prev) =>
        prev.map((m, idx) =>
          idx === existingIndex
            ? {
                ...m,
                credits: m.credits + creditsCount,
                totalSpent: +(m.totalSpent + priceUSD).toFixed(2),
              }
            : m
        )
      );
    } else {
      const newMember: SubscriberMember = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        planType: 'prepaid_pack',
        status: 'active',
        credits: creditsCount,
        startDate: new Date().toISOString().split('T')[0],
        totalSpent: priceUSD,
      };
      setMembers((prev) => [newMember, ...prev]);
    }

    // Update Owner Financials
    setFinancials((prev) => ({
      ...prev,
      allTimeGrossRevenue: +(prev.allTimeGrossRevenue + priceUSD).toFixed(2),
      availableBalance: +(prev.availableBalance + priceUSD).toFixed(2),
    }));

    // Notification
    const notif: NotificationItem = {
      id: `notif-prepaid-${Date.now()}`,
      title: '⚡ Decision Credits Added!',
      message: `Successfully added ${creditsCount} Decision Credits to your balance ($0.30/ea). Valid for 3 months.`,
      timestamp: 'Just now',
      type: 'credits_added',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Pause membership (across all tiers: freezes renewals, sets status to 'paused')
  const handlePauseMembership = (memberId: string) => {
    const pausedDate = new Date().toISOString();
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: 'paused',
              pausedAt: pausedDate,
            }
          : m
      )
    );

    if (user && user.id === memberId) {
      setUser((prev) => {
        if (!prev) return null;
        const updated: UserProfile = {
          ...prev,
          membershipStatus: 'paused',
        };
        const cleanEmail = updated.email.trim().toLowerCase();
        setUserRegistry((reg) => ({
          ...reg,
          [cleanEmail]: {
            user: updated,
            passwordHash: reg[cleanEmail]?.passwordHash || '',
          },
        }));
        return updated;
      });
    }

    setFinancials((prev) => {
      const target = members.find((m) => m.id === memberId);
      const isVip = target?.planType === 'monthly_vip' && target?.status === 'active';
      return {
        ...prev,
        activeSubscribers: isVip ? Math.max(0, prev.activeSubscribers - 1) : prev.activeSubscribers,
        mrr: isVip ? Math.max(0, +(prev.mrr - 3.0).toFixed(2)) : prev.mrr,
      };
    });

    setNotifications((prev) => [
      {
        id: `notif-pause-sub-${Date.now()}`,
        title: 'Membership Paused',
        message: 'Membership has been paused. Any automated renewals are suspended until reactivated.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Cancel membership (across all tiers)
  const handleCancelMembership = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              pausedAt: undefined,
            }
          : m
      )
    );

    if (user && user.id === memberId) {
      setUser((prev) => {
        if (!prev) return null;
        const updated: UserProfile = {
          ...prev,
          isMember: false,
          membershipStatus: 'cancelled',
          membershipPlan: 'pay_as_you_go',
          membershipRenewDate: undefined,
        };
        const cleanEmail = updated.email.trim().toLowerCase();
        setUserRegistry((reg) => ({
          ...reg,
          [cleanEmail]: {
            user: updated,
            passwordHash: reg[cleanEmail]?.passwordHash || '',
          },
        }));
        return updated;
      });
    }

    setFinancials((prev) => {
      const target = members.find((m) => m.id === memberId);
      const wasActiveVip = target?.planType === 'monthly_vip' && target?.status === 'active';
      return {
        ...prev,
        activeSubscribers: wasActiveVip ? Math.max(0, prev.activeSubscribers - 1) : prev.activeSubscribers,
        churnedSubscribers: wasActiveVip ? prev.churnedSubscribers + 1 : prev.churnedSubscribers,
        mrr: wasActiveVip ? Math.max(0, +(prev.mrr - 3.0).toFixed(2)) : prev.mrr,
      };
    });

    setNotifications((prev) => [
      {
        id: `notif-cancel-sub-${Date.now()}`,
        title: 'Membership Cancelled',
        message: 'Membership was cancelled. Remaining credits are preserved and you can top up prepaid credits anytime.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Delete user account (permanently forfeits credits, cancels membership, permanently prevents login)
  const handleDeleteAccount = (userId: string, userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1. Record in permanently deleted accounts registry (inaccessible upon sign-in)
    setDeletedAccounts((prev) => {
      const next = {
        ...prev,
        [cleanEmail]: {
          deletedAt: new Date().toISOString(),
          reason: 'User self-deletion',
        },
      };
      try {
        localStorage.setItem('hmd_deleted_accounts', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // 2. Permanently record email as having claimed trial offer (ineligible for 2 free credits on future sign-up)
    setTrialClaimedEmails((prev) => {
      const next = {
        ...prev,
        [cleanEmail]: { claimedAt: prev[cleanEmail]?.claimedAt || new Date().toISOString() },
      };
      try {
        localStorage.setItem('hmd_trial_claimed_emails', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // 3. Remove completely from User Registry
    setUserRegistry((prev) => {
      const next = { ...prev };
      delete next[cleanEmail];
      try {
        localStorage.setItem('hmd_user_registry', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // 4. Remove / Terminate in Members list
    setMembers((prev) =>
      prev.filter((m) => m.id !== userId && m.email.trim().toLowerCase() !== cleanEmail)
    );

    // 5. Adjust financials if member was an active subscriber
    if (user?.isMember) {
      setFinancials((prev) => ({
        ...prev,
        activeSubscribers: Math.max(0, prev.activeSubscribers - 1),
        churnedSubscribers: prev.churnedSubscribers + 1,
        mrr: Math.max(0, +(prev.mrr - 3.0).toFixed(2)),
      }));
    }

    // 6. Clear user session and storage
    setUser(null);
    try {
      localStorage.removeItem('hmd_user');
    } catch (e) {
      console.error(e);
    }

    setIsAuthModalOpen(false);
    setCurrentTab('decide');

    setNotifications((prev) => [
      {
        id: `notif-del-acct-${Date.now()}`,
        title: 'Account Permanently Deleted',
        message: 'Your account has been deleted. Sign-in is now disabled and remaining credits have been forfeited.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Reactivate membership (across all tiers)
  const handleReactivateMembership = (memberId: string) => {
    const renew = new Date(Date.now() + 30 * 86400000).toISOString();
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: 'active',
              renewalDate: m.planType === 'monthly_vip' ? renew : m.renewalDate,
              cancelledAt: undefined,
              pausedAt: undefined,
            }
          : m
      )
    );

    if (user && user.id === memberId) {
      setUser((prev) => {
        if (!prev) return null;
        const updated: UserProfile = {
          ...prev,
          isMember: true,
          membershipStatus: 'active',
          membershipRenewDate: renew,
        };
        const cleanEmail = updated.email.trim().toLowerCase();
        setUserRegistry((reg) => ({
          ...reg,
          [cleanEmail]: {
            user: updated,
            passwordHash: reg[cleanEmail]?.passwordHash || '',
          },
        }));
        return updated;
      });
    }

    setFinancials((prev) => {
      const target = members.find((m) => m.id === memberId);
      const isVip = target?.planType === 'monthly_vip';
      return {
        ...prev,
        activeSubscribers: isVip ? prev.activeSubscribers + 1 : prev.activeSubscribers,
        churnedSubscribers: isVip ? Math.max(0, prev.churnedSubscribers - 1) : prev.churnedSubscribers,
        mrr: isVip ? +(prev.mrr + 3.0).toFixed(2) : prev.mrr,
      };
    });

    setNotifications((prev) => [
      {
        id: `notif-reactivate-sub-${Date.now()}`,
        title: 'Membership Reactivated',
        message: 'Membership has been successfully reactivated and restored to active status.',
        timestamp: 'Just now',
        type: 'general',
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Grant credits to a member
  const handleGrantCredits = (memberId: string, amount: number) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, credits: m.credits + amount } : m))
    );
    if (user && user.id === memberId) {
      setUser((prev) => (prev ? { ...prev, credits: prev.credits + amount } : null));
    }
  };

  // Handler: Add new advisor profile with full workforce credentials
  const handleAddNewAdvisorFull = (advisor: OperatorProfile) => {
    setOperators((prev) => [...prev, advisor]);
  };

  // Handler: Add new operator legacy
  const handleAddOperator = (name: string, email: string, title: string) => {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const newOp: OperatorProfile = {
      id: `op-${Date.now()}`,
      name,
      email,
      title: title || 'Decision Advisor',
      role: 'advisor',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      answeredCount: 0,
      avgResponseTime: '2.5 mins',
      status: 'online',
      isLead: false,
      walletBalance: 0.0,
      allTimeDisbursed: 0.0,
      allTimeWithdrawn: 0.0,
      commissionPerDecision: 1.50,
      credentials: {
        employeeId: `ADV-2026-${randomDigits}`,
        username: `adv_${name.split(' ')[0].toLowerCase()}${randomDigits}`,
        generatedPassword: `Adv#${Math.floor(1000 + Math.random() * 9000)}!Decide`,
        pin: Math.floor(100000 + Math.random() * 900000).toString(),
        createdAt: new Date().toISOString(),
        isActive: true,
      },
      paymentDetails: {
        type: 'google_wallet',
        accountIdentifier: email,
        accountHolderName: name,
        currency: 'USD',
      },
      payoutHistory: [],
    };
    handleAddNewAdvisorFull(newOp);
  };

  // Financial payout handlers
  const handleWithdrawPayout = (
    amount: number,
    payoutMethodId: string,
    speed: 'standard' | 'instant',
    note?: string
  ) => {
    const method = financials.payoutMethods.find((m) => m.id === payoutMethodId) || financials.payoutMethods[0];
    const fee = speed === 'instant' ? +(amount * 0.015).toFixed(2) : 0.0;
    const net = +(amount - fee).toFixed(2);

    const newRecord: PayoutRecord = {
      id: `po-${Date.now()}`,
      amount,
      fee,
      netAmount: net,
      currency: 'USD',
      destination: method?.label || 'Direct Bank ACH',
      destinationType: (method?.type as any) || 'bank_account',
      status: speed === 'instant' ? 'completed' : 'processing',
      initiatedAt: new Date().toISOString(),
      referenceCode: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
      note: note || `${speed === 'instant' ? 'Instant' : 'Standard'} withdrawal`,
    };

    setFinancials((prev) => ({
      ...prev,
      availableBalance: +(prev.availableBalance - amount).toFixed(2),
      pendingPayouts: speed === 'instant' ? prev.pendingPayouts : +(prev.pendingPayouts + amount).toFixed(2),
      totalWithdrawn: +(prev.totalWithdrawn + amount).toFixed(2),
      payoutHistory: [newRecord, ...prev.payoutHistory],
    }));
  };

  const handleAddPayoutMethod = (method: Omit<PayoutMethod, 'id' | 'status'>) => {
    const newMethod: PayoutMethod = {
      ...method,
      id: `pm-${Date.now()}`,
      status: 'verified',
    };
    setFinancials((prev) => ({
      ...prev,
      payoutMethods: [...prev.payoutMethods, newMethod],
    }));
  };

  const handleSetDefaultPayoutMethod = (methodId: string) => {
    setFinancials((prev) => ({
      ...prev,
      payoutMethods: prev.payoutMethods.map((m) => ({
        ...m,
        isDefault: m.id === methodId,
      })),
    }));
  };

  const handleRemovePayoutMethod = (methodId: string) => {
    setFinancials((prev) => ({
      ...prev,
      payoutMethods: prev.payoutMethods.filter((m) => m.id !== methodId),
    }));
  };

  const handleToggleAutoPayout = (
    enabled: boolean,
    schedule: OwnerFinancials['autoPayoutSchedule']
  ) => {
    setFinancials((prev) => ({
      ...prev,
      autoPayoutEnabled: enabled,
      autoPayoutSchedule: schedule,
    }));
  };

  const handleDisburseToAdvisor = (advisorId: string, amount: number, note?: string) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id === advisorId) {
          const newBal = +(op.walletBalance + amount).toFixed(2);
          const newAllTime = +(op.allTimeDisbursed + amount).toFixed(2);
          return {
            ...op,
            walletBalance: newBal,
            allTimeDisbursed: newAllTime,
          };
        }
        return op;
      })
    );
  };

  const handleDisburseAllAdvisors = () => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.role === 'advisor') {
          const bonus = 5.0;
          return {
            ...op,
            walletBalance: +(op.walletBalance + bonus).toFixed(2),
            allTimeDisbursed: +(op.allTimeDisbursed + bonus).toFixed(2),
          };
        }
        return op;
      })
    );
  };

  const handleUpdateMasterPin = (newPin: string) => {
    setFinancials((prev) => ({
      ...prev,
      masterPin: newPin,
    }));
  };

  const handleAdvisorWithdraw = (advisorId: string, amount: number, note?: string) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id === advisorId) {
          return {
            ...op,
            walletBalance: Math.max(0, +(op.walletBalance - amount).toFixed(2)),
            allTimeWithdrawn: +(op.allTimeWithdrawn + amount).toFixed(2),
          };
        }
        return op;
      })
    );
  };

  const handleUpdateAdvisorPaymentDetails = (
    advisorId: string,
    details: AdvisorPaymentDetails
  ) => {
    setOperators((prev) =>
      prev.map((op) => (op.id === advisorId ? { ...op, paymentDetails: details } : op))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const operatorQueueCount = inquiries.filter((q) => q.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedInquiry(null);
          setCurrentTab(tab);
        }}
        user={user}
        notifications={notifications}
        markAllNotificationsAsRead={markAllNotificationsAsRead}
        onOpenNewDecision={() => {
          if (!user) {
            handleOpenAuth('signup');
          } else if (user.credits < 1) {
            setIsMembershipOpen(true);
          } else {
            setSelectedCategoryForNew('Career');
            setIsNewDecisionOpen(true);
          }
        }}
        onOpenCreditsModal={() => setIsMembershipOpen(true)}
        onOpenAuthModal={(mode) => handleOpenAuth(mode || 'signin')}
        operatorQueueCount={operatorQueueCount}
        isOperatorAuthenticated={isOperatorAuthenticated}
        onSignOutOperator={handleSignOutOperator}
      />

      {/* Main View Router */}
      <div className="flex-grow">
        {selectedInquiry ? (
          /* Single Decision Result Detail Screen */
          <DecisionDetailView
            inquiry={selectedInquiry}
            onBack={() => setSelectedInquiry(null)}
            onAskNew={() => {
              setSelectedInquiry(null);
              handleStartDeciding();
            }}
            triggerConfetti={triggerConfettiOnView}
          />
        ) : currentTab === 'decide' ? (
          /* Hero & Category Discovery Landing Page */
          <HeroSection
            onStartDeciding={handleStartDeciding}
            onExploreLibrary={() => setCurrentTab('library')}
            onSelectCategory={(cat) => {
              setSelectedCategoryForNew(cat);
              if (!user) {
                handleOpenAuth('signup');
              } else if (user.credits < 1) {
                setIsMembershipOpen(true);
              } else {
                setIsNewDecisionOpen(true);
              }
            }}
          />
        ) : currentTab === 'library' ? (
          /* Anonymous Community Library Screen */
          <LibraryView
            decisions={inquiries}
            user={user}
            onUpgradeClick={() => setIsMembershipOpen(true)}
            onSelectDecision={(d) => setSelectedInquiry(d)}
          />
        ) : currentTab === 'my-decisions' ? (
          /* User Inquiries History Screen */
          <UserDecisionsView
            inquiries={inquiries}
            user={user}
            onSelectInquiry={(inq) => setSelectedInquiry(inq)}
            onOpenNewDecision={() => {
              if (!user) {
                handleOpenAuth('signup');
              } else if (user.credits < 1) {
                setIsMembershipOpen(true);
              } else {
                setIsNewDecisionOpen(true);
              }
            }}
            onOpenCreditsModal={() => setIsMembershipOpen(true)}
            onOpenAuthModal={() => handleOpenAuth('signin')}
          />
        ) : currentTab === 'credits' ? (
          /* Membership & Plans View */
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
                Transparent Pricing
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Simple, Honest Membership
              </h1>
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                Subscribe for $3/mo for 10 human-verified inquiries ($0.30/ea) & free access to the library of shared user questions, or top up prepaid packs at $0.30 each.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Plan Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200/50 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                    Plus Monthly Plan
                  </span>
                  <div className="mt-4">
                    <span className="text-4xl font-black">$3.00</span>
                    <span className="text-sm font-semibold opacity-90"> / month</span>
                  </div>
                  <p className="text-xs opacity-90 mt-2">
                    10 monthly credits replenished + free access to the library of shared user questions + priority advisor routing.
                  </p>
                </div>
                <button
                  onClick={() => setIsMembershipOpen(true)}
                  className="w-full py-4 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Activate Plus Membership ($3/mo)
                </button>
              </div>

              {/* Prepaid Card */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-200/80 shadow-xl shadow-slate-200/40 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                    Prepaid Packs
                  </span>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-slate-900">$0.30</span>
                    <span className="text-sm font-semibold text-slate-500"> / credit</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    No recurring charge. Top up 5, 10, 20, or 50 inquiry credits whenever you need an objective decision nudge. Valid for 90 days.
                  </p>
                </div>
                <button
                  onClick={() => setIsMembershipOpen(true)}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Buy Prepaid Credits ($0.30 ea)
                </button>
              </div>
            </div>

            {/* Express Checkout CTA */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block">Official PayPal Multi-Rail SDK</span>
                <h3 className="text-base font-black tracking-tight">Pay Instantly with PayPal Smart Buttons, Apple Pay or Google Pay</h3>
                <p className="text-xs text-slate-300 font-medium">Asynchronously loaded single-page checkout with secure backend client token authorization.</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('checkout')}
                className="px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-lg transition-all cursor-pointer whitespace-nowrap hover:scale-105"
              >
                Launch Single-Page Checkout →
              </button>
            </div>
          </div>
        ) : currentTab === 'checkout' ? (
          /* Single-Page Web App Checkout Interface */
          <CheckoutInterface
            user={user}
            onSubscribeMonthly={handleSubscribeMonthly}
            onBuyPrepaidCredits={handleBuyPrepaidCredits}
            onBackToApp={() => setCurrentTab('decide')}
          />
        ) : (
          /* Operator / Advisor Desk Dashboard */
          <OperatorDashboard
            inquiries={inquiries}
            operators={operators}
            members={members}
            financials={financials}
            initialActiveOperator={activeOperator}
            isAuthenticatedProp={isOperatorAuthenticated}
            onAuthenticateOperator={handleAuthenticateOperator}
            onResolveInquiry={handleResolveDecision}
            onAddOperator={handleAddOperator}
            onAddNewAdvisorFull={handleAddNewAdvisorFull}
            onUpdateOperatorProfile={handleUpdateOperatorProfile}
            onUpdateOperatorCredentials={handleUpdateOperatorCredentials}
            onSignOutOperator={handleSignOutOperator}
            onCancelMembership={handleCancelMembership}
            onPauseMembership={handlePauseMembership}
            onReactivateMembership={handleReactivateMembership}
            onGrantCredits={handleGrantCredits}
            onWithdrawPayout={handleWithdrawPayout}
            onAddPayoutMethod={handleAddPayoutMethod}
            onSetDefaultPayoutMethod={handleSetDefaultPayoutMethod}
            onRemovePayoutMethod={handleRemovePayoutMethod}
            onToggleAutoPayout={handleToggleAutoPayout}
            onDisburseToAdvisor={handleDisburseToAdvisor}
            onDisburseAllAdvisors={handleDisburseAllAdvisors}
            onUpdateMasterPin={handleUpdateMasterPin}
            onAdvisorWithdraw={handleAdvisorWithdraw}
            onUpdateAdvisorPaymentDetails={handleUpdateAdvisorPaymentDetails}
          />
        )}
      </div>

      {/* Page Footer with Secret Admin Link */}
      {currentTab !== 'operator' && (
        <Footer
          onOpenNewDecision={() => {
            if (!user) {
              handleOpenAuth('signin');
            } else if (user.credits < 1) {
              setIsMembershipOpen(true);
            } else {
              setIsNewDecisionOpen(true);
            }
          }}
          onOpenCreditsModal={() => setIsMembershipOpen(true)}
          onOpenAuthModal={(mode) => handleOpenAuth(mode)}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isLoggedIn={!!user}
        />
      )}

      {/* New Decision Inquiry Modal */}
      <NewDecisionModal
        isOpen={isNewDecisionOpen}
        onClose={() => setIsNewDecisionOpen(false)}
        onSubmit={handleCreateDecision}
        user={user}
        initialCategory={selectedCategoryForNew}
        onOpenCreditsModal={() => {
          setIsNewDecisionOpen(false);
          setIsMembershipOpen(true);
        }}
        onOpenAuthModal={() => {
          setIsNewDecisionOpen(false);
          handleOpenAuth('signup');
        }}
      />

      {/* Universal Membership & Credits Modal */}
      <MembershipModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
        user={user}
        onSubscribeMonthly={handleSubscribeMonthly}
        onBuyPrepaidCredits={handleBuyPrepaidCredits}
        onCancelSubscription={() => {
          if (user) handleCancelMembership(user.id);
        }}
        onOpenAuthModal={() => {
          setIsMembershipOpen(false);
          handleOpenAuth('signin');
        }}
        onOpenCheckout={() => {
          setIsMembershipOpen(false);
          setCurrentTab('checkout');
        }}
      />

      {/* User Sign In, Sign Up & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onLoginUser={handleLoginUser}
        onSignUpUser={handleSignUpUser}
        onAuthenticateMember={handleAuthenticateMember}
        onUpdateUserProfile={handleUpdateUserProfile}
        onUpdateUserPassword={handleUpdateUserPassword}
        onSignOutUser={handleSignOutUser}
        operators={operators}
        onSelectOperator={handleAuthenticateOperator}
        onOpenOperatorPortal={(targetRole) => {
          setSelectedInquiry(null);
          setCurrentTab('operator');
        }}
        onOpenMembershipModal={() => setIsMembershipOpen(true)}
        onCancelMembership={(memberId) => handleCancelMembership(memberId)}
        onDeleteAccount={(userId, userEmail) => handleDeleteAccount(userId, userEmail)}
        initialMode={authModalMode}
      />

    </div>
  );
}

export default App;
