import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || '{}')
  await client.send(new ConfirmSignUpCommand({
    ClientId: process.env.USER_POOL_CLIENT_ID,
    Username: body.email,
    ConfirmationCode: body.code
  }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) }
}
