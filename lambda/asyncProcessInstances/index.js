var AWS = require('aws-sdk/global');
var SQS = require('aws-sdk/clients/sqs');

const REGION = process.env.AWS_REGION || 'us-east-1';
const DELAY_IN_SECS = 3;

AWS.config.region = REGION;

var sqs = new SQS();

function getSqsParams(stackId, action, instances) {
    let params = {
        Entries: [
        ],
        QueueUrl: process.env.QUEUE_URL
    };

    instances.forEach(function(i) {
        let instanceId = i.instanceId;
        let entry = {
            Id: instanceId,
            DelaySeconds: DELAY_IN_SECS,
            MessageAttributes: {
                "stackId": {
                    DataType: "String",
                    StringValue: stackId
                }
            },
            MessageBody: JSON.stringify({action: action, instanceId: instanceId})
        };
        params['Entries'].push(entry);      
    });
    
    return params;
}

exports.handler =  function(event, context, cb) {

    let action = event.action;
    let instances = event.instances;

    console.log(`Processing ${action} action on ${JSON.stringify(instances)}`);

    let params = getSqsParams('stack123', action, instances);
    console.log(JSON.stringify(params));
    sqs.sendMessageBatch(params, function(err, data){
        if (err) cb(err, null);
        else {
            // TODO: check for indivitual error messages. It can only send up to 10 messages.
            if(cb) cb(null, data);
        }
    });
}