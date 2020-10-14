var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');
var EB = require('aws-sdk/clients/eventbridge');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

var ddb = new DDB();
var eb = new EB();

// function processEvent(event) {
//     const promise = new Promise(function(resolve, reject) {
//         console.log(JSON.stringify(event, null, 2))
//         let instanceId = event.detail['instance-id'];
//         let state = event.detail['state'];

//         getTags(instanceId)
//         .then(data => {
//             let stackId = data.Stack;
//             let tier = data.Tier;
//             if (stackId === undefined) {
//                 let msg = `Ignoring inscance ${instanceId} since it has no 'Stack' tag.`;
//                 console.log(msg);
//                 resolve(msg);
//             } else {
//                 let time = new Date(event.time)/1000;
//                 console.log(`Calling processInstance ${stackId}, ${tier}, ${instanceId}, ${state}, ${time}`);
//                 processInstance(stackId, tier, instanceId, state, time)
//                 .then( data => {
//                     resolve(data);
//                 })
//                 .catch(err => {
//                     console.log(err, err.stack);
//                 });
//             }
//         })
//         .catch(err => {
//             console.log(err, err.stack);
//         });
//     });
//     return promise;
// }





// function operationCompleted(action, state) {
//     if(action === 'stop' && state === 'stopped') {
//         return true;
//     } else if (action === 'start' && state === 'running') {

//     } else {
//         return false;
//     }
// }

function parseInstance(data) {
    let hash = {}
    if(data.Item) {
        hash['instanceId'] = data.Item.id.S;
        hash['tier'] = data.Item.tier.S;
        hash['stackId'] = data.Item.stackId.S;
    }
    return hash
}

function getInstance(instanceId, cb) {
    var params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            "id": {
                S: instanceId
            }, 
            "sk": {
                S: 'instance'
            }
        }
    };
    
    ddb.getItem(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            cb(err, null);
        } 
        else {
            console.log('ddb.getItem results:')
            console.log(JSON.stringify(data));
            if(data.Item) {
                cb(null, parseInstance(data)) ;
            } else {
                cb(null, null);
            }
        }     
    });
}

function updateDdb(instance) {
    var ddbParams = { 
        TransactItems: [],
        ReturnConsumedCapacity: "TOTAL",
    }
    let updateIntanceItem = {
        Update: {
            TableName: process.env.TABLE_NAME, 
            ExpressionAttributeNames: {
                "#FA": "finishedAt"
            }, 
            ExpressionAttributeValues: {
                ":fa": {
                    S: `${instance.time}`
                }
            }, 
            Key: {
                "id": {
                    S: instance.stackId
                }, 
                "sk": {
                    S: `instance-${instance.stackId}-${instance.tier}-${instance.instanceId}`
                }
            }, 
            UpdateExpression: "SET #FA = :fa"
        }
    };
    ddbParams.TransactItems.push(updateIntanceItem);
    let updateTierItem = {
        Update: {
            TableName: process.env.TABLE_NAME, 
            ExpressionAttributeNames: {
                "#C": "count",
                "#FA": "finishedAt"
            }, 
            ExpressionAttributeValues: {
                ":inc": {
                    N: '1'
                },
                ":fa": {
                    S: `${instance.time}`
                }
            }, 
            Key: {
                "id": {
                    S: instance.stackId
                }, 
                "sk": {
                    S: `tier-${instance.stackId}-${instance.tier}`
                }
            }, 
            UpdateExpression: "SET #C = #C + :inc, #FA = :fa"
        }
    };
    ddbParams.TransactItems.push(updateTierItem);

    let updateStackItem = {
        Update: {
            TableName: process.env.TABLE_NAME, 
            ExpressionAttributeNames: {
                "#C": "count",
                "#FA": "finishedAt"
            }, 
            ExpressionAttributeValues: {
                ":inc": {
                    N: '1'
                },
                ":fa": {
                    S: `${instance.time}`
                }
            }, 
            Key: {
                "id": {
                    S: instance.stackId
                }, 
                "sk": {
                    S: 'stack'
                }
            }, 
            UpdateExpression: "SET #C = #C + :inc, #FA = :fa"
        }
    };
    ddbParams.TransactItems.push(updateStackItem);

    console.log('transactWriteItems:');
    console.log(JSON.stringify(ddbParams));
    ddb.transactWriteItems(ddbParams, function(err, data){
        if(err) {
            console.log(err, err.stack);
            throw err;
        }
        else {
            console.log(JSON.stringify(data));
        }
    });
}

function putEvent(instance) {    
    var params = {
        Entries: [
          {
            Detail: JSON.stringify(instance),
            DetailType: 'EC2 Instance State-change Notification',
            EventBusName: process.env.EVENT_BUS_NAME,
            Resources: instance.resources,
            Source: 'stackOrchestrator',
            Time: instance.time
          }
        ]
      };
      console.log('About to put event');
      console.log(JSON.stringify(params))
      eb.putEvents(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            throw err;
        }
        else{
            console.log(JSON.stringify(data));
        }
      });
}

exports.handler = async function(event) {
    console.log(JSON.stringify(event));
    let instanceId = event.detail['instance-id'];
    let state = event.detail['state'];
    const myPromise = new Promise((resolve, reject) => {
        getInstance(instanceId, function(err, data){
            if(err) reject(err);
            else {
                if(data === null) {
                    console.log(`Ignoring ${state} event for instance ${instanceId}.`);
                } else {
                    console.log('getInstance result:');
                    console.log(JSON.stringify(data));
                    data['state'] = state;
                    data['time'] = new Date(event.time)/1000;
                    updateDdb(data);

                    data['resources'] = event.resources
                    putEvent(data);
                }
            }
        });
    });
    return myPromise;
}