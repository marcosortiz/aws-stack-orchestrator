exports.handler =  function(event, context, cb) {
    let tier = event.iterator.nextTier;
    let index = event.iterator.index || 0;

    console.log(`Processing ${tier} ...`)
    index += 1;
    let nextTier = event.iterator.tiers[index];

    let data = {
        tiers: event.iterator.tiers,
        index: index,
        nextTier: nextTier
    };

    cb(null, data);
}