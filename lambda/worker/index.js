var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

function getDdbParams(event) {
    let params = {
        TransactItems: []
    };

    event.Records.forEach(function(r) {
        let body = JSON.parse(r.body);
        let item = {
            Put: {
                Item: {
                    "instanceId": { S: body.instanceId }, 
                    "action": { S: body.action }, 
                    "stackId": { S: r.messageAttributes.Stack.stringValue }, 
                    // "tier": { S: i.tier}    
                },
                TableName: 'xxx',
            }
        };
        params.TransactItems.push(item);

    });
    
    return params;
}

var ddb = new DDB();
exports.handler =  function(event, context, cb) {
    // var params = {
    // };

    // console.log(params);
    // sqs.putItem(params, function(err, data) {
    //     if (err) cb(err, null);
    //     if(cb) cb(null, data);
    // });
    console.log('Worker processing queue');
    console.log(JSON.stringify(event));
    // console.log('ddb params');
    // console.log(JSON.stringify(getDdbParams(event)));
    return "Done!";
}