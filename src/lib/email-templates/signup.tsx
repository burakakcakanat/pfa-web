import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text } from './pfa-layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <PfaEmailLayout
    preview="E-posta adresinizi onaylayın"
    title="E-posta adresinizi onaylayın"
    ctaLabel="E-postamı onayla"
    ctaHref={confirmationUrl}
    footer="Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz."
  >
    <Text style={text}>
      Psiko-Fonksiyonel Analiz'e hoş geldiniz. Kaydınızı tamamlamak için{' '}
      {recipient} adresini aşağıdaki düğmeyle onaylayın.
    </Text>
  </PfaEmailLayout>
)

export default SignupEmail
