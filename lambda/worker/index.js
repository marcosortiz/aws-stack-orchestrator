var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');
var EC2 = require('aws-sdk/clients/ec2');
var SF = require('aws-sdk/clients/stepfunctions');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TIER_KEY =  "tag:Tier";
const STATE_KEY = "instance-state-name";
const FILTER_STATES = {
    'start': ['stopped'],
    'stop': ['running']
};

AWS.config.region = REGION;

function parseParams(event) {
    let record = event.Records[0];
    let body = JSON.parse(record.body);

    return {
        stackId: body.stackId,
        tier: body.tier,
        action: body.action,
        instanceIds: body.instanceIds,
        token: body.token
    }
}

function getPutItemParams(params) {
    let putItemParams = {
        Item: {
            "id": {
                S: params.instanceId
            }, 
            "sk": {
                S: `requestDetails-${params.stackId}`
            }, 
            "action": {
                S: params.action
            },
            "tier": {
                S: params.tier
            },
            "startedAt": {
                S: `${new Date()/1000}`
            }
        }, 
        ReturnConsumedCapacity: "TOTAL", 
        TableName: process.env.TABLE_NAME,
        ConditionExpression: "attribute_not_exists(id)"
    };
    
    return putItemParams;
}

function getUpdateItemParams(params) {
    var updateItemParams = {
        ExpressionAttributeNames: {
            "#C": "count", 
            "#T": "total"
        }, 
        ExpressionAttributeValues: {
            ":inc": {
                N: "1"
            }
        }, 
        Key: {
            "id": {
                S: params.stackId
            }, 
            "sk": {
                S: `request`
            }
        }, 
        ReturnValues: "ALL_NEW", 
        TableName: process.env.TABLE_NAME, 
        UpdateExpression: "SET #C = c + :inc, #T = #T + :inc"
    };
    return updateItemParams;
}

function updateDdb(ddb, params, cb) {
    var putParams = getPutItemParams(params);
    console.log('ddb putParams');
    console.log(JSON.stringify(putParams));

    var updateParams = getUpdateItemParams(params);
    console.log('ddb updateParams');
    console.log(JSON.stringify(updateParams));


    ddb.putItem(putParams, function(err, data) {
        if (err) cb(err, null);
        else {
            console.log(JSON.stringify(data));
            ddb.updateItem(updateParams, function (err2, data2) {
                if (err2) cb(err2, null);
                else {
                    console.log(JSON.stringify(data2));
                }
            });
        }
    });
}

function sendTaskSuccess(sf, params) {
    var params = {
        taskToken: params.token,
        output: JSON.stringify(params),
    };
    sf.sendTaskSuccess(params, function(err, data) {
        if (err) console.log(err, err.stack);
        if (data) {
            console.log(JSON.stringify(data))
        } 
    });
}

function sendTaskFailure(sf, params, cause, error) {

    var params = {
        taskToken: params.token,
        cause: cause,
        error: error
    };
    sf.sendTaskFailure(params, function(err, data) {
        if (err) console.log(err, err.stack);
        if (data) {
            console.log(JSON.stringify(data))
        } 
    });
}

function processInstances(ddb, ec2, sf, params, cb) {
    var ec2Params = {
        InstanceIds: params.instanceIds
    };

    console.log("Processing instances ...");
    console.log(JSON.stringify(ec2Params))
    if (params.action === 'stop') {
        ec2.stopInstances(ec2Params, function(err, data) {
            if (err) cb(err, null);
            else {
                console.log(JSON.stringify(data));
                console.log("sending task success ...");
                sendTaskSuccess(sf, params);
                // updateDdb(ddb, params, cb);
            }
        });
    } else if (params.action === 'start') {
        ec2.startInstances(ec2Params, function(err, data) {
            if (err) cb(err, null);
            else {
                console.log(JSON.stringify(data));
                console.log("sending task success ...");
                sendTaskSuccess(sf, params);
                // updateDdb(ddb, params, cb);
            }
        });
    } else {
        throw new Error(`EC2 instance action not supported: '${params.action}'. Supported actions are 'start' and 'stop'.`);
    }
}

var ddb = new DDB();
var ec2 = new EC2();
var sf = new SF();
exports.handler =  function(event, context, cb) {
    let params = parseParams(event);
    console.log('params:');
    console.log(JSON.stringify(params));

    processInstances(ddb, ec2, sf, params, cb)
    return "Done!";
}