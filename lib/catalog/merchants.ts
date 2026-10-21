// Known-merchant catalog + Dark Pattern Cancellation Library.
//
// One source of truth for: descriptor matching (bank + email), categories,
// overlap groups (redundancy detection) and cancellation guidance.
// Vendor flows change often — treat URLs as starting points and keep this file
// reviewed. Difficulty ratings are SubShield's editorial assessment.

export type Cycle = 'weekly' | 'monthly' | 'yearly'
export type Difficulty = 'easy' | 'medium' | 'nightmare'
export type CancelChannel = 'online' | 'app_store' | 'phone' | 'chat' | 'mail' | 'in_person'

export const CATEGORIES = [
  'Streaming',
  'Music',
  'Cloud Storage',
  'Software',
  'AI Tools',
  'News & Reading',
  'Fitness',
  'Wellness',
  'Gaming',
  'Food Delivery',
  'Shopping',
  'Dating',
  'Security & VPN',
  'Telecom',
  'General',
] as const
export type Category = (typeof CATEGORIES)[number]

export type OverlapGroup =
  | 'video'
  | 'music'
  | 'cloud'
  | 'ai'
  | 'vpn'
  | 'delivery'
  | 'meditation'
  | 'dating'
  | 'antivirus'
  | 'meal_kit'

export const OVERLAP_LABELS: Record<OverlapGroup, string> = {
  video: 'video streaming services',
  music: 'music streaming services',
  cloud: 'cloud storage plans',
  ai: 'AI assistants',
  vpn: 'VPNs',
  delivery: 'delivery memberships',
  meditation: 'meditation apps',
  dating: 'dating apps',
  antivirus: 'antivirus suites',
  meal_kit: 'meal kits',
}

/** Baseline probability that a subscription in this category goes unused. */
export const CATEGORY_DORMANCY: Record<Category, number> = {
  Fitness: 0.5,
  Wellness: 0.42,
  'News & Reading': 0.36,
  Dating: 0.36,
  Streaming: 0.3,
  Gaming: 0.3,
  Software: 0.26,
  'Food Delivery': 0.25,
  Shopping: 0.22,
  General: 0.2,
  'Security & VPN': 0.2,
  'AI Tools': 0.16,
  Music: 0.12,
  'Cloud Storage': 0.1,
  Telecom: 0.05,
}

export interface CancelGuide {
  difficulty: Difficulty
  channel: CancelChannel
  url: string
  steps: string[]
  darkPatterns: string[]
  tip?: string
}

export interface Merchant {
  key: string
  name: string
  domain: string
  category: Category
  defaultCycle: Cycle
  /** Matched against the normalized descriptor (lowercase, punctuation → spaces). */
  aliases: RegExp[]
  /** For shared descriptors like "APPLE.COM/BILL": typical price points used to disambiguate. */
  pricePoints?: number[]
  overlap?: OverlapGroup
  cancel: CancelGuide
}

const APP_STORE_STEPS = [
  'iPhone: Settings → your name → Subscriptions → select the plan → Cancel Subscription.',
  'Android: Play Store → profile icon → Payments & subscriptions → Subscriptions → Cancel.',
  'Screenshot the confirmation screen — app-store cancellations are only reversible by you.',
]

