var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ErrorSchema = new Schema(
    {
        order:          { type: String },
        filename:       { type: String },
        status:         { type: String },
        response:       { type: String },
        created_at:     { type: Date, default: Date.now }
    }
);

// Virtual for error
ErrorSchema
    .virtual('error')
    .get(function () {
        return this._id;
    });

// Virtual for error's URL
ErrorSchema
    .virtual('url')
    .get(function () {
        return '/data/error/' + this._id;
    });

//Export model
module.exports = mongoose.model('Error', ErrorSchema);