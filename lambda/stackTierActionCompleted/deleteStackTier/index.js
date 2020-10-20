var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

var ddb = new DDB();

function deleteTier(event, cb) {

    let stackId = event.requestPayload.detail.stackId;
    let tier = event.requestPayload.detail.tier;

    var ddbParams = { 
        TransactItems: [],
        ReturnConsumedCapacity: "TOTAL",
    }

    let deleteStackTier = {
        Delete: {
            Key: {
                "id": {
                    S: stackId
                }, 
                "sk": {
                    S: `tier-${stackId}-${tier}`
                }
            },
            TableName: process.env.TABLE_NAME, 

        }
    };
    ddbParams.TransactItems.push(deleteStackTier);

    ddb.transactWriteItems(ddbParams, function(err, data){
        if(err) {
            console.log(err, err.stack);
            cb(err, null);
        }
        else {
            console.log(JSON.stringify(data));
            cb(null, data)
        }
    });
}

exports.handler = async function(event) {
    const myPromise = new Promise((resolve, reject) => {
        console.log(JSON.stringify(event));
        deleteTier(event, function(err, data) {
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