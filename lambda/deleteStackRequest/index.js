var AWS = require('aws-sdk/global');
var DDB = require('aws-sdk/clients/dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

AWS.config.region = REGION;

function getRequestParams(data){
    return {
        id: data.Attributes.id.S,
        sk: data.Attributes.sk.S,
        action: data.Attributes.action.S,
        startedAt: data.Attributes.startedAt.S,
    }
}

var ddb = new DDB();
exports.handler =  function(event, context, cb) {
    var params = {
        Key: {
         "id": {
           S: event.stackId
          }, 
         "sk": {
           S: "request"
          }
        }, 
        ReturnValues: 'ALL_OLD',
        TableName: process.env.TABLE_NAME
       };

    ddb.deleteItem(params, function (err, data){
        if (err) cb(err, null);
        else {
            console.log(`Successfully deleted stack ${event.stackId}.`);
            console.log("TODO: publish stack event: \n" + JSON.stringify(getRequestParams(data), null, 2));
            return "Done!";
        }
    });
}