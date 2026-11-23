export type SupportedCurrency = 'USD' | 'AUD' | 'GBP' | 'EUR' | 'CAD';

export interface PlatformSettings {
  // 1. Storefront, Pricing & Announcements
  basePackPriceUsd: number;
  customBuilderPriceUsd: number;
  bespokePartyPriceUsd: number;
  defaultCurrency: SupportedCurrency;
  first50WaitlistEnabled: boolean;
  first50VipCap: number;
  announcementBannerEnabled: boolean;
  announcementBannerText: string;
  announcementBannerCtaLabel: string;
  announcementBannerCtaHref: string;
  checkoutPaused: boolean;
  maintenanceMessage: string;

  // 2. Support, Ticketing & Email Notifications
  supportEmail: string;
  senderDisplayName: string;
  ccNotificationEmails: string;
  ticketSlaHours: number;
  autoFaqReminderInTicketEmails: boolean;
  notifyOnNewTicket: boolean;
  notifyOnCustomerTicketReply: boolean;
  notifyOnNewEnquiry: boolean;
  notifyOnNewOrder: boolean;
  notifyOnNewReview: boolean;

  // 3. AI Mystery & Media Generation Controls
  storyAndQaModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  imageGenerationModel: 'gemini-2.5-flash-image';
  elevenLabsAudioEnabled: boolean;
  defaultNarratorVoiceStyle: string;
  maxPortraitRegensPerCustomer: number;
  monthlyAiBudgetAlertUsd: number;
  requirePreLaunchQaCertification: boolean;
  minRound3SolveRatePercent: number;

  // 4. Marketing & Social Automation Cadence
  reviewFirstWorkflowLocked: boolean;
  blogPublishDays: string;
  blogPublishTimeUtc: string;
  minBlogWordCount: number;
  linkedInMinWords: number;
  linkedInMaxWords: number;
  maxInstagramHashtags: number;
  defaultBlogToBuyCta: string;
  defaultEdmUtmCampaign: string;

  // 5. SEO, Metadata & Social Profiles
  defaultSiteTitle: string;
  defaultMetaDescription: string;
  ogImageUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  googleAnalyticsId: string;
  metaPixelId: string;

  // Metadata
  updatedAt: string;
  updatedBy: string;
}

export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'warning' | 'missing';
  mode?: string;
  detail: string;
  envKeyHint: string;
}

export interface IntegrationHealthReport {
  checkedAt: string;
  items: IntegrationStatusItem[];
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  // 1. Storefront, Pricing & Announcements
  basePackPriceUsd: 19,
  customBuilderPriceUsd: 35,
  bespokePartyPriceUsd: 99,
  defaultCurrency: 'USD',
  first50WaitlistEnabled: true,
  first50VipCap: 50,
  announcementBannerEnabled: false,
  announcementBannerText:
    '🎉 Hosting a dinner party soon? Get instant access to interactive murder mystery packs from $19!',
  announcementBannerCtaLabel: 'Browse Mystery Packs →',
  announcementBannerCtaHref: '/en/themes',
  checkoutPaused: false,
  maintenanceMessage:
    'We are currently performing scheduled maintenance on checkout. Active party lobbies remain online.',

  // 2. Support, Ticketing & Email Notifications
  supportEmail: 'hello@backpocketgames.com',
  senderDisplayName: 'Back Pocket Mysteries',
  ccNotificationEmails: '',
  ticketSlaHours: 48,
  autoFaqReminderInTicketEmails: true,
  notifyOnNewTicket: true,
  notifyOnCustomerTicketReply: true,
  notifyOnNewEnquiry: true,
  notifyOnNewOrder: true,
  notifyOnNewReview: true,

  // 3. AI Mystery & Media Generation Controls
  storyAndQaModel: 'gemini-2.5-flash',
  imageGenerationModel: 'gemini-2.5-flash-image',
  elevenLabsAudioEnabled: true,
  defaultNarratorVoiceStyle: 'Dramatic Detective Narrator',
  maxPortraitRegensPerCustomer: 5,
  monthlyAiBudgetAlertUsd: 50,
  requirePreLaunchQaCertification: true,
  minRound3SolveRatePercent: 100,

  // 4. Marketing & Social Automation Cadence
  reviewFirstWorkflowLocked: true,
  blogPublishDays: 'Mondays & Thursdays',
  blogPublishTimeUtc: '09:00:00Z',
  minBlogWordCount: 1500,
  linkedInMinWords: 600,
  linkedInMaxWords: 700,
  maxInstagramHashtags: 5,
  defaultBlogToBuyCta: 'Host an interactive Back Pocket Mystery from $19 (~$2.50 per guest)',
  defaultEdmUtmCampaign: 'friday_weekly_digest',

  // 5. SEO, Metadata & Social Profiles
  defaultSiteTitle: 'Back Pocket Mysteries | Custom Murder Mystery Party Games',
  defaultMetaDescription:
    'Host an unforgettable evening with a custom-crafted murder mystery party game. Instant digital clues, audio evidence, and gender-flex casting for 4–20+ guests.',
  ogImageUrl: 'https://backpocketmysteries.com/og-cover.png',
  instagramUrl: 'https://instagram.com/backpocketmysteries',
  facebookUrl: 'https://facebook.com/backpocketmysteries',
  linkedinUrl: 'https://linkedin.com/company/back-pocket-games',
  tiktokUrl: 'https://tiktok.com/@backpocketmysteries',
  googleAnalyticsId: '',
  metaPixelId: '',

  // Metadata
  updatedAt: new Date().toISOString(),
  updatedBy: 'hello@backpocketgames.com',
};
