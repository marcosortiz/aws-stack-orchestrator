var AWS = require('aws-sdk/global');
var SF = require('aws-sdk/clients/stepfunctions');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

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

var sf = new SF();
exports.handler =  function(event, context, cb) {
}