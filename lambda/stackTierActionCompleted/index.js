var AWS = require('aws-sdk/global');
var SF = require('aws-sdk/clients/stepfunctions');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TIER_ACTION_COMPLETED = 'Stack Orchestrator Tier Action completed';

AWS.config.region = REGION;

var sf = new SF();

function sendTaskSuccess(event, cb) {
    var params = {
        taskToken: event.detail.token,
        output: JSON.stringify(event.detail),
    };
    console.log('Sending task success');
    sf.sendTaskSuccess(params, function(err, data) {
        if (err) cb(err, null);
        else {
            cb(null, data);
        }
    });
}

function processEvent(event, cb) {    
    // TODO: log audit
    sendTaskSuccess(event, function(err, data){
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
                console.log('Done.');
                resolve(data);
            }
        });
    });

    return myPromise;
}