// Company details used by the Privacy Policy and Terms. Fill these in once
// your company is formed and registered with the ICO; until then the legal
// pages show a "draft" banner. Have a UK solicitor review both documents
// before taking payments.

export const LEGAL = {
  companyName: '[Company name] Ltd',
  companyNumber: '[Companies House number]',
  registeredAddress: '[Registered office address]',
  icoRegistration: '[ICO registration number]',
  contactEmail: 'privacy@subshield.app',
  supportEmail: 'support@subshield.app',
  lastUpdated: '2026-10-23',
} as const

/** True while any company detail is still a placeholder. */
export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((v) => v.startsWith('['))

/** People must be at least this old to use SubShield. */
export const MINIMUM_AGE = 18

/** Days before a yearly Pro plan renews that we email a reminder. */
export const RENEWAL_REMINDER_DAYS = 30

/** What a user types to confirm deleting their account. */
export const DELETE_CONFIRMATION = 'DELETE'
