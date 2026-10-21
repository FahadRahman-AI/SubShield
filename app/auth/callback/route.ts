import { NextResponse, type NextRequest } from 'next/server'
import { isDemo } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

// Magic-link and OAuth sign-ins land here with a PKCE code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/dashboard') ? nextParam : '/dashboard'

  if (isDemo) return NextResponse.redirect(`${origin}/dashboard`)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=callback`)
}
