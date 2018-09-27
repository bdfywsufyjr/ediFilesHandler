var xml2js                      = require('xml2js');
var parser                      = new xml2js.Parser();

var rp                          = require('request-promise');
var errors                      = require('request-promise/errors');

var helper                      = require('../controllers/helper');

var Error                       = require('../models/error');

var customerController          = require('../controllers/customerController');
var settingsController          = require('../controllers/settingsController');
var orderController             = require('../controllers/orderController');

var fs      = require('fs');
var path    = require('path');

exports.error_list = function (req, res) {
    Error.find({})
        .exec(function (err, list_errors) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('error_list', { title: 'Ошибки', errors_list: list_errors });
        });
};

exports.error_create = (content) => {
    return new Promise(  (resolve, reject) => {
        let newError = new Error(
            {
                order:      content.order,
                fileName:   content.fileName,
                status:     content.status,
                response:   content.response
            }
        );

        newError.save( (err) => {
            if (err) { reject(err); }

            resolve(newError);
        });
    })
};

exports.error_delete_get = function (req, res) {

};

