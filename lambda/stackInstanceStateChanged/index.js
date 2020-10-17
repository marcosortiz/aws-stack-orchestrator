var AWS = require('aws-sdk/global');
var EB = require('aws-sdk/clients/eventbridge');

const REGION = process.env.AWS_REGION || 'us-east-1';
const STACK_INSTANCE_STATE_CHANGE = 'EC2 Instance State-change Notification';
const STACK_INSTANCE_ACTION_COMPLETED = 'Stack Orchestrator EC2 Action completed'

AWS.config.region = REGION;

var eb = new EB();

function operationCompleted(params) {
    if(params.action === 'stop' && params.state === 'stopped') {
        return true;
    } else if (params.action === 'start' && params.state === 'running') {
        return true;
    } else {
        return false;
    }
}

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

function putInstanceActionCompletedEvent(event, cb) {
    var params = {
        Entries: [
          {
            Detail: JSON.stringify(event.detail),
            DetailType: STACK_INSTANCE_ACTION_COMPLETED,
            EventBusName: process.env.EVENT_BUS_NAME,
            Source: 'stackOrchestrator',
            Time: event.time
          }
        ]
      };
      console.log('putInstanceActionCompletedEvent');
      putEvent(params, function(err, data) {
          if(err) cb(err, null);
          else cb(null, data);
      })
}

function processEvent(event, cb) {
    // TODO: log audit
    if(operationCompleted(event.detail)) {
        putInstanceActionCompletedEvent(event, function(err, data) {
            if (err) cb(err, null);
            else cb(null, data);
        });
    }

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
                console.log('Done.');
                resolve(data);
            }
        });
    });

    return myPromise;
}