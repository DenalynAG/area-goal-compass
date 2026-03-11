/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InternalNotificationProps {
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  siteName?: string
}

export const InternalNotificationEmail = ({
  title = 'Notificación',
  message = '',
  actionUrl,
  actionLabel = 'Ver en EasyConnect OSH',
  siteName = 'EasyConnect OSH',
}: InternalNotificationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{title} — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          width="60"
          height="60"
          alt="EasyConnect OSH"
          style={logo}
        />
        <Heading style={h1}>{title}</Heading>
        <Text style={text}>{message}</Text>

        {actionUrl && (
          <Button style={button} href={actionUrl}>
            {actionLabel}
          </Button>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Notificación interna de {siteName}. Este es un mensaje automático del sistema.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InternalNotificationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { borderRadius: '12px', marginBottom: '20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 30%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 15%, 50%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: 'hsl(116, 21%, 45%)',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
  margin: '0 0 24px',
}
const hr = { borderColor: '#e8ede8', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
