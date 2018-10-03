var xml2js                      = require('xml2js');
var parser                      = new xml2js.Parser();

var rp                          = require('request-promise');
var errors                      = require('request-promise/errors');

var helper                      = require('../helper');

var Error                       = require('../models/error');

var settingsController          = require('../controllers/settingsController');

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

// Display detail page for a specific file from index page.
exports.error_file_detail = async function(req, res) {

    let files = await readSourceFolder('errors');

    console.log('Files length: ' + files.length);

    files.forEach(function (order) {
        if (order['ORDER'].NUMBER == req.params.id ) {
            res.render('data_detail', { title:  req.params.id, header: order, details: order['ORDER']['HEAD'][0]['POSITION'] });
        }
    });
};

exports.error_create = (content) => {
    return new Promise(  (resolve, reject) => {
        let newError = new Error(
            {
                order:      content.order,
                filename:   content.filename,
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

exports.error_move_get = async function (req, res) {
    let settings = await settingsController.getGlobalSettingsWithPromise();
    let folder = settings.folder;

    Error.findOneAndRemove({order: req.params.id}, { sort: { created_at: -1 } })
        .exec()
        .then((result, err) => {
            if (err) { console.log(err); return; }

            moveFile(folder + 'errors/' + result.filename, folder, result.filename);

            res.redirect('../../');
        });
};

exports.error_delete_get = function (req, res) {
    Error.findByIdAndRemove(req.params.id)
        .exec()
        .then((result, err) => {
            if (err) { console.log(err); return; }

            res.redirect('/data/errors');
        });
};

