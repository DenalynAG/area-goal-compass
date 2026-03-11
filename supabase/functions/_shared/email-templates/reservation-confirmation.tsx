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
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReservationConfirmationProps {
  guestName: string
  reservationId: string
  checkIn: string
  checkOut: string
  roomType: string
  guests: number
  notes?: string
  siteName?: string
  siteUrl?: string
}

export const ReservationConfirmationEmail = ({
  guestName = 'Huésped',
  reservationId = 'RES-000',
  checkIn = '',
  checkOut = '',
  roomType = '',
  guests = 1,
  notes,
  siteName = 'EasyConnect OSH',
  siteUrl = 'https://oshpitalitygroup.com',
}: ReservationConfirmationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirmación de reserva {reservationId} — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          width="60"
          height="60"
          alt="EasyConnect OSH"
          style={logo}
        />
        <Heading style={h1}>Confirmación de Reserva</Heading>
        <Text style={text}>
          Hola <strong>{guestName}</strong>, tu reserva ha sido confirmada exitosamente.
        </Text>

        <Section style={detailsCard}>
          <Text style={detailLabel}>Número de reserva</Text>
          <Text style={detailValue}>{reservationId}</Text>

          <Text style={detailLabel}>Check-in</Text>
          <Text style={detailValue}>{checkIn}</Text>

          <Text style={detailLabel}>Check-out</Text>
          <Text style={detailValue}>{checkOut}</Text>

          <Text style={detailLabel}>Tipo de habitación</Text>
          <Text style={detailValue}>{roomType}</Text>

          <Text style={detailLabel}>Huéspedes</Text>
          <Text style={detailValue}>{guests}</Text>

          {notes && (
            <>
              <Text style={detailLabel}>Notas</Text>
              <Text style={detailValue}>{notes}</Text>
            </>
          )}
        </Section>

        <Button style={button} href={siteUrl}>
          Ver en EasyConnect OSH
        </Button>

        <Hr style={hr} />

        <Text style={footer}>
          Este correo fue enviado automáticamente por {siteName}. Si tienes alguna pregunta,
          contacta a nuestro equipo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReservationConfirmationEmail

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
const detailsCard = {
  backgroundColor: '#f8faf8',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 24px',
  border: '1px solid #e8ede8',
}
const detailLabel = {
  fontSize: '11px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 15%, 50%)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '12px 0 2px',
}
const detailValue = {
  fontSize: '15px',
  color: 'hsl(220, 30%, 15%)',
  margin: '0 0 4px',
  fontWeight: '500' as const,
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
