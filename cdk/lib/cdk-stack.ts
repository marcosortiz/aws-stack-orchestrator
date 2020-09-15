import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import {InstanceClass,InstanceSize,InstanceType} from '@aws-cdk/aws-ec2';
import iam = require('@aws-cdk/aws-iam');
import * as lambda from '@aws-cdk/aws-lambda';
import * as eventTargets from '@aws-cdk/aws-events-targets';
import * as path from 'path';
import { EventsRuleToLambdaProps, EventsRuleToLambda } from '@aws-solutions-constructs/aws-events-rule-lambda';

const ENV_PROPS = {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION }
}

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
        {key: "Tier", value: "db"},
        {key: "Env", value: "dev"},
      ],
    });

    let describeInstancesFn = new lambda.Function(this, 'describeInstances', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/describeInstances')),
    });
    describeInstancesFn.role?.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['ec2:describeInstances'],
    }));;
  
    new EventsRuleToLambda(this, 'ec2-instance-state-changed', {
      lambdaFunctionProps: {
        code: lambda.Code.asset(path.join(__dirname, '..', '..', 'lambda/instanceStateChanged')),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
      },
      eventRuleProps: {
        description: 'Tracks EC2 instance state change',
        enabled: true,
        eventPattern: {
          detailType: ["EC2 Instance State-change Notification"],
          source: [ "aws.ec2" ]
        }
      }
    });

    let queryStackOrderFn = new lambda.Function(this, 'queryStackOrder', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/queryStackOrder')),
    });

    let processTierFn = new lambda.Function(this, 'processTier', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda/processTier')),
    });

    
  }
}
