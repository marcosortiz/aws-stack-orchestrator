var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');
var SF = require('aws-sdk/clients/stepfunctions');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;


function registerToken(ddb, event, cb) {

    let params = {
        Item: {
            "id": {
                S: event.input.stackId
            }, 
            "sk": {
                S: `tier-${event.input.stackId}-${event.input.tier}`
            }, 
            "action": {
                S: event.input.action
            },
            "startedAt": {
                S: `${new Date()/1000}`
            },
            "token": {
                S: event.token
            }
        }, 
        ReturnConsumedCapacity: "TOTAL", 
        TableName: process.env.TABLE_NAME,
        ConditionExpression: "attribute_not_exists(id)"
    };

    ddb.putItem(params, function(err, data) {
        if (err) cb(err, null);
        else {
            console.log(JSON.stringify(data));
            cb(null, data);
        }
    });
}

function startExecution(sf, event){
    let params = {
        stateMachineArn: process.env.SF_ARN,
        input: JSON.stringify(event.input),
      };

    sf.startExecution(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(JSON.stringify(data));
            cb(null, data);
        }
    });
}

var ddb = new DDB();
var sf = new SF();
exports.handler =  function(event, context, cb) {
    console.log(JSON.stringify(event));
    registerToken(ddb, event, function(err, data) {
        if (err) cb(err, null);
        else {
            startExecution(sf, event);
            return '{}';
        }
    });
}