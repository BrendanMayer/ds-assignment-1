import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb'
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export class MainStack extends cdk.Stack {
  readonly table: Table
  readonly appApi: RestApi

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.table = new Table(this, 'ThingsTable', {
    partitionKey: { name: 'pk', type: AttributeType.STRING },
    sortKey: { name: 'sk', type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    deletionProtection: false
  })

    this.appApi = new RestApi(this, 'AppApi', {
      restApiName: 'AppApi',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS
      }
    })

    const getThingsFn = new NodejsFunction(this, 'GetThingsFn', {
      entry: path.join(__dirname, '../lambda/app/getThings.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: this.table.tableName }
    })
    this.table.grantReadData(getThingsFn)

    const things = this.appApi.root.addResource('things')
    const byPk = things.addResource('{pk}')
    byPk.addMethod('GET', new LambdaIntegration(getThingsFn))
  }
}
