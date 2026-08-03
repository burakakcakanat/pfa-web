import * as React from 'react'

import { Text } from '@react-email/components'
import { PfaEmailLayout, text, code } from './pfa-layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <PfaEmailLayout
    preview="Doğrulama kodunuz"
    title="Kimliğinizi doğrulayın"
    footer="Kod kısa süre sonra geçersiz olur. Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz."
  >
    <Text style={text}>Aşağıdaki kodu kullanarak kimliğinizi doğrulayın:</Text>
    <Text style={code}>{token}</Text>
  </PfaEmailLayout>
)

export default ReauthenticationEmail
