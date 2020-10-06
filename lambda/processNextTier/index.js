exports.handler =  function(event, context, cb) {
    let index = event.iterator.index;
    let tier = event.iterator.tiers[index];

    console.log(`TODO: Publish event - Processing ${tier} ...`)
    index += 1;

    let data = {
        tiers: event.iterator.tiers,
        index: index,
        done: index >= event.iterator.tiers.length
    };

    cb(null, data);
}