export const MERCHANTS: Merchant[] = [
  // ── Streaming ──────────────────────────────────────────────────────────
  {
    key: 'netflix',
    name: 'Netflix',
    domain: 'netflix.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bnetflix\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.netflix.com/cancelplan',
      steps: ['Sign in on the web', 'Account → Membership → Cancel membership', 'Confirm — access continues to the end of the billing period'],
      darkPatterns: ['Plan-downgrade offer shown before the final confirm'],
    },
  },
  {
    key: 'hulu',
    name: 'Hulu',
    domain: 'hulu.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bhulu\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://secure.hulu.com/account',
      steps: ['Account → Cancel', 'Decline the “pause instead” offer', 'Continue to Cancel → confirm'],
      darkPatterns: ['Pause offered as the primary button', 'Bundles billed through Disney+ must be cancelled there'],
      tip: 'If you are on the Disney bundle, cancel from your Disney+ account instead.',
    },
  },
  {
    key: 'hbo-max',
    name: 'HBO Max',
    domain: 'hbomax.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bhbo ?max\b/, /\bmax com\b/, /\bwbd\b.*\bmax\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.hbomax.com/',
      steps: ['Profile → Settings → Subscription', 'Manage Subscription → Cancel Your Subscription', 'Skip the discounted-plan offer and confirm'],
      darkPatterns: ['Discount offer interstitial', 'Third-party billing (Apple, Roku, Amazon) must be cancelled with that provider'],
    },
  },
  {
    key: 'disney-plus',
    name: 'Disney+',
    domain: 'disneyplus.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bdisney ?plus\b/, /\bdisney\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.disneyplus.com/account',
      steps: ['Account → Subscription', 'Cancel Subscription → Complete Cancellation'],
      darkPatterns: ['Bundle downgrade suggested first'],
    },
  },
  {
    key: 'peacock',
    name: 'Peacock',
    domain: 'peacocktv.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bpeacock\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.peacocktv.com/account',
      steps: ['Account → Plans & Payment', 'Change Plan → Cancel Plan'],
      darkPatterns: [],
    },
  },
  {
    key: 'paramount-plus',
    name: 'Paramount+',
    domain: 'paramountplus.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bparamount\b/],
    overlap: 'video',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.paramountplus.com/account/',
      steps: ['Account → Cancel Subscription', 'Decline the discount → Yes, Cancel'],
      darkPatterns: ['Retention discount presented as the default choice'],
    },
  },
  {
    key: 'apple-tv',
    name: 'Apple TV+',
    domain: 'apple.com',
    category: 'Streaming',
    defaultCycle: 'monthly',
    aliases: [/\bapple tv\b/],
    pricePoints: [9.99, 12.99],
    overlap: 'video',
    cancel: {
      difficulty: 'easy',
      channel: 'app_store',
      url: 'https://apps.apple.com/account/subscriptions',
      steps: APP_STORE_STEPS,
      darkPatterns: [],
    },
  },
  {
    key: 'amazon-prime',
    name: 'Amazon Prime',
    domain: 'amazon.com',
    category: 'Shopping',
    defaultCycle: 'monthly',
    aliases: [/\bamazon prime\b/, /\bamzn prime\b/, /\bprime member/, /\bprime video\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'online',
      url: 'https://www.amazon.com/gp/primecentral',
      steps: [
        'Account → Prime Membership → Manage membership → End membership',
        'You will see up to three “are you sure” pages — keep choosing to cancel',
        'Stop at the page that says your membership has ended and save the confirmation email',
      ],
      darkPatterns: ['Multi-page retention flow', 'Remind-me-later and switch-to-annual offered as primary actions', 'Benefit-loss warnings at each step'],
      tip: 'Ask for a refund of the most recent charge if you have not used Prime benefits since it renewed.',
    },
  },

  // ── Music ──────────────────────────────────────────────────────────────
  {
    key: 'spotify',
    name: 'Spotify Premium',
    domain: 'spotify.com',
    category: 'Music',
    defaultCycle: 'monthly',
    aliases: [/\bspotify\b/],
    overlap: 'music',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.spotify.com/account/',
      steps: ['Account → Manage your plan → Cancel Premium', 'Confirm — you will drop to the free tier at period end'],
      darkPatterns: [],
    },
  },
  {
    key: 'apple-music',
    name: 'Apple Music',
    domain: 'apple.com',
    category: 'Music',
    defaultCycle: 'monthly',
    aliases: [/\bapple music\b/, /\bapple com bill\b/, /\bitunes\b/],
    pricePoints: [10.99, 16.99],
    overlap: 'music',
    cancel: {
      difficulty: 'easy',
      channel: 'app_store',
      url: 'https://apps.apple.com/account/subscriptions',
      steps: APP_STORE_STEPS,
      darkPatterns: [],
    },
  },
  {
    key: 'youtube-premium',
    name: 'YouTube Premium',
    domain: 'youtube.com',
    category: 'Music',
    defaultCycle: 'monthly',
    aliases: [/\byoutube ?premium\b/, /\bgoogle youtube\b/, /\byoutube music\b/],
    overlap: 'music',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.youtube.com/paid_memberships',
      steps: ['Purchases and memberships → YouTube Premium → Deactivate', 'Choose Continue to cancel, not Pause'],
      darkPatterns: ['Pause offered before cancel'],
    },
  },
  {
    key: 'siriusxm',
    name: 'SiriusXM',
    domain: 'siriusxm.com',
    category: 'Music',
    defaultCycle: 'monthly',
    aliases: [/\bsirius ?xm\b/, /\bsirius\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'chat',
      url: 'https://care.siriusxm.com/',
      steps: [
        'Sign in → Manage subscription; if online cancel isn’t offered, start a live chat',
        'Say “I want to cancel, I’m not interested in offers” and repeat it as needed',
        'Get the confirmation number before you leave the chat and save the transcript',
      ],
      darkPatterns: ['Mandatory retention conversation', 'Repeated discount offers', 'Promo rates that auto-renew at full price'],
      tip: 'Send the cancellation letter as well, so you have a dated written request on file.',
    },
  },

  // ── Cloud storage ──────────────────────────────────────────────────────
  {
    key: 'icloud',
    name: 'iCloud+',
    domain: 'apple.com',
    category: 'Cloud Storage',
    defaultCycle: 'monthly',
    aliases: [/\bicloud\b/, /\bapple com bill\b/],
    pricePoints: [0.99, 2.99, 9.99, 29.99],
    overlap: 'cloud',
    cancel: {
      difficulty: 'easy',
      channel: 'app_store',
      url: 'https://apps.apple.com/account/subscriptions',
      steps: ['iPhone: Settings → your name → iCloud → Manage Account Storage → Change Storage Plan → Downgrade Options'],
      darkPatterns: ['Storage-full warnings after downgrading'],
    },
  },
  {
    key: 'google-one',
    name: 'Google One',
    domain: 'one.google.com',
    category: 'Cloud Storage',
    defaultCycle: 'monthly',
    aliases: [/\bgoogle ?one\b/, /\bgoogle storage\b/],
    overlap: 'cloud',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://one.google.com/settings',
      steps: ['Settings → Cancel membership → confirm'],
      darkPatterns: [],
    },
  },
  {
    key: 'dropbox',
    name: 'Dropbox',
    domain: 'dropbox.com',
    category: 'Cloud Storage',
    defaultCycle: 'monthly',
    aliases: [/\bdropbox\b/],
    overlap: 'cloud',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.dropbox.com/account/plan',
      steps: ['Settings → Plan → Cancel plan', 'Skip the survey and discount → Cancel'],
      darkPatterns: ['Discount offer', 'Exit survey before confirm'],
    },
  },

  // ── Software & AI ──────────────────────────────────────────────────────
  {
    key: 'adobe',
    name: 'Adobe Creative Cloud',
    domain: 'adobe.com',
    category: 'Software',
    defaultCycle: 'monthly',
    aliases: [/\badobe\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'online',
      url: 'https://account.adobe.com/plans',
      steps: [
        'Plans → Manage plan → Cancel your plan',
        'Check whether you are on “annual, paid monthly” — cancelling mid-term can trigger an early termination fee',
        'If a fee is shown, ask chat support to waive it or switch to a month-to-month plan first',
      ],
      darkPatterns: ['Early termination fee buried in plan terms', 'Annual commitment presented as monthly price', 'Multiple retention offers'],
      tip: 'Cancelling within 14 days of the annual renewal usually avoids the fee.',
    },
  },
  {
    key: 'microsoft-365',
    name: 'Microsoft 365',
    domain: 'microsoft.com',
    category: 'Software',
    defaultCycle: 'monthly',
    aliases: [/\bmicrosoft ?365\b/, /\bmsft\b(?!.*xbox)/, /\boffice 365\b/],
    overlap: 'cloud',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://account.microsoft.com/services',
      steps: ['Services & subscriptions → Manage → Cancel subscription'],
      darkPatterns: ['Turn off recurring billing is the actual cancel action — the wording is easy to miss'],
    },
  },
  {
    key: 'chatgpt',
    name: 'ChatGPT Plus',
    domain: 'openai.com',
    category: 'AI Tools',
    defaultCycle: 'monthly',
    aliases: [/\bopenai\b/, /\bchatgpt\b/],
    overlap: 'ai',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://chatgpt.com/',
      steps: ['Profile → Settings → Account → Manage → Cancel subscription'],
      darkPatterns: [],
    },
  },
  {
    key: 'perplexity',
    name: 'Perplexity Pro',
    domain: 'perplexity.ai',
    category: 'AI Tools',
    defaultCycle: 'monthly',
    aliases: [/\bperplexity\b/],
    overlap: 'ai',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.perplexity.ai/settings/account',
      steps: ['Settings → Account → Manage subscription → Cancel'],
      darkPatterns: [],
    },
  },
  {
    key: 'canva',
    name: 'Canva Pro',
    domain: 'canva.com',
    category: 'Software',
    defaultCycle: 'monthly',
    aliases: [/\bcanva\b/],
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.canva.com/settings/billing-and-teams',
      steps: ['Settings → Billing & plans → Cancel subscription', 'Decline the pause offer'],
      darkPatterns: ['Pause offered first'],
    },
  },
  {
    key: 'grammarly',
    name: 'Grammarly',
    domain: 'grammarly.com',
    category: 'Software',
    defaultCycle: 'monthly',
    aliases: [/\bgrammarly\b/],
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://account.grammarly.com/subscription',
      steps: ['Account → Subscription → Cancel subscription'],
      darkPatterns: [],
    },
  },
  {
    key: 'linkedin-premium',
    name: 'LinkedIn Premium',
    domain: 'linkedin.com',
    category: 'Software',
    defaultCycle: 'monthly',
    aliases: [/\blinkedin\b/],
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.linkedin.com/premium/manage',
      steps: ['Me → Premium features → Manage Premium account → Cancel subscription', 'Continue past the discount offer'],
      darkPatterns: ['Discount offer', 'Feature-loss reminders'],
    },
  },

  // ── News & reading ─────────────────────────────────────────────────────
  {
    key: 'nytimes',
    name: 'The New York Times',
    domain: 'nytimes.com',
    category: 'News & Reading',
    defaultCycle: 'monthly',
    aliases: [/\bnytimes\b/, /\bny times\b/, /\bnew york times\b/, /\bnyt\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'chat',
      url: 'https://myaccount.nytimes.com/',
      steps: [
        'Account → Subscription overview → Cancel subscription (availability varies by region)',
        'If routed to chat, state you want to cancel and decline the reduced rate',
        'Save the chat transcript and confirmation email',
      ],
      darkPatterns: ['Intro rate that jumps after 12 months', 'Chat-only cancellation in some regions', 'Repeated retention offers'],
    },
  },
  {
    key: 'wsj',
    name: 'The Wall Street Journal',
    domain: 'wsj.com',
    category: 'News & Reading',
    defaultCycle: 'monthly',
    aliases: [/\bwsj\b/, /\bwall street journal\b/, /\bdow jones\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'chat',
      url: 'https://customercenter.wsj.com/',
      steps: ['Customer Center → Cancel subscription or start chat', 'Decline the retention rate and ask for written confirmation'],
      darkPatterns: ['Phone or chat required in many regions', 'Intro pricing that resets to full price'],
    },
  },
  {
    key: 'audible',
    name: 'Audible',
    domain: 'audible.com',
    category: 'News & Reading',
    defaultCycle: 'monthly',
    aliases: [/\baudible\b/],
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.audible.com/account/overview',
      steps: ['Spend your remaining credits first — they are lost on cancel', 'Account details → Cancel membership', 'Skip the pause and discount offers'],
      darkPatterns: ['Credit-loss warning', 'Pause and discount offers before cancel', 'Cannot cancel inside the iOS app'],
    },
  },

  // ── Fitness & wellness ─────────────────────────────────────────────────
  {
    key: 'planet-fitness',
    name: 'Planet Fitness',
    domain: 'planetfitness.com',
    category: 'Fitness',
    defaultCycle: 'monthly',
    aliases: [/\bplanet fitness\b/, /\bpf club\b/, /\bplanet fit\b/],
    cancel: {
      difficulty: 'nightmare',
      channel: 'mail',
      url: 'https://www.planetfitness.com/',
      steps: [
        'Check whether your home club allows online cancellation in the app',
        'If not, cancel in person at your home club or send a signed letter by certified mail',
        'Keep the certified-mail receipt — the annual fee may still bill if timing is close',
      ],
      darkPatterns: ['In-person or mailed cancellation', 'Separate annual fee on a different date', 'Home-club-only rules'],
      tip: 'Use the generated letter and send it certified with return receipt.',
    },
  },
  {
    key: 'peloton',
    name: 'Peloton',
    domain: 'onepeloton.com',
    category: 'Fitness',
    defaultCycle: 'monthly',
    aliases: [/\bpeloton\b/],
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://members.onepeloton.com/preferences/subscriptions',
      steps: ['Profile → Settings → Subscriptions → select membership → Cancel'],
      darkPatterns: ['Pause offer', 'Workout history loss warnings'],
    },
  },
  {
    key: 'headspace',
    name: 'Headspace',
    domain: 'headspace.com',
    category: 'Wellness',
    defaultCycle: 'yearly',
    aliases: [/\bheadspace\b/],
    overlap: 'meditation',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.headspace.com/subscriptions',
      steps: ['Account → Subscription → Cancel subscription', 'App-store purchases must be cancelled in the store'],
      darkPatterns: ['Annual renewal at full price after an intro discount'],
    },
  },
  {
    key: 'calm',
    name: 'Calm',
    domain: 'calm.com',
    category: 'Wellness',
    defaultCycle: 'yearly',
    aliases: [/\bcalm com\b/, /\bcalm\b/],
    overlap: 'meditation',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.calm.com/account',
      steps: ['Account → Manage subscription → Cancel'],
      darkPatterns: [],
    },
  },

  // ── Gaming ─────────────────────────────────────────────────────────────
  {
    key: 'xbox-game-pass',
    name: 'Xbox Game Pass',
    domain: 'xbox.com',
    category: 'Gaming',
    defaultCycle: 'monthly',
    aliases: [/\bxbox\b/, /\bgame ?pass\b/],
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://account.microsoft.com/services',
      steps: ['Services & subscriptions → Game Pass → Manage → Cancel subscription'],
      darkPatterns: ['“Turn off recurring billing” wording'],
    },
  },
  {
    key: 'playstation-plus',
    name: 'PlayStation Plus',
    domain: 'playstation.com',
    category: 'Gaming',
    defaultCycle: 'monthly',
    aliases: [/\bplaystation\b/, /\bsony ?ie\b/, /\bps plus\b/],
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.playstation.com/en-us/support/subscriptions/',
      steps: ['Account Management → Subscriptions Management → Turn Off Auto-Renew'],
      darkPatterns: [],
    },
  },

  // ── Food delivery & meal kits ──────────────────────────────────────────
  {
    key: 'dashpass',
    name: 'DoorDash DashPass',
    domain: 'doordash.com',
    category: 'Food Delivery',
    defaultCycle: 'monthly',
    aliases: [/\bdashpass\b/, /\bdoordash ?dashpass\b/],
    overlap: 'delivery',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.doordash.com/consumer/membership/',
      steps: ['Account → Manage DashPass → End subscription', 'Decline the pause offer'],
      darkPatterns: ['Pause offered first', 'Savings-to-date shown to discourage cancel'],
    },
  },
  {
    key: 'uber-one',
    name: 'Uber One',
    domain: 'uber.com',
    category: 'Food Delivery',
    defaultCycle: 'monthly',
    aliases: [/\buber ?one\b/],
    overlap: 'delivery',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.uber.com/',
      steps: ['App → Account → Uber One → Manage membership → End membership', 'Confirm through each benefit-reminder screen'],
      darkPatterns: ['Multiple confirm screens', 'Savings reminders'],
    },
  },
  {
    key: 'instacart-plus',
    name: 'Instacart+',
    domain: 'instacart.com',
    category: 'Food Delivery',
    defaultCycle: 'monthly',
    aliases: [/\binstacart\b/],
    overlap: 'delivery',
    cancel: {
      difficulty: 'easy',
      channel: 'online',
      url: 'https://www.instacart.com/store/account/instacart-plus',
      steps: ['Account → Instacart+ → Manage → End membership'],
      darkPatterns: [],
    },
  },
  {
    key: 'hellofresh',
    name: 'HelloFresh',
    domain: 'hellofresh.com',
    category: 'Food Delivery',
    defaultCycle: 'weekly',
    aliases: [/\bhellofresh\b/, /\bhello fresh\b/],
    overlap: 'meal_kit',
    cancel: {
      difficulty: 'nightmare',
      channel: 'online',
      url: 'https://www.hellofresh.com/my-account/settings',
      steps: [
        'Account settings → Plan settings → Cancel plan (not “Skip weeks”)',
        'Check the weekly cut-off — boxes already locked in will still ship and bill',
        'Confirm through the retention offers and save the email',
      ],
      darkPatterns: ['“Skip a week” shown instead of cancel', 'Weekly cut-off deadlines', 'Discount boxes to retain'],
    },
  },

  // ── Dating ─────────────────────────────────────────────────────────────
  {
    key: 'tinder',
    name: 'Tinder',
    domain: 'tinder.com',
    category: 'Dating',
    defaultCycle: 'monthly',
    aliases: [/\btinder\b/],
    overlap: 'dating',
    cancel: {
      difficulty: 'medium',
      channel: 'app_store',
      url: 'https://tinder.com/',
      steps: ['Cancel through the store you subscribed with — deleting the app does not cancel', ...APP_STORE_STEPS.slice(0, 2)],
      darkPatterns: ['Deleting the account does not stop billing'],
    },
  },
  {
    key: 'bumble',
    name: 'Bumble',
    domain: 'bumble.com',
    category: 'Dating',
    defaultCycle: 'monthly',
    aliases: [/\bbumble\b/],
    overlap: 'dating',
    cancel: {
      difficulty: 'medium',
      channel: 'app_store',
      url: 'https://bumble.com/',
      steps: ['Cancel through the store you subscribed with', ...APP_STORE_STEPS.slice(0, 2)],
      darkPatterns: ['Deleting the account does not stop billing'],
    },
  },

  // ── Security & VPN ─────────────────────────────────────────────────────
  {
    key: 'nordvpn',
    name: 'NordVPN',
    domain: 'nordvpn.com',
    category: 'Security & VPN',
    defaultCycle: 'yearly',
    aliases: [/\bnordvpn\b/, /\bnord ?account\b/, /\bnordsec\b/],
    overlap: 'vpn',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://my.nordaccount.com/',
      steps: ['Billing → Subscriptions → Cancel auto-renewal', 'If you were charged in the last 30 days, ask chat for a refund under the money-back guarantee'],
      darkPatterns: ['Intro price renews at a much higher rate', 'Auto-renew on by default'],
    },
  },
  {
    key: 'expressvpn',
    name: 'ExpressVPN',
    domain: 'expressvpn.com',
    category: 'Security & VPN',
    defaultCycle: 'yearly',
    aliases: [/\bexpressvpn\b/],
    overlap: 'vpn',
    cancel: {
      difficulty: 'medium',
      channel: 'online',
      url: 'https://www.expressvpn.com/subscriptions',
      steps: ['Account → Subscription → Turn off automatic renewal'],
      darkPatterns: ['Renews at a higher list price'],
    },
  },
  {
    key: 'norton',
    name: 'Norton 360',
    domain: 'norton.com',
    category: 'Security & VPN',
    defaultCycle: 'yearly',
    aliases: [/\bnorton\b/, /\bgen digital\b/],
    overlap: 'antivirus',
    cancel: {
      difficulty: 'nightmare',
      channel: 'online',
      url: 'https://my.norton.com/',
      steps: ['My Subscriptions → Automatic Renewal → Turn off', 'Request a refund if renewed within 60 days'],
      darkPatterns: ['Intro price renews at a much higher rate', 'Auto-renew toggle buried in subscription settings', 'Fear-based warnings'],
    },
  },
  {
    key: 'mcafee',
    name: 'McAfee',
    domain: 'mcafee.com',
    category: 'Security & VPN',
    defaultCycle: 'yearly',
    aliases: [/\bmcafee\b/],
    overlap: 'antivirus',
    cancel: {
      difficulty: 'nightmare',
      channel: 'online',
      url: 'https://home.mcafee.com/',
      steps: ['My Account → Auto-Renewal Settings → Turn off', 'Contact support for a refund if renewed recently'],
      darkPatterns: ['Auto-renew enabled by default', 'Renewal at list price', 'Fear-based warnings'],
    },
  },
]

const BY_KEY = new Map(MERCHANTS.map((m) => [m.key, m]))

export function getMerchant(key: string): Merchant | undefined {
  return BY_KEY.get(key)
}

/** Generic guide for merchants we don't have in the catalog. */
export const GENERIC_CANCEL_GUIDE: CancelGuide = {
  difficulty: 'medium',
  channel: 'online',
  url: '',
  steps: [
    'Look for Account → Billing / Subscription / Membership on the vendor’s website',
    'If there is no online cancel, send the generated cancellation email — it creates a dated written record',
    'If charges continue, dispute them with your card issuer and include the cancellation record',
  ],
  darkPatterns: [],
}

/** What to say on the phone or in chat when a vendor forces a retention call. */
export const PHONE_SCRIPT = [
  'Open with: “I’m calling to cancel my subscription effective today. Please process the cancellation.”',
  'Decline every offer with the same sentence: “No thank you, please proceed with the cancellation.” Don’t explain why.',
  'Ask for a cancellation or reference number and the agent’s name, and write down the date and time.',
  'Ask: “Can you confirm there will be no further charges?” — then ask for written confirmation by email.',
  'If they refuse, say: “Please note that I have requested cancellation. I will be revoking payment authorization with my bank.”',
]
