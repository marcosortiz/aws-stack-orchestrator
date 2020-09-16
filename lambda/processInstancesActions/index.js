var AWS = require('aws-sdk/global');
var SQS = require('aws-sdk/clients/sqs');

AWS.config.region = REGION;

var sqs = new SQS();
exports.handler =  function(event, context, cb) {
    var params = {
    };

    console.log(params);
    sqs.putItem(params, function(err, data) {
        if (err) cb(err, null);
        if(cb) cb(null, data);
    });
}