var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

var ddb = new DDB();

function deleteInstance(event, cb) {
    var ddbParams = { 
        TransactItems: [],
        ReturnConsumedCapacity: "TOTAL",
    }

    let stackId = event.requestPayload.detail.stackId;
    let tier = event.requestPayload.detail.tier;
    let instanceId = event.requestPayload.detail.instanceId

    let deleteStackInstance = {
        Delete: {
            Key: {
                "id": {
                    S: event.requestPayload.detail.stackId
                }, 
                "sk": {
                    S: `instance-${stackId}-${tier}-${instanceId}`
                }
            },
            TableName: process.env.TABLE_NAME, 

        }
    };
    ddbParams.TransactItems.push(deleteStackInstance);
    let deleteStackTier = {
        Delete: {
            Key: {
                "id": {
                    S: instanceId
                }, 
                "sk": {
                    S: 'instance'
                }
            },
            TableName: process.env.TABLE_NAME, 

        }
    };
    ddbParams.TransactItems.push(deleteStackTier);

    ddb.transactWriteItems(ddbParams, function(err, data){
        if(err) cb(err, null);
        else cb(null, data);
    });
}

exports.handler = async function(event) {
    const myPromise = new Promise((resolve, reject) => {
        console.log(JSON.stringify(event));
        deleteInstance(event, function(err, data) {
            if(err) {
                console.log(err, err.stack);
                reject(err);
            }
            else {
                console.log('Done');
                resolve(data);
            }
        });
    });

    return myPromise;
}