var AWS = require('aws-sdk/global');
var SQS = require('aws-sdk/clients/sqs');

const REGION = process.env.AWS_REGION || 'us-east-1';
const DELAY_IN_SECS = 3;

AWS.config.region = REGION;

var sqs = new SQS();

function getSqsParams(stackId, tier, action, instances, token) {
    let params = {
        DelaySeconds: DELAY_IN_SECS,
        MessageAttributes: {
            "stackId": {
                DataType: "String",
                StringValue: stackId
            }
        },
        QueueUrl: process.env.QUEUE_URL
    };

    let instanceIds = [];
    instances.forEach(function(i) {
        let instanceId = i.instanceId;
        instanceIds.push(instanceId);
    });
    let body = {
        stackId: stackId,
        tier: tier,
        action: action,
        instanceIds: instanceIds,
        token: token
    }
    params['MessageBody'] = JSON.stringify(body);
    return params;
}

exports.handler =  function(event, context, cb) {

    console.log(JSON.stringify(event))

    let stackId = event.input.stackId;
    let tier = event.input.tier;
    let action = event.input.action;
    let instances = event.input.instances;
    let token = event.token;

    console.log(`Processing ${action} action on ${JSON.stringify(instances)}`);

    let params = getSqsParams(stackId, tier, action, instances, token);
    console.log(JSON.stringify(params));
    sqs.sendMessage(params, function(err, data){
        if (err) cb(err, null);
        else {
            if(cb) cb(null, data);
        }
    });
}