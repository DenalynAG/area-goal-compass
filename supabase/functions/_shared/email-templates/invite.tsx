/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te han invitado a EasyConnect OSH</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          width="60"
          height="60"
          alt="EasyConnect OSH"
          style={logo}
        />
        <Heading style={h1}>Has sido invitado</Heading>
        <Text style={text}>
          Te han invitado a unirte a{' '}
          <Link href={siteUrl} style={link}>
            <strong>EasyConnect OSH</strong>
          </Link>
          , la plataforma de Gestión Estratégica Hotelera. Haz clic en el botón a continuación para aceptar la invitación.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Aceptar Invitación
        </Button>
        <Text style={footer}>
          Si no esperabas esta invitación, puedes ignorar este correo con seguridad.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: 'hsl(116, 21%, 45%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(116, 21%, 45%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
