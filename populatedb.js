#! /usr/bin/env node

console.log('This script populates some test orders. Specified database as argument - e.g.: populatedb mongodb://admin:qwweer55@ds020168.mlab.com:20168/elkoedifileshandler');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

var async = require('async')
var Order = require('./models/order')
var ProcessedOrder = require('./models/processedOrder')
var Customer = require('./models/customer')
var ShipTo = require('./models/shipTo')



var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var orders = []
var customers = []
var shipTos = []
var processedOrders = []

function customerCreate(jdeId, name, login, password, gln, currency, type, shipTo, cb) {
    var customerdetail = {jdeId:jdeId, name:name, login:login, password:password, gln:gln,
                        currency:currency, type:type, shipTo:shipTo, created_at:Date.now()};

    var customer = new Customer(customerdetail);

    customer.save(function (err) {
        if (err) {
            cb(err, null);
            return;
        }
        console.log('New Customer: ' + customer);
        customers.push(customer);
        cb(null, customer);
    }  );
}

function generateCustomers(cb) {
    async.parallel([
            function(callback) {
                customerCreate('6011124', 'Tsyganok', 'IvanT', 'q1w2e3r4', '4829900023800', 'UAH', 'Customer', shipTos[0], callback);
            },
            function(callback) {
                customerCreate('6011700', 'ELKO Ukraine', 'login', 'password', '9864066871117', 'UAH', 'Supplier', shipTos[1], callback);
            }
        ],
        // optional callback
        cb);
}

function shipToCreate(jdeId, address, gln, cb) {
    var shipTodetail = {jdeId:jdeId, address:address, gln:gln, created_at:Date.now()};

    var shipTo = new ShipTo(shipTodetail);

    shipTo.save(function (err) {
        if (err) {
            cb(err, null);
            return;
        }
        console.log('New ShipTo: ' + shipTo);
        shipTos.push(shipTo);
        cb(null, shipTo);
    }  );
}

function generateShipTos(cb) {
    async.parallel([
            function(callback) {
                shipToCreate('6011124', 'Kyiv, Kozatska str. 120/4', '4829900023806', callback);
            },
            function(callback) {
                shipToCreate('6011700', 'Kyiv, Kozatska str. 120/4', '9864066871117', callback);
            }
        ],
        // optional callback
        cb);
}

function orderCreate(orderId, holdCode, soldTo, shipTo, comments, shipDate, currency, orderDetails, success, cb) {
    orderDetail = {orderId:orderId, holdCode:holdCode, soldTo:soldTo, shipTo:shipTo, currency:currency,
                    comments:comments, shipDate:shipDate, orderDetails:orderDetails,
                    success:success, created_at:Date.now() }

    var order = new Order(orderDetail);

    order.save(function (err) {
        if (err) {
            cb(err, null)
            return
        }
        console.log('New Order: ' + order);
        orders.push(order)
        cb(null, order)
    }  );
}

var jdeOrderDetail = [{
    lineID: 1,
    productID: 99000002,
    manufacturerCode: 'roz99000002',
    quantityRequested: 1,
    quantityShipped: 1,
    price: 100
}];

function generateOrders(cb) {
    async.parallel([
            function(callback) {
                orderCreate('500660', 'C2', customers[0], shipTos[0],'Номер заказа: РОЗ8412457, точка доставки:4829900023806', '2018-07-09T00:00:00', 'UAH', jdeOrderDetail, true, callback);
            }
        ],
        // optional callback
        cb);
}

function processedOrderCreate(orderId, supplier, buyer, deliveryPlace, currency, shipDate, orderDetails, processedFileName, jdeOrder, success, cb) {
    processedOrderDetail = {orderId:orderId, supplier:supplier, buyer:buyer, deliveryPlace:deliveryPlace,
        currency:currency, shipDate:shipDate, orderDetails:orderDetails, processedFileName:processedFileName,
        jdeOrder: jdeOrder, success:success, created_at:Date.now() }

    var processedOrder = new ProcessedOrder(processedOrderDetail);

    processedOrder.save(function (err) {
        if (err) {
            cb(err, null)
            return
        }
        console.log('New Processed Order: ' + processedOrder);
        processedOrders.push(processedOrder)
        cb(null, processedOrder)
    }  );
}

var processedOrderDetail = [{
    positionNumber: 1,
    productId: 99000002,
    productIdBuyer: 'roz99000002',
    description: 'Материнская плата Gigabyte GA-78LMT-USB3 R2 (AM3/AM3+, AMD 760G, PCI-Ex16)',
    orderedQuantity: 1,
    price: 100,
    priceWithVat: 120,
    vat: 20
}];

function generateProcessedOrders(cb) {
    async.parallel([
            function(callback) {
                processedOrderCreate('РОЗ8412457', customers[1], customers[0], shipTos[0], 'UAH', '2018-07-09T00:00:00', processedOrderDetail, 'order1.xml', order[0], true, callback);
            }
        ],
        // optional callback
        cb);
}

async.series([
        generateShipTos,
        generateCustomers,
        generateOrders,
        generateProcessedOrders
    ],
    // Optional callback
    function(err, results) {
        if (err) {
            console.log('FINAL ERR: ' + err);
        }
        else {
            console.log('Orders: ' + orders);

        }
        // All done, disconnect from database
        mongoose.connection.close();
    });
