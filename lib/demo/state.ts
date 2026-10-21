import 'server-only'
import { cookies } from 'next/headers'
import type { Region, SubStatus } from '@/lib/data/types'

// Demo mode keeps the visitor's state in one small cookie: whether they've
// "connected", whether they've "upgraded", and any statuses they've changed.

const COOKIE = 'ss_demo'

export interface DemoState {
  connected: boolean
  emailConnected: boolean
  pro: boolean
  plan: 'monthly' | 'yearly' | null
  statuses: Record<string, SubStatus>
  sent: Record<string, string>
  region: Region
  alertEmail: boolean
  alertSms: boolean
  phone: string | null
}

export const DEFAULT_DEMO: DemoState = {
  connected: false,
  emailConnected: false,
  pro: false,
  plan: null,
  statuses: {},
  sent: {},
  region: 'US',
  alertEmail: true,
  alertSms: false,
  phone: null,
}

export async function readDemoState(): Promise<DemoState> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return DEFAULT_DEMO
  try {
    return { ...DEFAULT_DEMO, ...JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) }
  } catch {
    return DEFAULT_DEMO
  }
}

/** Only callable from Server Actions / Route Handlers. */
export async function writeDemoState(patch: Partial<DemoState>): Promise<DemoState> {
  const next = { ...(await readDemoState()), ...patch }
  ;(await cookies()).set(COOKIE, Buffer.from(JSON.stringify(next)).toString('base64url'), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return next
}

export async function clearDemoState() {
  ;(await cookies()).delete(COOKIE)
}
