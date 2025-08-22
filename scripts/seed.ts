import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const table = process.env.TABLE_NAME || ''
const client = new DynamoDBClient({})
const doc = DynamoDBDocumentClient.from(client)

async function main() {
  const items = [
    { pk: 'group#books', sk: 'item#1', title: 'Intro to Systems', description: 'a long text about distributed systems and patterns in the real world.', rating: 4, owner: 'seed' },
    { pk: 'group#books', sk: 'item#2', title: 'Serverless Notes', description: 'notes about aws lambda, api gateway, and dynamodb for students.', rating: 5, owner: 'seed' },
    { pk: 'group#games', sk: 'item#1', title: 'Cloud Quest', description: 'A quest game that talks about cloud services and how to use them.', rating: 3, owner: 'seed' }
  ]
  for (const it of items) {
    await doc.send(new PutCommand({ TableName: table, Item: it }))
  }
  console.log('Seeded')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})