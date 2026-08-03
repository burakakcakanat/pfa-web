import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = 'PFA — PSİKO-FONKSİYONEL ANALİZ'

interface LayoutProps {
  preview: string
  title: string
  children: React.ReactNode
  ctaLabel?: string
  ctaHref?: string
  footer?: string
}

export const PfaEmailLayout = ({
  preview,
  title,
  children,
  ctaLabel,
  ctaHref,
  footer,
}: LayoutProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={card}>
          <Text style={brand}>{BRAND}</Text>
          <div style={rule} />
          <Heading style={h1}>{title}</Heading>
          {children}
          {ctaLabel && ctaHref ? (
            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button style={button} href={ctaHref}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}
          {footer ? <Text style={footerText}>{footer}</Text> : null}
          <Text style={signature}>
            Psiko-Fonksiyonel Analiz · psychofunctionalanalysis.com
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const text = {
  fontSize: '15px',
  color: '#2a3a3e',
  lineHeight: '1.7',
  margin: '0 0 16px',
}

export const code = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  letterSpacing: '.16em',
  fontWeight: 'bold' as const,
  color: '#0F4C4C',
  margin: '8px 0 24px',
  textAlign: 'center' as const,
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, system-ui, -apple-system, Arial, sans-serif',
  margin: '0',
}
const outer = { padding: '24px 12px', maxWidth: '600px' }
const card = {
  backgroundColor: '#FFFDF7',
  border: '1px solid #E6DFCF',
  borderRadius: '8px',
  padding: '28px 32px',
}
const brand = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '14px',
  letterSpacing: '.22em',
  color: '#0F4C4C',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const rule = {
  height: '2px',
  background: 'linear-gradient(90deg,#FFFDF7,#C9A96A,#FFFDF7)',
  margin: '0 0 24px',
}
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '23px',
  fontWeight: 'normal' as const,
  color: '#1F4E52',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#0F4C4C',
  color: '#F7F3EA',
  fontSize: '14px',
  letterSpacing: '.02em',
  borderRadius: '6px',
  padding: '13px 26px',
  textDecoration: 'none',
}
const footerText = {
  fontSize: '12px',
  color: '#6b6355',
  lineHeight: '1.6',
  margin: '20px 0 0',
}
const signature = {
  fontSize: '11px',
  color: '#6b6355',
  textAlign: 'center' as const,
  borderTop: '1px solid #EEE5D0',
  paddingTop: '16px',
  margin: '22px 0 0',
}