import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { doc } from '../shared/db'

function containsAny(s: string, q: string) {
  return s.toLowerCase().includes(q.toLowerCase())
}

export const handler = async (event: any) => {
  const table = process.env.TABLE_NAME as string
  const pk = decodeURIComponent(event.pathParameters.pk)
  const ratingGte = event.queryStringParameters && event.queryStringParameters.ratingGte ? Number(event.queryStringParameters.ratingGte) : undefined
  const containsQ = event.queryStringParameters && event.queryStringParameters.contains ? String(event.queryStringParameters.contains) : undefined
  const res = await doc.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': pk }
  }))
  let items = res.Items || []
  if (typeof ratingGte === 'number' && !Number.isNaN(ratingGte)) {
    items = items.filter(x => typeof x.rating === 'number' && x.rating >= ratingGte)
  }
  if (containsQ) {
    items = items.filter(x => {
      const t = String(x.title || '')
      const d = String(x.description || '')
      return containsAny(t, containsQ) || containsAny(d, containsQ)
    })
  }
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(items) }
}
