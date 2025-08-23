import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb'
import { RestApi, LambdaIntegration, Cors, CognitoUserPoolsAuthorizer, AuthorizationType } from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { UserPool, UserPoolClient, AccountRecovery } from 'aws-cdk-lib/aws-cognito'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
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

    this.userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY
    })
    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      authFlows: { userPassword: true },
      generateSecret: false
    })

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'AppAuthorizer', {
      cognitoUserPools: [this.userPool]
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

    const putThingFn = new NodejsFunction(this, 'PutThingFn', {
      entry: path.join(__dirname, '../lambda/app/putThing.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: this.table.tableName }
    })
    this.table.grantReadWriteData(putThingFn)

    const getTranslationFn = new NodejsFunction(this, 'GetTranslationFn', {
      entry: path.join(__dirname, '../lambda/app/getTranslation.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: this.table.tableName }
    })
    this.table.grantReadWriteData(getTranslationFn)
    getTranslationFn.addToRolePolicy(new PolicyStatement({ actions: ['translate:TranslateText'], resources: ['*'] }))
    getTranslationFn.addToRolePolicy(new PolicyStatement({ actions: ['comprehend:DetectDominantLanguage'], resources: ['*'] }))

    const things = this.appApi.root.addResource('things')
    const byPk = things.addResource('{pk}')
    const byPkSk = byPk.addResource('{sk}')
    const translation = byPkSk.addResource('translation')

    byPk.addMethod('GET', new LambdaIntegration(getThingsFn))
    things.addMethod('POST', new LambdaIntegration(postThingFn), { authorizer, authorizationType: AuthorizationType.COGNITO })
    byPkSk.addMethod('PUT', new LambdaIntegration(putThingFn), { authorizer, authorizationType: AuthorizationType.COGNITO })
    translation.addMethod('GET', new LambdaIntegration(getTranslationFn))

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

    signupFn.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:SignUp'], resources: ['*'] }))
    confirmFn.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:ConfirmSignUp'], resources: ['*'] }))
    loginFn.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:InitiateAuth'], resources: ['*'] }))
    logoutFn.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:GlobalSignOut'], resources: ['*'] }))

    this.authApi.root.addResource('signup').addMethod('POST', new LambdaIntegration(signupFn))
    this.authApi.root.addResource('confirm').addMethod('POST', new LambdaIntegration(confirmFn))
    this.authApi.root.addResource('login').addMethod('POST', new LambdaIntegration(loginFn))
    this.authApi.root.addResource('logout').addMethod('POST', new LambdaIntegration(logoutFn))

    new cdk.CfnOutput(this, 'AppApiEndpoint', { value: this.appApi.url })
    new cdk.CfnOutput(this, 'AuthApiEndpoint', { value: this.authApi.url })
    new cdk.CfnOutput(this, 'ThingsTableName', { value: this.table.tableName })
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId })
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId })
  }
}
