// Central, typed access to environment configuration.
//
// Every integration is optional at boot. When Supabase isn't configured the
// whole app runs in demo mode on a seeded dataset (see lib/demo), so the
// product can be explored locally before any keys exist.

function read(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value && value.trim() !== '') return value.trim()
  }
  return undefined
}

export const env = {
  appUrl: (read('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000').replace(/\/$/, ''),

  supabaseUrl: read('NEXT_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: read('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseSecretKey: read('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),

  plaidClientId: read('PLAID_CLIENT_ID'),
  plaidSecret: read('PLAID_SECRET'),
  plaidEnv: (read('PLAID_ENV') ?? 'sandbox') as 'sandbox' | 'production',

  stripeSecretKey: read('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: read('STRIPE_WEBHOOK_SECRET'),
  stripePriceMonthly: read('STRIPE_PRICE_MONTHLY'),
  stripePriceYearly: read('STRIPE_PRICE_YEARLY'),

  resendApiKey: read('RESEND_API_KEY'),
  emailFrom: read('EMAIL_FROM') ?? 'SubShield <alerts@subshield.app>',
  cancellationFrom: read('CANCELLATION_FROM') ?? 'SubShield Cancellations <cancel@subshield.app>',

  googleClientId: read('GOOGLE_CLIENT_ID'),
  googleClientSecret: read('GOOGLE_CLIENT_SECRET'),
  microsoftClientId: read('MICROSOFT_CLIENT_ID'),
  microsoftClientSecret: read('MICROSOFT_CLIENT_SECRET'),

  twilioAccountSid: read('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: read('TWILIO_AUTH_TOKEN'),
  twilioFrom: read('TWILIO_FROM_NUMBER'),

  tokenEncryptionKey: read('TOKEN_ENCRYPTION_KEY'),
  cronSecret: read('CRON_SECRET'),
}

export const features = {
  supabase: Boolean(env.supabaseUrl && env.supabasePublishableKey && env.supabaseSecretKey),
  plaid: Boolean(env.plaidClientId && env.plaidSecret),
  stripe: Boolean(env.stripeSecretKey && env.stripePriceMonthly && env.stripePriceYearly),
  resend: Boolean(env.resendApiKey),
  google: Boolean(env.googleClientId && env.googleClientSecret),
  microsoft: Boolean(env.microsoftClientId && env.microsoftClientSecret),
  twilio: Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFrom),
}

/** True when the app has no database and should run on the demo dataset. */
export const isDemo = !features.supabase

export function requireEnv<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
