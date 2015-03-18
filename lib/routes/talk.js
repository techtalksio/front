var util = require('util');
var slug = require('slug');
var uuid = require('uuid');
var request = require('request');

var async = require('async');

var config = require('../../config.json');
var talks = require('libtlks').talk;

/**
 * Route /search
 * @param req   HTTP Request object
 * @param req   HTTP Response object
 */
exports.search = function(req, res) {
    "use strict";

    var q = req.query.q;
    var user = req.session.user;
    var context = {
        title: "tlks.io : Search talks by '" + q + "'",
        user: user,
        q: q,
        talks: []
    };
    var url = config.elasticsearch + '/tlksio/talk/_search?q=' + q;
    request.get({
        url: url,
        method: 'GET',
        json: true
    }, function(error, response, body) {
        if (error) {
            res.status(500).send("Error : " + util.inspect(error)).end();
        }
        var hits = body.hits.hits;
        async.map(hits, function(el, callback) {
            var obj = el._source;
            obj.tags = obj.tags.split(',').map(function(el) {
                return el.trim();
            });
            talks.getBySlug(config.mongodb, obj.slug, function(err, talks) {
                if (err) {
                    throw new Error(err);
                }
                callback(null, talks[0]);
            });
        }, function(err, results) {
            if (err) {
                throw new Error(err);
            }
            context.talks = results;
            res.render("search", context);
        });
    });
};

/**
 * Route /talk/play/:id
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.play = function(req, res) {
    "use strict";

    var slug = req.params.slug;
    talks.play(config.mongodb, slug, function(err, talk) {
        if (err) {
            res.status(500).send("Error : " + util.inspect(err)).end();
        }
        var url = 'https://www.youtube.com/watch?v=' + talk.code;
        res.redirect(url);
    });
};

/**
 * Route /talk/upvote/:id
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.upvote = function(req, res) {
    "user strict";
    var id = req.params.id;
    var user = req.session.user;
    if (user === undefined) {
        res.status(401).send("401").end();
    } else {
        var userid = user.id;
        talks.upvote(config.mongodb, id, userid, function(err, updated) {
            if (err) {
                res.status(500).send("Error : " + util.inspect(err)).end();
            }
            var result = {
                "result": updated ? true : false
            };
            res.send(result);
        });
    }
};

/**
 * Route /talk/favorite/:id
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.favorite = function(req, res) {
    "user strict";
    var id = req.params.id;
    var user = req.session.user;
    if (user === undefined) {
        res.status(401).send("401").end();
    } else {
        var userid = user.id;
        talks.favorite(config.mongodb, id, userid, function(err, updated) {
            if (err) {
                res.status(500).send("Error : " + util.inspect(err)).end();
            }
            var result = {
                "result": updated ? true : false
            };
            res.send(result);
        });
    }
};

/**
 * Route /talk/unfavorite/:id
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.unfavorite = function(req, res) {
    "user strict";
    var id = req.params.id;
    var user = req.session.user;
    if (user === undefined) {
        res.status(401).send("401").end();
    } else {
        var userid = user.id;
        talks.unfavorite(config.mongodb, id, userid, function(err, updated) {
            if (err) {
                res.status(500).send("Error : " + util.inspect(err)).end();
            }
            var result = {
                "result": updated ? true : false
            };
            res.send(result);
        });
    }
};

/**
 * Route /talk/:slug
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.talk = function(req, res) {
    "use strict";

    var slug = req.params.slug;
    var user = req.session.user;
    var context = {
        user: user
    };
    talks.getBySlug(config.mongodb, slug, function(err, docs) {
        var talk = docs[0];
        if (err) {
            res.status(500).send("Error : " + util.inspect(err)).end();
        }
        if (talk) {
            context.talk = talk;
            context.title = "tlks.io : " + talk.title;
            talks.related(config.mongodb, talk, 5, function(err, docs) {
                if (err) {
                    res.status(500).send("Error : " + util.inspect(err)).end();
                }
                context.related = docs;
                res.render("talk", context);
            });
        } else {
            res.status(404).send("Talk not found").end();
        }
    });
};

/**
 * Route /add
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.add = function(req, res) {
    "use strict";

    var user = req.session.user;
    if (user === undefined) {
        res.status(401).send("401").end();
    } else {
        var context = {
            title: "tlks.io : Add a new talk",
            user: user
        };
        res.render('add', context);
    }
};

/**
 * Route /save
 * @param req   HTTP Request object
 * @param res   HTTP Response object
 */
exports.save = function(req, res) {
    "use strict";

    // user
    var user = req.session.user;
    if (user === undefined) {
        res.status(401).send("401").end();
    } else {
        // talk
        var talk = {
            id: uuid.v1(),
            code: req.body.code,
            title: req.body.title,
            slug: slug(req.body.title).toLowerCase(),
            description: req.body.description,
            author: {
                id: user.id,
                username: user.username,
                avatar: user.avatar
            },
            "viewCount": 0,
            "voteCount": 0,
            "votes": [],
            "favoriteCount": 0,
            "favorites": [],
            "tags": req.body.tags.split(',').map(function(el) {
                return el.trim().toLowerCase();
            }),
            "created": Date.now(),
            "updated": Date.now()
        };
        // create talk
        talks.createTalk(config.mongodb, talk, function(err, talk) {
            if (err) {
                res.status(500).send("Error : " + util.inspect(err)).end();
            }
            // render
            res.redirect('/');
        });
    }
};
