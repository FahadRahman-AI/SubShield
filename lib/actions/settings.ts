'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth'
import { writeDemoState } from '@/lib/demo/state'
import { createClient } from '@/lib/supabase/server'

const SettingsInput = z.object({
  region: z.enum(['US', 'UK', 'EU', 'CA', 'AU']),
  alertEmail: z.boolean(),
  alertSms: z.boolean(),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +14155550123')
    .or(z.literal(''))
    .nullable(),
})

export async function updateSettings(input: z.infer<typeof SettingsInput>): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await requireViewer()
  const parsed = SettingsInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid settings.' }
  const { region, alertEmail, alertSms } = parsed.data
  const phone = parsed.data.phone || null
  if (alertSms && !phone) return { ok: false, error: 'Add a phone number to get SMS alerts.' }

  if (viewer.mode === 'demo') {
    await writeDemoState({ region, alertEmail, alertSms, phone })
  } else {
    // Goes through RLS: users may only update these preference columns.
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').update({ region, alert_email: alertEmail, alert_sms: alertSms, phone }).eq('id', viewer.id)
    if (error) return { ok: false, error: 'Couldn’t save settings.' }
  }
  refresh()
  return { ok: true }
}
