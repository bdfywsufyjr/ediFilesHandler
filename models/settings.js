var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var Schema = mongoose.Schema;

var SettingsSchema = new Schema(
    {
        folder: { type: String, required: true },
        login: { type: String, required: false },
        password: { type: String, required: false },
        mode: { type: String, enum: ['Manual', 'Auto'], default: 'Manual', required: true },
        email: { type: String, required: true },
        updated_at: { type: Date, default: Date.now }
    }
);

// Virtual for setting's URL
SettingsSchema
    .virtual('url')
    .get(function () {
        return '/data/settings/';
    });

//Export model
module.exports = mongoose.model('Settings', SettingsSchema);