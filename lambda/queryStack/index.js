const DEFAULT_TIERS = {
    "start": ['db', 'app', 'web'],
    "stop": ['web', 'app', 'db']
};

exports.handler =  function(event, context, cb) {
    let startedAt = new Date()/1000;
    let action = event.action;
    let tiers = DEFAULT_TIERS[action];
    let index = event.index || 0;

    cb(null, {
        tiers: tiers,
        startedAt: `${startedAt}`,
        index: index,
        done: index >= tiers.length
    });
}