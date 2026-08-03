import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text } from './pfa-layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <PfaEmailLayout
    preview="Psiko-Fonksiyonel Analiz'e davet edildiniz"
    title="Davet edildiniz"
    ctaLabel="Daveti kabul et"
    ctaHref={confirmationUrl}
    footer="Böyle bir davet beklemiyorsanız bu e-postayı yok sayabilirsiniz."
  >
    <Text style={text}>
      Psiko-Fonksiyonel Analiz platformuna davet edildiniz. Hesabınızı oluşturmak
      için aşağıdaki düğmeye dokunun.
    </Text>
  </PfaEmailLayout>
)

export default InviteEmail
