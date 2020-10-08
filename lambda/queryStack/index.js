const DEFAULT_TIERS = {
    "start": ['db', 'app', 'web'],
    "stop": ['web', 'app', 'db']
};

exports.handler =  function(event, context, cb) {
    let startedAt = new Date()/1000;

    let tiers = [];
    DEFAULT_TIERS[event.action].forEach(function(tier) {
        let hash  = {
            stackId: event.stackId,
            tier: tier,
            action: event.action
        }
        tiers.push(hash);
    });

    cb(null, {
        stackId: event.stackId,
        action: event.action,
        startedAt: `${startedAt}`,
        tiers: tiers
    });
}