import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || '{}')
  const res = await client.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.USER_POOL_CLIENT_ID,
    AuthParameters: { USERNAME: body.email, PASSWORD: body.password }
  }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(res.AuthenticationResult || {}) }
}
