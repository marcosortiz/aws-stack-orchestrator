var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');
var EC2 = require('aws-sdk/clients/ec2');
var SF = require('aws-sdk/clients/stepfunctions');

const REGION = process.env.AWS_REGION || 'us-east-1';

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

function sendTaskSuccess(sf, params, cb) {
    var sfParams = {
        taskToken: params.token,
        output: JSON.stringify(params),
    };
    console.log(JSON.stringify(sfParams));
    sf.sendTaskSuccess(sfParams, function(err, data) {
        if (err) cb(err, null);
        else {
            cb(null, data);
        }
    });
}

function recordInstances(ddb, params, cb) {
    var ddbParams = { 
        TransactItems: [],
        ReturnConsumedCapacity: "TOTAL",
    }
    params.instanceIds.forEach(function(instanceId) {
        let putItem = {
            Put: {
                TableName: process.env.TABLE_NAME,
                Item: {
                    "id": {
                        S: params.stackId
                    }, 
                    "sk": {
                        S: `instance-${params.stackId}-${params.tier}-${instanceId}`
                    }, 
                    "action": {
                        S: params.action
                    },
                    "startedAt": {
                        S: `${new Date()/1000}`
                    },
                    "instanceId": {
                        S: instanceId
                    }
                },
                ConditionExpression: "attribute_not_exists(id)"
            }
        };
        ddbParams.TransactItems.push(putItem);
        let putInstance = {
            Put: {
                TableName: process.env.TABLE_NAME,
                Item: {
                    "id": {
                        S: instanceId
                    }, 
                    "sk": {
                        S: 'instance'
                    }, 
                    "tier": {
                        S: params.tier
                    },
                    "stackId": {
                        S: params.stackId
                    },
                    "action": {
                        S: params.action
                    }
                }//,
                // ConditionExpression: "attribute_not_exists(id)"
            }
        };
        ddbParams.TransactItems.push(putInstance);
    });
    let stackUpdateItem = {
        Update: {
            TableName: process.env.TABLE_NAME, 
            ExpressionAttributeNames: {
                "#T": "total"
            }, 
            ExpressionAttributeValues: {
                ":inc": {
                    N: `${params.instanceIds.length}`
                }
            }, 
            Key: {
                "id": {
                    S: params.stackId
                }, 
                "sk": {
                    S: 'stack'
                }
            }, 
            UpdateExpression: "SET #T = #T + :inc"
        }
    };
    ddbParams.TransactItems.push(stackUpdateItem);
    let tierUpdateItem = {
        Update: {
            TableName: process.env.TABLE_NAME, 
            ExpressionAttributeNames: {
                "#T": "total"
            }, 
            ExpressionAttributeValues: {
                ":inc": {
                    N: `${params.instanceIds.length}`
                }
            }, 
            Key: {
                "id": {
                    S: params.stackId
                }, 
                "sk": {
                    S: `tier-${params.stackId}-${params.tier}`
                }
            }, 
            UpdateExpression: "SET #T = #T + :inc"
        }
    };
    ddbParams.TransactItems.push(tierUpdateItem);

    console.log(JSON.stringify(ddbParams));
    ddb.transactWriteItems(ddbParams, function(err, data){
        if (err) {
            console.log(err, err.stack);
            cb(err, null);
        }
        else {
            cb(null, data)
        }
    });
}

function processInstances(ec2, params, cb) {
    var ec2Params = {
        InstanceIds: params.instanceIds
    };

    console.log("Processing instances ...");
    console.log(JSON.stringify(ec2Params))
    if (params.action === 'stop') {
        ec2.stopInstances(ec2Params, function(err, data) {
            if (err) cb(err, null);
            else {
                cb(null, data)
            }
        });
    } else if (params.action === 'start') {
        ec2.startInstances(ec2Params, function(err, data) {
            if (err) cb(err, null);
            else {
                cb(null, data)
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


    const myPromise = new Promise((resolve, reject) => {
        let params = parseParams(event);
        console.log('params:');
        console.log(JSON.stringify(params));
    
        recordInstances(ddb, params, function(err, data){
            if(err) cb(err, null);
            else {
                console.log(JSON.stringify(data));
                processInstances(ec2, params, function(err2, data2){
    
                    if(err2) cb(err2, null);
                    else {
                        console.log(JSON.stringify(data2));
                        console.log("sending task success ...");
                        sendTaskSuccess(sf, params, function(err3, data3) {
                            if (err) cb(err3, null)
                            if (data) {
                                console.log(JSON.stringify(data3));
                            } 
                        });
                    }
                });
            }
        });
    });
    return myPromise;
}