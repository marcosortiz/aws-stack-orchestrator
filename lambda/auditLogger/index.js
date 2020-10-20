exports.handler = async function(event) {
    const myPromise = new Promise((resolve, reject) => {
        console.log(JSON.stringify(event));
    });

    return myPromise;
}