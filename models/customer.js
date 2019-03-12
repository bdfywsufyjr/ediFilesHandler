var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var CustomerSchema = new Schema(
    {
        jdeId: { type: String, required: true, max: 7 },
        name: { type: String, required: true },
        login: { type: String, required: true },
        password: { type: String, required: true },
        gln: { type: String, required: true, max: 13 },
        esd: { type: Boolean, required: true },
        apiKey: { type: String, required: false },
        shipTo: [
            {
                jdeId: { type: String, required: false, max: 7 },
                address: { type: String, required: false },
                gln: { type: String, required: false, max: 13 }
            }
        ],
        created_at: { type: Date },
        updated_at: { type: Date, default: Date.now }
    }
);

// Virtual for customer
CustomerSchema
    .virtual('customer')
    .get(function () {
        return this.jdeId;
    });

// Virtual for customer's URL
CustomerSchema
    .virtual('url')
    .get(function () {
        return '/data/customer/';
    });

// Virtual for customer's shipTo list URL
CustomerSchema
    .virtual('shipto_url')
    .get(function () {
        return '/data/customer/' + this._id + '/shipTo';
    });

//Export model
module.exports = mongoose.model('Customer', CustomerSchema);