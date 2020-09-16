var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');

AWS.config.region = REGION;

var ddb = new DDB();
exports.handler =  function(event, context, cb) {
    var params = {
    };

    console.log(params);
    sqs.putItem(params, function(err, data) {
        if (err) cb(err, null);
        if(cb) cb(null, data);
    });
}