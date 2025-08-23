import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const translate = new TranslateClient({})
const TABLE_NAME = process.env.TABLE_NAME as string

function ok(body: any) {
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}
function notFound() {
  return { statusCode: 404, body: 'Not found' }
}
function bad() {
  return { statusCode: 400, body: 'Bad request' }
}

export const handler = async (event: any) => {
  const pk = event.pathParameters?.pk ? decodeURIComponent(event.pathParameters.pk) : ''
  const sk = event.pathParameters?.sk ? decodeURIComponent(event.pathParameters.sk) : ''
  const lang = (event.queryStringParameters?.language || 'fr').toLowerCase()
  if (!pk || !sk) return bad()

  const got = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }))
  const it: any = got.Item
  if (!it) return notFound()

  it.translations = it.translations || {}
  if (it.translations[lang]) return ok(it.translations[lang])

  const fields = ['title', 'description']
  const translated: any = { ...it, language: lang }
  for (const f of fields) {
    const v = it[f]
    if (typeof v === 'string' && v.length > 0) {
      const r = await translate.send(new TranslateTextCommand({ SourceLanguageCode: 'auto', TargetLanguageCode: lang, Text: v }))
      translated[f] = r.TranslatedText ?? v
    }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: 'SET #t.#l = :v',
    ExpressionAttributeNames: { '#t': 'translations', '#l': lang },
    ExpressionAttributeValues: { ':v': translated }
  }))

  return ok(translated)
}
