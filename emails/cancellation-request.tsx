import { Body, Container, Head, Hr, Html, Preview, Text } from '@react-email/components'

// Deliberately plain: vendor support desks treat this like any customer letter.
export function CancellationRequestEmail({ body, senderName }: { body: string; senderName: string }) {
  const paragraphs = body.split(/\n{2,}/)
  return (
    <Html lang="en">
      <Head />
      <Preview>{paragraphs[1]?.slice(0, 120) ?? 'Cancellation request'}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827' }}>
        <Container style={{ maxWidth: 600, padding: '24px 16px' }}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={{ fontSize: 14, lineHeight: '22px', whiteSpace: 'pre-line', margin: '0 0 14px' }}>
              {p}
            </Text>
          ))}
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 12px' }} />
          <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: '16px' }}>
            Sent on behalf of {senderName} via SubShield. Replies go directly to {senderName}, who is copied on this message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
