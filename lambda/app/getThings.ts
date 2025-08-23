import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { doc } from '../shared/db'

export const handler = async (event: any) => {
  const table = process.env.TABLE_NAME as string
  const pk = decodeURIComponent(event.pathParameters.pk)
  const res = await doc.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': pk }
  }))
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(res.Items || []) }
}
