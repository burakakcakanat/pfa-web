import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text } from './pfa-layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <PfaEmailLayout
    preview="Şifrenizi yenileyin"
    title="Şifrenizi yenileyin"
    ctaLabel="Yeni şifre belirle"
    ctaHref={confirmationUrl}
    footer="Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez. Bağlantı kısa süre sonra geçersiz olur."
  >
    <Text style={text}>
      Hesabınız için şifre yenileme talebi aldık. Yeni şifrenizi belirlemek için
      aşağıdaki düğmeye dokunun.
    </Text>
  </PfaEmailLayout>
)

export default RecoveryEmail
