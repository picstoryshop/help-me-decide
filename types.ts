export type CategoryType = 
  | 'Career'
  | 'Relationships'
  | 'Finance'
  | 'Personal Growth'
  | 'Lifestyle'
  | 'Tech & Business';

export interface DecisionInquiry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: CategoryType;
  question: string;
  options: string[];
  extraContext?: string;
  shareToLibrary: boolean;
  status: 'pending' | 'in_review' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  bestOptionIndex?: number; // 0-based index of recommended option
  secondBestOptionIndex?: number; // 0-based index of runner-up
  motivation?: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  views?: number;
  likes?: number;
  isDemo?: boolean;
  userAgreedDisclaimer: boolean;
  confidenceScore?: 'High' | 'Solid' | 'Pragmatic';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  credits: number;
  isMember: boolean; // Paid $3/month member
  membershipPlan?: 'monthly_vip' | 'pay_as_you_go' | 'none';
  membershipStatus?: 'active' | 'paused' | 'cancelled' | 'trial';
  membershipRenewDate?: string;
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
}

export interface AdvisorPaymentDetails {
  type: 'paypal' | 'bank_transfer' | 'google_wallet' | 'wise' | 'bank_account';
  accountIdentifier: string; // PayPal email, Google Wallet email/ID, or Bank account #
  accountHolderName: string;
  bankName?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  currency: string;
  verified?: boolean;
}

export interface AdvisorCredentials {
  employeeId: string;
  username: string;
  generatedPassword: string;
  pin: string;
  createdAt: string;
  isActive?: boolean;
  lastLogin?: string;
}

export interface AdvisorLedgerEntry {
  id: string;
  type: 'incoming_disbursal' | 'commission_credit' | 'withdrawal' | 'bonus';
  title: string;
  description: string;
  amount: number; // positive for incoming credit, negative for withdrawal
  balanceAfter: number;
  date: string;
  referenceCode: string;
  sourceOrDestination: string;
  status: 'completed' | 'processing';
  receiptNote?: string;
  breakdown?: {
    gross: number;
    fee: number;
    net: number;
    ratePerDecision?: number;
    decisionCount?: number;
    paymentChannel?: string;
  };
}

export interface OperatorProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  avatarUrl: string;
  answeredCount: number;
  avgResponseTime: string;
  status: 'online' | 'busy' | 'away';
  isLead?: boolean;
  role: 'owner' | 'advisor';
  credentials: AdvisorCredentials;
  paymentDetails: AdvisorPaymentDetails;
  commissionPerDecision: number; // $0.20 USD per decision answered
  walletBalance: number; // funds disbursed by owner to this advisor
  allTimeDisbursed: number; // total earnings disbursed by owner
  allTimeWithdrawn: number; // total withdrawn by advisor to nominated account
  payoutHistory: PayoutRecord[];
  ledger?: AdvisorLedgerEntry[];
}

export interface GrammarIssue {
  type: 'spelling' | 'grammar' | 'punctuation' | 'clarity';
  message: string;
  offset: number;
  length: number;
  word: string;
  replacements: string[];
}

export interface SubscriberMember {
  id: string;
  name: string;
  email: string;
  planType: 'monthly_vip' | 'prepaid_pack' | 'free_tier';
  status: 'active' | 'paused' | 'cancelled' | 'trial';
  credits: number;
  startDate: string;
  renewalDate?: string;
  pausedAt?: string;
  cancelledAt?: string;
  totalSpent: number;
  avatarUrl?: string;
}

export interface AIResearchResult {
  id: string;
  query: string;
  provider: 'ChatGPT-4o' | 'Gemini-3.7' | 'Perplexity-DeepResearch';
  summary: string;
  keyInsights: string[];
  optionsComparison?: {
    option: string;
    pros: string[];
    cons: string[];
    riskRating: 'Low' | 'Moderate' | 'High';
  }[];
  psychologicalAngle: string;
  marketStatsOrPrecedents: string[];
  suggestedMotivation: string;
  recommendedOptionIndex?: number;
  sources?: { title: string; domain: string; snippet?: string }[];
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'decision_ready' | 'credits_added' | 'operator_alert' | 'membership_active' | 'membership_cancelled';
  inquiryId?: string;
  read: boolean;
}

export interface PayoutMethod {
  id: string;
  type: 'bank_account' | 'paypal' | 'google_wallet' | 'apple_cash' | 'wise';
  isDefault: boolean;
  label: string;
  details: {
    bankName?: string;
    accountHolderName?: string;
    accountNumberLast4?: string;
    routingNumber?: string;
    accountType?: 'checking' | 'savings';
    paypalEmail?: string;
    googleWalletId?: string;
    appleCashId?: string;
    wiseEmail?: string;
    currency?: string;
  };
  status: 'verified' | 'pending';
}

export interface PayoutRecord {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  destination: string;
  destinationType: 'bank_account' | 'paypal' | 'google_wallet' | 'apple_cash' | 'wise';
  status: 'completed' | 'processing' | 'pending';
  initiatedAt: string;
  completedAt?: string;
  referenceCode: string;
  traceId?: string;
  clearingNetwork?: string;
  settlementEta?: string;
  note?: string;
}

export interface SecurityAuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ipHash: string;
  status: 'success' | 'warning' | 'blocked';
}

export interface OwnerFinancials {
  availableBalance: number;
  pendingBalance: number;
  allTimeWithdrawn: number;
  allTimeGrossRevenue: number;
  totalDisbursedToAdvisors: number;
  autoPayoutEnabled: boolean;
  autoPayoutSchedule: 'daily' | 'weekly_friday' | 'monthly_first' | 'manual';
  payoutMethods: PayoutMethod[];
  payoutHistory: PayoutRecord[];
  masterPin: string; // 6-digit PIN e.g. "882194"
  pinProtectionEnabled: boolean;
  twoFactorEnabled: boolean;
  securityLogs: SecurityAuditLogItem[];
}

