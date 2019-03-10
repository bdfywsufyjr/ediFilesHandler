var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var Schema = mongoose.Schema;

var EsdSchema = new Schema(
    {
        id:         { type: Number, required: true  },
        name:       { type: String, required: false },
        updated_at: { type: Date, default: Date.now }
    }
);

// Virtual for esd setting's URL
EsdSchema
    .virtual('url')
    .get(function () {
        return '/data/settings/esd/';
    });

//Export model
module.exports = mongoose.model('Esd', EsdSchema);