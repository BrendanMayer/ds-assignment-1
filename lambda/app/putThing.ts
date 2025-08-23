import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { doc } from '../shared/db'

export const handler = async (event: any) => {
  const table = process.env.TABLE_NAME as string
  const pk = decodeURIComponent(event.pathParameters.pk)
  const sk = decodeURIComponent(event.pathParameters.sk)
  const body = JSON.parse(event.body || '{}')
  const claims = event.requestContext.authorizer && event.requestContext.authorizer.claims ? event.requestContext.authorizer.claims : null
  const sub = claims && claims.sub ? claims.sub : ''
  const existing = await doc.send(new GetCommand({ TableName: table, Key: { pk, sk } }))
  if (!existing.Item) return { statusCode: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Not found' }) }
  if (existing.Item.owner !== sub) return { statusCode: 403, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Forbidden' }) }
  const fields: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, any> = {}
  if (typeof body.title === 'string') { names['#t'] = 'title'; values[':t'] = body.title; fields.push('#t = :t') }
  if (typeof body.description === 'string') { names['#d'] = 'description'; values[':d'] = body.description; fields.push('#d = :d'); names['#tr'] = 'translations'; values[':empty'] = {}; fields.push('#tr = :empty') }
  if (typeof body.rating === 'number') { names['#r'] = 'rating'; values[':r'] = body.rating; fields.push('#r = :r') }
  if (!fields.length) return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'No updatable fields' }) }
  await doc.send(new UpdateCommand({
    TableName: table,
    Key: { pk, sk },
    UpdateExpression: 'SET ' + fields.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) }
}
