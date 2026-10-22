import { describe, expect, it } from 'vitest'
import { isBankRegionRestricted, visitorCountry } from './geo'

describe('bank region gate', () => {
  it('restricts the UK and EEA, not the US or unknown visitors', () => {
    expect(isBankRegionRestricted('GB')).toBe(true)
    expect(isBankRegionRestricted('DE')).toBe(true)
    expect(isBankRegionRestricted('NO')).toBe(true)
    expect(isBankRegionRestricted('US')).toBe(false)
    expect(isBankRegionRestricted(null)).toBe(false)
  })

  it('reads only well-formed country codes from the edge header', () => {
    expect(visitorCountry(new Headers({ 'x-vercel-ip-country': 'GB' }))).toBe('GB')
    expect(visitorCountry(new Headers({ 'x-vercel-ip-country': 'gb<script>' }))).toBeNull()
    expect(visitorCountry(new Headers())).toBeNull()
  })
})
