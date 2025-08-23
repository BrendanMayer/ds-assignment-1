import { CognitoIdentityProviderClient, GlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || '{}')
  await client.send(new GlobalSignOutCommand({ AccessToken: body.accessToken }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) }
}
