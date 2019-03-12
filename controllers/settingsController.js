var Settings        = require('../models/settings');
let agenda          = require('../jobs/agenda');

var async = require('async');

// Render error page
exports.error = function(req, res) {
    res.render('error', {message: req});
};

// Render settings home page
exports.index = function(req, res) {
    Settings.find({})
        .exec(function (err, list_globalSettings) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('settings_list', { title: 'Общие настройки', globalSettings_list: list_globalSettings });
        });
};

// Get global settings
exports.getGlobalSettings = function(callback) {

    Settings.find({}, null, { sort: { updated_at: -1 } })
        .exec(function (err, result) {
            if (err) { callback(err); }

            if (result.length > 0) {
                callback(null, result);
            } else {
                callback('Sourcefolder path should be entered');
            }
        });
};

exports.getGlobalSettingsWithPromise = () => {
    return Settings.findOne({}, null, {sort: {updated_at: -1}})
        .exec()
        .then((res) => {
            return res;
        })
}

// Display Global Settings create form on GET.
exports.globalSettings_create_get = function(req, res) {

    res.render('settings_form', { title: 'Общие настройки', settings: '' });
};

// Global Settings create form on POST.
exports.globalSettings_create_post = function(req, res, next) {
    var settings = new Settings(
        {
            folder: req.body.folder,
            login: req.body.login,
            password: req.body.password,
            mode: req.body.mode,
            apiUrl: req.body.apiUrl,
            esdUrl: req.body.esdUrl,
            email: req.body.email,
        }
    );

    if (settings.mode == 'Auto') {
        agenda.every('1 minute', 'read-folder');
    }

    Settings.findOne({ 'folder': req.body.folder })
        .exec( function(err, found_settings) {
            if (err) { return next(err); }

            if (found_settings) {
                // Settings exists, redirect to its detail page.
                res.redirect(found_settings.url);
            }
            else {
                settings.save(function (err) {
                    if (err) { console.log(err); }
                    // Settings saved. Redirect to settings index page.
                    res.redirect(settings.url);
                });
            }
        });
};

// Display Global Settings update form on GET.
exports.globalSettings_update_get = function(req, res, next) {

    Settings.findById(req.params.id)
        .exec(function (err, settings) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('settings_form', { title: 'Общие настройки', settings: settings });
        });
};

// Handle Global Settings update on POST.
exports.globalSettings_update_post = function(req, res) {

    var editedSettings = new Settings(
        {
            folder:     req.body.folder,
            login:      req.body.login,
            password:   req.body.password,
            mode:       req.body.mode,
            apiUrl:     req.body.apiUrl,
            esdUrl:     req.body.esdUrl,
            email:      req.body.email,
            _id:        req.params.id //This is required, or a new ID will be assigned!
        });

    if (editedSettings.mode == 'Auto') {
        agenda.every('1 minute', 'read-folder');
    } else {
        agenda.cancel({name: 'read-folder'}, (err, numRemoved) => {
            console.log('Removed jobs: ' + numRemoved);
        });
    }

    Settings.findByIdAndUpdate(req.params.id, editedSettings, {}, function (err,settings) {
        if (err) { return next(err); }

        res.redirect(settings.url);
    });

};

// Display Global Settings delete form on GET.
exports.globalSettings_delete_get = function(req, res) {
    Settings.findByIdAndRemove(req.params.id, (err, settings) => {
        if (err) return res.status(500).send(err);
        const response = {
            message: "Settings successfully deleted",
            id: settings._id
        };

        return res.json({'status': '200', 'response': response});
    });
};



