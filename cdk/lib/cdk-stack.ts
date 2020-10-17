import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import {InstanceClass,InstanceSize,InstanceType} from '@aws-cdk/aws-ec2';
import iam = require('@aws-cdk/aws-iam');
import * as lambda from '@aws-cdk/aws-lambda';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import * as path from 'path';
import { EventsRuleToLambda } from '@aws-solutions-constructs/aws-events-rule-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
const { LambdaToSqsToLambda } = require('@aws-solutions-constructs/aws-lambda-sqs-lambda');
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import events = require('@aws-cdk/aws-events');


const ENV_PROPS = {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION }
}

const EC2_INSTANCE_STATE_CHANGE = 'EC2 Instance State-change Notification';
const STACK_INSTANCE_STATE_CHANGE = 'EC2 Instance State-change Notification';
const STACK_INSTANCE_ACTION_COMPLETED = 'Stack Orchestrator EC2 Action completed'
const STACK_TIER_ACTION_COMPLETED = 'Stack Orchestrator Tier Action completed';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, ENV_PROPS);

    let myVpc = new ec2.Vpc(this, 'myStackVpc',{
      maxAzs: 2,
    });

    const instanceRole = new iam.Role(this,'ssminstancerole',
    {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationReadOnlyAccess')
      ],
    });
    const myInstanceProfile = new iam.CfnInstanceProfile( this,'myInstanceProfile',{
        roles: [instanceRole.roleName]
    })

    let amznLinuxAmi = ec2.MachineImage.latestAmazonLinux().getImage(this).imageId;

    let web1 = new ec2.CfnInstance(this, "web1",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "web1"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "web"},
        {key: "Env", value: "dev"},
      ],
    });
    let web2 = new ec2.CfnInstance(this, "web2",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "web2"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "web"},
        {key: "Env", value: "dev"},
      ],
    });
    let app1 = new ec2.CfnInstance(this, "app1",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "app1"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "app"},
        {key: "Env", value: "dev"},
      ],
    });
    let app2 = new ec2.CfnInstance(this, "app2",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "app2"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "app"},
        {key: "Env", value: "dev"},
      ],
    });
    let db1 = new ec2.CfnInstance(this, "db1",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "db1"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "db"},
        {key: "Env", value: "dev"},
      ],
    });
    let db2 = new ec2.CfnInstance(this, "db2",{
      imageId: amznLinuxAmi,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO).toString(),
      iamInstanceProfile: myInstanceProfile.ref,
      subnetId: myVpc.publicSubnets[0].subnetId,
      tags: [
        {key: "Name", value: "db2"},
        {key: "Stack", value: "123"},
        {key: "StackType", value: "3-tiered-web-app"},
        {key: "Tier", value: "db"},
        {key: "Env", value: "dev"},
      ],
    });

    const instancesTable = new dynamodb.Table(this, "requests", {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'sk', type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    let queryNextInstancesFn = new lambda.Function(this, 'queryNextInstances', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/queryNextInstances')),
    });
    queryNextInstancesFn.role?.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['ec2:describeInstances'],
    }));;
  
    const ec2AutomationBus = new events.EventBus(this, 'Ec2Automation', {});
    const ec2InstanceStateChanged = new EventsRuleToLambda(this, 'ec2-instance-state-changed', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/ec2InstanceStateChangeTracker')),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
      },
      eventRuleProps: {
        description: 'Tracks EC2 instance state change',
        enabled: true,
        eventPattern: {
          detailType: [EC2_INSTANCE_STATE_CHANGE],
          source: [ "aws.ec2" ]
        }
      }
    });
    ec2InstanceStateChanged.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ec2AutomationBus.eventBusArn],
      actions: ['events:PutEvents'],
    }));
    ec2InstanceStateChanged.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [instancesTable.tableArn],
      actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
    }));
    ec2InstanceStateChanged.lambdaFunction.addEnvironment(
      'TABLE_NAME', instancesTable.tableName
    );
    ec2InstanceStateChanged.lambdaFunction.addEnvironment(
      'EVENT_BUS_NAME', ec2AutomationBus.eventBusName
    );

    const stackInstanceStateChanged = new EventsRuleToLambda(this, 'stack-instance-state-changed', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/stackInstanceStateChanged')),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
      },
      eventRuleProps: {
        eventBus: ec2AutomationBus,
        description: 'Tracks stack state changes',
        enabled: true,
        eventPattern: {
          detailType: [STACK_INSTANCE_STATE_CHANGE],
          source: [ "stackOrchestrator" ]
        }
      }
    });
    stackInstanceStateChanged.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ec2AutomationBus.eventBusArn],
      actions: ['events:PutEvents'],
    }));
    stackInstanceStateChanged.lambdaFunction.addEnvironment(
      'EVENT_BUS_NAME', ec2AutomationBus.eventBusName
    );

    const stackInstanceActionCompleted = new EventsRuleToLambda(this, 'stack-instance-action-completed', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/stackInstanceActionCompleted')),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
      },
      eventRuleProps: {
        eventBus: ec2AutomationBus,
        description: 'Tracks stack state changes',
        enabled: true,
        eventPattern: {
          detailType: [STACK_INSTANCE_ACTION_COMPLETED],
          source: [ "stackOrchestrator" ]
        }
      }
    });
    stackInstanceActionCompleted.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ec2AutomationBus.eventBusArn],
      actions: ['events:PutEvents'],
    }));
    stackInstanceActionCompleted.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [instancesTable.tableArn],
      actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
    }));
    stackInstanceActionCompleted.lambdaFunction.addEnvironment(
      'TABLE_NAME', instancesTable.tableName
    );
    stackInstanceActionCompleted.lambdaFunction.addEnvironment(
      'EVENT_BUS_NAME', ec2AutomationBus.eventBusName
    );

    const stackTierActionCompleted = new EventsRuleToLambda(this, 'stack-tier-action-completed', {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/stackTierActionCompleted')),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
      },
      eventRuleProps: {
        eventBus: ec2AutomationBus,
        description: 'Tracks stack state changes',
        enabled: true,
        eventPattern: {
          detailType: [STACK_TIER_ACTION_COMPLETED],
          source: [ "stackOrchestrator" ]
        }
      }
    });
    stackTierActionCompleted.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
    }));

    let queryStackOrderFn = new lambda.Function(this, 'queryStack', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/queryStack')),
    });

    let processNextTierFn = new lambda.Function(this, 'processNextTier', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/processNextTier')),
    });
    processNextTierFn.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [instancesTable.tableArn],
      actions: ['dynamodb:PutItem'],
    }));

    let deleteStackRequestFn = new lambda.Function(this, 'deleteStackRequest', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/deleteStackRequest')),
    });
    deleteStackRequestFn.role?.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [instancesTable.tableArn],
        actions: ['dynamodb:DeleteItem'],
    }));
    deleteStackRequestFn.addEnvironment(
      'TABLE_NAME', instancesTable.tableName
    );

    let lambdaToSqsToLambda = new LambdaToSqsToLambda(this, 'InstanceActions', {
      producerLambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: 'index.handler',
          environment: {
            TEST: 'XXX'
          },
          code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/asyncProcessInstances')),
      },
      consumerLambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/worker'))
      }
    });
    lambdaToSqsToLambda.producerLambdaFunction.addEnvironment(
      'QUEUE_URL', lambdaToSqsToLambda.sqsQueue.queueUrl
    );
    lambdaToSqsToLambda.consumerLambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [instancesTable.tableArn],
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
    }));
    lambdaToSqsToLambda.consumerLambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:StartInstances', 'ec2:StopInstances'],
    }));
    lambdaToSqsToLambda.consumerLambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
    }));
    lambdaToSqsToLambda.consumerLambdaFunction.addEnvironment(
      'TABLE_NAME', instancesTable.tableName
    );

    const queryNextInstancesTask = new tasks.LambdaInvoke(this, 'QueryNextInstances', {
      lambdaFunction: queryNextInstancesFn,
      payloadResponseOnly: true
    });

    const wait = new sfn.Wait(this, 'Wait For Trigger Time', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(3)),
    });

    const processInstancesActionTask = new tasks.LambdaInvoke(this, 'AsyncProcessInstances', {
      lambdaFunction: lambdaToSqsToLambda.producerLambdaFunction,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.taskToken,
        input: sfn.JsonPath.stringAt('$'),
      }),
      timeout: cdk.Duration.minutes(1),
      resultPath: sfn.JsonPath.DISCARD
    });
    processInstancesActionTask.next(wait);
    wait.next(queryNextInstancesTask);

    const success = new sfn.Succeed(this, 'Success');
    let anyInstanceToProcess = new sfn.Choice(this, 'AnyInstance?');
    anyInstanceToProcess.when(sfn.Condition.booleanEquals('$.done', true), success)
      .when(sfn.Condition.booleanEquals('$.done', false), processInstancesActionTask);

    const processTierDefinition = queryNextInstancesTask
      .next(anyInstanceToProcess);    
    
    const processTierSm = new sfn.StateMachine(this, 'ProcessTier', {
      definition: processTierDefinition
    });
    processNextTierFn.addEnvironment(
      'SF_ARN', processTierSm.stateMachineArn
    );
    processNextTierFn.addEnvironment(
      'TABLE_NAME', instancesTable.tableName
    );
    processNextTierFn.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [processTierSm.stateMachineArn],
      actions: ['states:StartExecution'],
    }));


    const queryStackTask = new tasks.LambdaInvoke(this, 'QueryStack', {
      lambdaFunction: queryStackOrderFn,
      payloadResponseOnly: true,
      resultPath: '$',
    });

    const putStackRequestTask = new tasks.DynamoPutItem(this, 'putStackRequest', {
      item: {
        id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.stackId')),
        sk: tasks.DynamoAttributeValue.fromString('stack'),
        action: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.action')),
        startedAt: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.startedAt')),
        count: tasks.DynamoAttributeValue.fromNumber(0),
        total: tasks.DynamoAttributeValue.fromNumber(0)
      },
      conditionExpression: "attribute_not_exists(id)",
      table: instancesTable,
      resultPath: sfn.JsonPath.DISCARD
    });

    const done = new sfn.Succeed(this, 'Done');

    const deleteStackRequestTask = new tasks.LambdaInvoke(this, 'DeleteStackRequest', {
      lambdaFunction: deleteStackRequestFn,
      payloadResponseOnly: true,
      resultPath: sfn.JsonPath.DISCARD,
    });
    deleteStackRequestTask.next(done);

    // const processNextTierTask = new tasks.StepFunctionsStartExecution(this, 'ProcessNextTier', {
    //   stateMachine: processTierSm,
    //   integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
    //   input: sfn.TaskInput.fromObject({
    //     "AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID.$": '$$.Execution.Id',
    //     // token: sfn.JsonPath.taskToken,   
    //     stackId: sfn.JsonPath.stringAt('$.stackId'),
    //     tier: sfn.JsonPath.stringAt('$.tier'),
    //     action: sfn.JsonPath.stringAt('$.action'),
    //   }),
    //   resultPath: sfn.JsonPath.DISCARD
    // });

    const processNextTierTask = new tasks.LambdaInvoke(this, 'ProcessNextTier', {
      lambdaFunction: processNextTierFn,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        token: sfn.JsonPath.taskToken,
        input: sfn.JsonPath.stringAt('$'),
      }),
      timeout: cdk.Duration.minutes(10),
      resultPath: sfn.JsonPath.DISCARD
    });




    const map = new sfn.Map(this, 'Map Tiers', {
        maxConcurrency: 1,
        itemsPath: sfn.JsonPath.stringAt('$.tiers')
    });
    map.iterator(processNextTierTask);

    const processStackDefinition = queryStackTask
      .next(putStackRequestTask)
      .next(map)
      .next(deleteStackRequestTask);

    const processStackSm = new sfn.StateMachine(this, 'ProcessStack', {
      definition: processStackDefinition
    });

  }
}