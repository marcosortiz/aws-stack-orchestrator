var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');
var EB = require('aws-sdk/clients/eventbridge');

const REGION = process.env.AWS_REGION || 'us-east-1';
const STACK_INSTANCE_ACTION_COMPLETED = 'Stack Orchestrator EC2 Action completed'
const STACK_TIER_ACTION_COMPLETED = 'Stack Orchestrator Tier Action completed';

AWS.config.region = REGION;

var ddb = new DDB();
var eb = new EB();

function putEvent(params, cb) {
    eb.putEvents(params, function(err, data) {
      if (err) {
          console.log(err, err.stack);
          cb(err, null);
      }
      else{
          cb(null, data);
      }
    });
}

function parseTier(data) {
    let hash = {}
    if(data.Item) {
        hash['stackId'] = data.Item.id.S;
        hash['tier'] = data.Item.sk.S.split('-')[2];
        hash['action'] = data.Item.action.S;
        hash['count'] = parseInt(data.Item.count.N);
        hash['total'] = parseInt(data.Item.total.N);
        hash['startedAt'] = data.Item.startedAt.S;
        hash['token'] = data.Item.token.S;
        // incomplete tiers will not have finishedAt attribute set
        if (data.Item.finishedAt) {
            hash['finishedAt'] = data.Item.finishedAt.S;
        }
    }
    return hash
}

function getTier(event, cb) {
    var params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            "id": {
                S: event.detail.stackId
            }, 
            "sk": {
                S: `tier-${event.detail.stackId}-${event.detail.tier}`
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
                cb(null, parseTier(data)) ;
            } else {
                cb(null, null);
            }
        }     
    });
}

function isTierActionCompleted(data) {
    return data.count >= data.total;
}

function putTierActionCompletedEvent(event, tier, cb) {
    var params = {
        Entries: [
          {
            Detail: JSON.stringify(tier),
            DetailType: STACK_TIER_ACTION_COMPLETED,
            EventBusName: process.env.EVENT_BUS_NAME,
            Source: 'stackOrchestrator',
            Time: event.time
          }
        ]
      };
      console.log('putTierActionCompletedEvent ...');
      putEvent(params, function(err, data) {
          if(err) {
              console.log(err, err.stack);
            cb(err, null);
        }
          else cb(null, data);
      })
}

function checkTierActionCompleted(event, cb) {
    getTier(event, function(err, data){
        if(err) cb(err, null);
        else {
            if(isTierActionCompleted(data)) {
                console.log("tier:");
                console.log(JSON.stringify(data));
                putTierActionCompletedEvent(event, data, function(err, data) {
                    if(err) cb(err, null);
                    else cb(null, data);
                })
            }
        }
    });
}

function processEvent(event, cb) {
    // TODO: log audit
    checkTierActionCompleted(event, function(err, data){
        if (err) cb(err, null);
        else cb(null, data);
    });
}

exports.handler = async function(event) {
    const myPromise = new Promise((resolve, reject) => {
        console.log(JSON.stringify(event));
        processEvent(event, function(err, data) {
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