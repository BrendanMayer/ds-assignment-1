import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb'
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { UserPool, UserPoolClient, AccountRecovery } from 'aws-cdk-lib/aws-cognito'
import * as path from 'path'

export class MainStack extends cdk.Stack {
  readonly table: Table
  readonly appApi: RestApi
  readonly authApi: RestApi
  readonly userPool: UserPool
  readonly userPoolClient: UserPoolClient

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

    const postThingFn = new NodejsFunction(this, 'PostThingFn', {
      entry: path.join(__dirname, '../lambda/app/postThing.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: this.table.tableName }
    })
    this.table.grantWriteData(postThingFn)

    const things = this.appApi.root.addResource('things')
    things.addMethod('POST', new LambdaIntegration(postThingFn))
    const byPk = things.addResource('{pk}')
    byPk.addMethod('GET', new LambdaIntegration(getThingsFn))

    this.userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY
    })
    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      authFlows: { userPassword: true },
      generateSecret: false
    })

    this.authApi = new RestApi(this, 'AuthApi', {
      restApiName: 'AuthApi',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS
      }
    })

    const baseAuthEnv = {
      USER_POOL_ID: this.userPool.userPoolId,
      USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId
    }

    const signupFn = new NodejsFunction(this, 'SignupFn', {
      entry: path.join(__dirname, '../lambda/auth/signup.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: baseAuthEnv
    })
    const confirmFn = new NodejsFunction(this, 'ConfirmFn', {
      entry: path.join(__dirname, '../lambda/auth/confirm.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: baseAuthEnv
    })
    const loginFn = new NodejsFunction(this, 'LoginFn', {
      entry: path.join(__dirname, '../lambda/auth/login.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: baseAuthEnv
    })
    const logoutFn = new NodejsFunction(this, 'LogoutFn', {
      entry: path.join(__dirname, '../lambda/auth/logout.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: baseAuthEnv
    })

    this.authApi.root.addResource('signup').addMethod('POST', new LambdaIntegration(signupFn))
    this.authApi.root.addResource('confirm').addMethod('POST', new LambdaIntegration(confirmFn))
    this.authApi.root.addResource('login').addMethod('POST', new LambdaIntegration(loginFn))
    this.authApi.root.addResource('logout').addMethod('POST', new LambdaIntegration(logoutFn))
  }
}