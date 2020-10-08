var AWS = require('aws-sdk/global');
var EC2 = require('aws-sdk/clients/ec2');

const MAX_RESULTS = 10;
const REGION = process.env.AWS_REGION || 'us-east-1';
const TIER_KEY =  "tag:Tier";
const STATE_KEY = "instance-state-name";
const FILTER_STATES = {
    'start': ['stopped'],
    'stop': ['pending', 'running']
}

AWS.config.region = REGION;

function formatResult(instance) {
    var hash = {
        instanceId: instance.InstanceId,
        state: instance.State.Name,
    }
    instance.Tags.forEach(function(tag) {
        if (tag.Key === 'Name') {
            hash['name'] = tag.Value;
        }
        if (tag.Key === 'Tier') {
            hash['tier'] = tag.Value;
        }
        if (tag.Key === 'Env') {
            hash['env'] = tag.Value;
        }
    });
    return hash;
}


var ec2 = new EC2();
exports.handler =  function(event, context, cb) {
    var params = {
        Filters: [
            {
                Name: TIER_KEY, 
                Values: [
                    event.tier
                ]
            },
            {
                Name: STATE_KEY, 
                Values: FILTER_STATES[event.action]
            }
        ],
        MaxResults: MAX_RESULTS
    };

    console.log(params);
    ec2.describeInstances(params, function(err, data) {
        if (err) cb(err, null);
        else {
            let instances = [];
            data.Reservations.forEach(function(r) {
                let instance = r.Instances[0];
                let hash = formatResult(instance);
                instances.push(hash);            
            });

            console.log(`returning instances: ${instances}`);
            if(cb) cb(null, {
                stackId: event.stackId,
                tier: event.tier,
                action: event.action,
                instances: instances,
                done: instances.length <= 0
            });
        }
    });
}