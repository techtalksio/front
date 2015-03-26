var pageURL = "http://tlks.io/faq";

exports.testFAQ = function(test) {
    casper
        .start(pageURL)
        .then(function() {
            test.assert(this.getCurrentUrl() === pageURL, 'url is the one expected');
        })
        .then(function() {
            test.assertHttpStatus(200, pageURL + ' is up');
        })
        .run(function() {
            test.done();
            casper.exit();
        });
};
