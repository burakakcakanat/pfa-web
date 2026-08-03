import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text } from './pfa-layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <PfaEmailLayout
    preview="Giriş bağlantınız"
    title="Giriş bağlantınız"
    ctaLabel="Giriş yap"
    ctaHref={confirmationUrl}
    footer="Bu bağlantıyı siz istemediyseniz bu e-postayı yok sayabilirsiniz."
  >
    <Text style={text}>
      Hesabınıza giriş yapmak için aşağıdaki düğmeye dokunun. Bağlantı kısa süre
      sonra geçersiz olur.
    </Text>
  </PfaEmailLayout>
)

export default MagicLinkEmail
