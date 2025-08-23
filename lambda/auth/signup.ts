import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider'

const client = new CognitoIdentityProviderClient({})
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || '{}')
  const res = await client.send(new SignUpCommand({
    ClientId: process.env.USER_POOL_CLIENT_ID,
    Username: body.email,
    Password: body.password,
    UserAttributes: [{ Name: 'email', Value: body.email }]
  }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userSub: res.UserSub }) }
}
