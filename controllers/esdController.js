var Esd             = require('../models/esd');

var helper          = require('../helper');

var async           = require('async');

// Render error page
exports.error = function(req, res) {
    res.render('error', {message: req});
};

// Render ESD settings home page
exports.index = function(req, res) {

    Esd.find({})
        .exec(function (err, products) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('esd_list', { title: 'ESD товары', products: products});
        });
};

exports.esd_create_post = function(req, res) {

    var products = [];

    for (var i = 0; i < req.body.sTid.length; i++) {

        if (req.body.sTid[i]) {
            const product = new Esd({id: req.body.sTid[i], name: req.body.sTname[i]});
            products.push(product);
        }
    }

    var distinctProducts = distinctByProp(products, 'id');

    Esd.deleteMany({}, (err) => {
        if (err) { console.log(err); }

        Esd.insertMany(distinctProducts, (err) => {
            if (err) { console.log(err); }

            res.redirect(distinctProducts[0].url);
        });
    });
};

// Return list of all ESD products.
exports.esd_list = function(req, res, next) {

    Esd.find({})
        .exec(function (err, products) {
            if (err) { return next(err); }
            //Successful, so render
            res.json({'data': products});
        });
};

// Get esd items settings
exports.getEsdSettings = () => {

    return Esd.find({})
        .exec()
        .then(result => {
            return result;
        });
};