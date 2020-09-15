exports.handler =  function(event, context, cb) {
    let tier = event.iterator.nextTier;
    let index = event.iterator.index;

    console.log(`Processing ${tier} ...`)
    index += 1;

    let data = {
        tiers: event.iterator.tiers,
        index: index,
        done: index >= event.iterator.tiers.length
    };

    cb(null, data);
}