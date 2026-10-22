// Where bank connections are allowed. Reading bank data through open banking
// is a regulated activity in the UK (FCA) and the EEA, so until SubShield has
// that cover, only US banks can be connected. The hard limit is the Plaid
// link token (US institutions only); this list just lets the UI explain it.

const UK_AND_EEA = new Set([
  'GB', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
])

/** Country code from Vercel's edge (`x-vercel-ip-country`), or null when unknown (local dev). */
export function visitorCountry(headers: Headers): string | null {
  const code = headers.get('x-vercel-ip-country')
  return code && /^[A-Z]{2}$/.test(code) ? code : null
}

export function isBankRegionRestricted(country: string | null): boolean {
  return country !== null && UK_AND_EEA.has(country)
}
