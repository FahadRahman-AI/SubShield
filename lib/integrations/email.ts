import 'server-only'
import { Resend } from 'resend'
import { AlertDigestEmail, type DigestItem } from '@/emails/alert-digest'
import { CancellationRequestEmail } from '@/emails/cancellation-request'
import { env, requireEnv } from '@/lib/env'

let client: Resend | null = null
function resend() {
  if (!client) client = new Resend(requireEnv(env.resendApiKey, 'RESEND_API_KEY'))
  return client
}

export async function sendCancellationRequest(opts: {
  to: string
  userEmail: string
  userName: string
  subject: string
  body: string
  idempotencyKey: string
}) {
  const { data, error } = await resend().emails.send(
    {
      from: env.cancellationFrom,
      to: opts.to,
      cc: opts.userEmail,
      replyTo: opts.userEmail,
      subject: opts.subject,
      text: opts.body,
      react: CancellationRequestEmail({ body: opts.body, senderName: opts.userName }),
      tags: [{ name: 'type', value: 'cancellation' }],
    },
    { idempotencyKey: opts.idempotencyKey },
  )
  if (error) throw new Error(`Resend: ${error.message}`)
  return data?.id ?? null
}

export async function sendAlertDigest(opts: { to: string; subject: string; heading: string; intro: string; items: DigestItem[]; path?: string }) {
  const { error } = await resend().emails.send({
    from: env.emailFrom,
    to: opts.to,
    subject: opts.subject,
    react: AlertDigestEmail({ heading: opts.heading, intro: opts.intro, items: opts.items, ctaUrl: `${env.appUrl}${opts.path ?? '/dashboard'}` }),
    tags: [{ name: 'type', value: 'alert' }],
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}
