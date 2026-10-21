import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getViewer } from '@/lib/auth'
import { signState } from '@/lib/crypto'
import { features } from '@/lib/env'
import { authorizeUrl, isMailProvider } from '@/lib/integrations/email-oauth'

// Starts the Gmail / Outlook OAuth flow. State is HMAC-signed and bound to a
// one-time nonce cookie so a callback can't be replayed or forged.
export async function GET(request: NextRequest, ctx: RouteContext<'/api/connect/[provider]'>) {
  const { provider } = await ctx.params
  const back = new URL('/dashboard/connections', request.nextUrl.origin)
  if (!isMailProvider(provider)) return NextResponse.redirect(back)

  const viewer = await getViewer()
  if (!viewer) return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
  if (viewer.mode === 'demo' || !features[provider]) {
    back.searchParams.set('error', `${provider}-not-configured`)
    return NextResponse.redirect(back)
  }

  const nonce = randomBytes(16).toString('base64url')
  const res = NextResponse.redirect(authorizeUrl(provider, signState({ uid: viewer.id, nonce, provider })))
  res.cookies.set('ss_oauth_nonce', nonce, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/connect', maxAge: 600 })
  return res
}
