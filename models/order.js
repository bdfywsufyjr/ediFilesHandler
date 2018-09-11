var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var OrderSchema = new Schema(
    {
        orderId:    { type: String, required: true },
        holdCode:   { type: String },
        soldTo:     { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        //shipTo: { type: Schema.Types.ObjectId, ref: 'ShipTo', required: true },
        shipTo:     { type: String, required: true, max: 7 },
        comments:   { type: String },
        shipDate:   { type: Date},
        currency:   { type: String, enum: ['UAH', 'USD', 'EUR'], default: 'UAH' },
        orderDetails:
            [
                {
                    lineID:             { type: Number, required: true },
                    productID:          { type: Number, required: true },
                    manufacturerCode:   { type: String },
                    quantityRequested:  { type: Number, required: true },
                    quantityShipped:    { type: Number, required: true },
                    price:              { type: Number, required: true }
                }
            ],
        success:    { type: Boolean, default: false },
        ediOrder:   { type: String },
        fileName:   { type: String },
        created_at: { type: Date, default: Date.now }
    }
);

// Virtual for order
OrderSchema
    .virtual('order')
    .get(function () {
        return this.orderId;
    });

// Virtual for orders's URL
OrderSchema
    .virtual('url')
    .get(function () {
        return '/data/order/' + this._id;
    });

//Export model
module.exports = mongoose.model('Order', OrderSchema);