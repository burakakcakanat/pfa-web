import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text } from './pfa-layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <PfaEmailLayout
    preview="E-posta değişikliğinizi onaylayın"
    title="E-posta değişikliğinizi onaylayın"
    ctaLabel="Değişikliği onayla"
    ctaHref={confirmationUrl}
    footer="Bu değişikliği siz talep etmediyseniz hesabınızın güvenliğini hemen gözden geçirin."
  >
    <Text style={text}>
      Hesabınızın e-posta adresini {oldEmail} yerine {newEmail} olarak değiştirme
      talebi aldık. Onaylamak için aşağıdaki düğmeye dokunun.
    </Text>
  </PfaEmailLayout>
)

export default EmailChangeEmail
