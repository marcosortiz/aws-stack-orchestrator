const DEFAULT_TIERS = {
    "start": ['db', 'app', 'web'],
    "stop": ['web', 'app', 'db']
};

exports.handler =  function(event, context, cb) {
    let action = event.action;
    let tiers = DEFAULT_TIERS[action];

    cb(null, {
        tiers: tiers,
        index: 0,
        nextTier: tiers[0]
    });
}