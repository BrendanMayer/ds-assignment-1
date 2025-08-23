import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { doc } from '../shared/db'
import crypto from 'crypto'

export const handler = async (event: any) => {
  const table = process.env.TABLE_NAME as string
  const now = Date.now()
  const body = JSON.parse(event.body || '{}')
  const owner = body.owner || 'anonymous'
  const pk = body.pk
  const sk = body.sk || `item#${crypto.randomUUID()}`
  const title = body.title
  const description = body.description
  const rating = Number(body.rating)
  const item = { pk, sk, title, description, rating, owner, createdAt: now }
  await doc.send(new PutCommand({ TableName: table, Item: item }))
  return { statusCode: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) }
}
