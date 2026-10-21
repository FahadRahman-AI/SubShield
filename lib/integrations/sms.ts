import 'server-only'
import { env, features } from '@/lib/env'

/** Sends an SMS through Twilio's REST API. No-op when Twilio isn't configured. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!features.twilio) return false
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: env.twilioFrom!, Body: body }),
  })
  return res.ok
}
