import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

export interface DigestItem {
  title: string
  detail: string
  amount?: string
  tone?: 'leak' | 'warn' | 'insight'
}

// Mirrors the web palette (app/globals.css): page, panel, ink, accent pills.
const C = {
  page: '#f1eee9',
  panel: '#e7e2da',
  ink: '#3c3c3c',
  dim: '#555555',
  coral: '#f6825d',
}
const TONE = { leak: '#dc5b5b', warn: '#f6d45d', insight: '#8f80dc' } as const
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export function AlertDigestEmail({
  heading,
  intro,
  items,
  ctaUrl,
  ctaLabel = 'Open SubShield',
}: {
  heading: string
  intro: string
  items: DigestItem[]
  ctaUrl: string
  ctaLabel?: string
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{intro}</Preview>
      <Body style={{ backgroundColor: C.page, fontFamily: FONT, color: C.ink, margin: 0 }}>
        <Container style={{ maxWidth: 560, padding: '40px 20px' }}>
          <Text style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.05em', margin: 0 }}>
            subshield<span style={{ display: 'inline-block', width: 8, height: 8, marginLeft: 2, backgroundColor: C.coral }} />
          </Text>
          <Heading style={{ fontSize: 30, lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.04em', margin: '32px 0 10px', color: C.ink }}>{heading}</Heading>
          <Text style={{ fontSize: 15, lineHeight: '24px', color: C.dim, margin: '0 0 24px' }}>{intro}</Text>
          {items.map((item, i) => (
            <Section key={i} style={{ backgroundColor: C.panel, padding: '14px 16px', marginBottom: 3 }}>
              <Text style={{ fontSize: 15, color: C.ink, margin: 0 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 8, backgroundColor: TONE[item.tone ?? 'leak'] }} />
                {item.title}
                {item.amount ? <span style={{ float: 'right', fontWeight: 600 }}>{item.amount}</span> : null}
              </Text>
              <Text style={{ fontSize: 13, color: C.dim, margin: '4px 0 0 16px' }}>{item.detail}</Text>
            </Section>
          ))}
          <Button href={ctaUrl} style={{ backgroundColor: C.ink, color: '#ffffff', fontSize: 14, padding: '14px 24px', marginTop: 20 }}>
            {ctaLabel}
          </Button>
          <Hr style={{ borderColor: '#d7d1c7', margin: '32px 0 16px' }} />
          <Text style={{ fontSize: 12, color: C.dim }}>You’re getting this because alerts are on in your SubShield settings.</Text>
        </Container>
      </Body>
    </Html>
  )
}
