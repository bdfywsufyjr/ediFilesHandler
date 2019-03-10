var Order                       = require('../models/order');

var xml2js                      = require('xml2js');
var parser                      = new xml2js.Parser();
var fs                          = require('fs');
var path                        = require('path');
var rp                          = require('request-promise');
var errors                      = require('request-promise/errors');

var helper                      = require('../helper');

var customerController          = require('../controllers/customerController');
var settingsController          = require('../controllers/settingsController');
var errorController             = require('../controllers/errorController');
var esdController               = require('../controllers/esdController');

/**
 *
 * Helper methods
 */

// Prepare data for JDE order request
async function findFileByOrderNumber(orderNumber){

    let settings = await settingsController.getGlobalSettingsWithPromise();
    let sourceFolder = settings.folder;

    var content = await readFolder(sourceFolder, '.xml')
        .then(allContents => {
            var results = [];

            allContents.forEach(function (item) {
                parser.parseString(item[1], function (err, result) {
                    results.push(Object.assign(result, {"FILENAME": item[0]}));
                })
            });

            var actualFile = results.filter(o => o['ORDER'].NUMBER[0] == orderNumber);

            return actualFile[0];
        }).catch( error => callback(error));

    return content;
}

async function getDataForOrderRequest(params) {

    const order = params.order;

    return new Promise( async (resolve, reject) => {
        const customerData = await customerController.getCustomerSettings(order['ORDER']['HEAD'][0]['BUYER']);

        if (!customerData) {
            reject({request: null, type: null, order: order, customer: '', message: 'Customer does not exists'})
        }

        const initialOrderLines = order['ORDER']['HEAD'][0]['POSITION'];
        const esdItems = await esdController.getEsdSettings();

        let esdOrderLines = initialOrderLines.filter(o1 => esdItems.find(o2 => parseInt(o1.PRODUCTIDSUPPLIER[0]) == o2.id));

        if (esdOrderLines.length > 0 && initialOrderLines.length != esdOrderLines.length) {
            reject({request: null, type: null, order: order, customer: '', message: 'Mixed orders are not allowed'});
        }

        let options = {
            url: '',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            resolveWithFullResponse: true,
            body: '',
            json: true
        };

        const orderLines = initialOrderLines.map(orderLine => {
            return {
                "productId": parseInt(orderLine.PRODUCTIDSUPPLIER[0]),
                "quantity": parseInt(orderLine.ORDEREDQUANTITY[0]),
                "price": parseFloat(orderLine.PRICEWITHVAT[0]),
                "customerProductId": parseInt(orderLine.PRODUCTIDBUYER[0])
            }
        });

        if (customerData.esd && esdOrderLines.length > 0) {
            options.url = params.settings.esdUrl + '?';
            options.headers['Authorization'] = 'APIKey ' + customerData.apiKey;
            options.body = {
                "orderLines": orderLines,
                "comment": "Номер заказа: " + order['ORDER'].NUMBER,
                "email": "sample string 2",
                "version": "testandignoreholds",
                "maxCharsPerLineForReceipt": 100
            };

            resolve({request: options, type: 'esd', order: order, customer: customerData, message: ''});
        }

        if (esdOrderLines.length === 0) {
            const shipTo = customerData.shipTo.map( item => item.gln == order['ORDER']['HEAD'][0]['DELIVERYPLACE'][0] ? item.jdeId : undefined);
            options.url = params.settings.apiUrl + '?';
            options.qs = {
                username: customerData.login,
                password: customerData.password
            }
            options.body = {
                "deliveryAddress": parseInt(shipTo), "requestedDeliveryDate": parseInt(jdeDate(order['ORDER'].DATE)),
                "orderIfAllAvailable": false, "deliveryInstructions": "Номер заказа: " + order['ORDER'].NUMBER,
                "customerPO": order['ORDER'].NUMBER[0], "orderLines": orderLines
            };

            resolve({request: options, type: 'general', order: order, customer: customerData, message: ''});
        }
    });
}

// JDE order request to ELKO
async function createOrderPostRequest(options) {

    console.log(options.request);

    return new Promise( (resolve, reject) => {
        rp(options.request)
            .then(result => {

                // Save new order
                var newOrder = new Order(
                    {
                        orderId: result.body.orderId, holdCode: result.body.holdCode, soldTo: options.customer._id,
                        shipTo: options.request.body.deliveryAddress, comments: result.body.comments,
                        shipDate: result.body.shipDate, success: true, orderDetails: result.body.orderDetails,
                        ediOrder: options.order['ORDER'].NUMBER, fileName: options.order['FILENAME'],
                    }
                );

                newOrder.save( (err, savedOrder) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(savedOrder);
                    }
                });
            })
            .catch(error => {
                console.log('The server responded with a status codes other than 2xx.');
                console.log('Error: ' + error);
                reject({request: '', type: '', order: options.order, customer: '', message: error.message});
            });
    });
}

/**
 * Application Auto mode processing
 */

//TODO: Check and implement esd orders handling
exports.autoModeProcess = async () => {

    var orders = await readSourceFolder('new');
    let settings = await settingsController.getGlobalSettingsWithPromise();
    let folder = settings.folder;
    var buyers = orders.reduce(function (r, o) {
        r.push(o['ORDER']['HEAD'][0]['BUYER']);

        return r;
    }, []);

    var matchedBuyers = await customerController.checkBuyers(buyers);
    var matchedOrders = orders.filter(o1 => matchedBuyers.find(o2 => o1['ORDER']['HEAD'][0]['BUYER'] == o2.gln));
    var restOrders = orders.filter(o => !matchedOrders.find(o2 => o['ORDER'].NUMBER === o2['ORDER'].NUMBER));

    if (restOrders.length > 0) {
        restOrders.forEach( order => {
            let file = order['FILENAME'];
            let error = {order: order['ORDER'].NUMBER, filename: file, status: 'undefined', response: 'Customer does not exists'};
            errorController.error_create(error).then( () => {moveFile(folder + file, folder + '/errors/', file)});
        })
    }

    matchedOrders.forEach(function (order) {
        var req = {'params': {'id': order['ORDER'].NUMBER}};
        createOrderPostRequest(req, async function (err, result) {
            let file = order['FILENAME'];
            if (err) {
                let error = {order: order['ORDER'].NUMBER, filename: file, status: err.statusCode, response: err.message};
                errorController.error_create(error).then( () => {moveFile(folder + file, folder + '/errors/', file)});
            } else {
                moveFile(folder + file, folder + '/archive/', 'SP_' + result.orderId + '.xml');
            }
        }).catch((err) => {console.log('err: ' + err)});;
    });
}

/**
 * Routes handling methods
 */

// Index page
exports.index = async function (req, res) {

    const orders = await readSourceFolder('new');
    const esdItems = await esdController.getEsdSettings();

    let buyers = orders.reduce( function (r, o) {
        r.push(o['ORDER']['HEAD'][0]['BUYER']);

        return r;
    }, []);

    customerController.getCustomersSettings(buyers, rest => {

        let result = orders.reduce((r, o1) => {
            let f = rest.find(o2 => {

                return o1['ORDER']['HEAD'][0]['BUYER'] == o2.gln
            });

            const orderLines = o1['ORDER']['HEAD'][0]['POSITION'];
            const esdOrderLines = orderLines.filter(o1 => esdItems.find(o2 => parseInt(o1.PRODUCTIDSUPPLIER[0]) == o2.id));
            const type = esdOrderLines.length > 0 ? 'esd' : 'stock';

            let address = 'undefined';

            if (f) {
                f.shipTo.forEach(shipTo => {
                    if (shipTo.gln == o1['ORDER']['HEAD'][0]['DELIVERYPLACE'][0]) {
                        address = shipTo.address;
                    }
                });
            }

            r.push(f ? Object.assign(o1, {"CUSTOMER": f.name}, {"SHIPTO": address}, {"type": type}) : Object.assign(o1, {"CUSTOMER": 'undefined'}, {"SHIPTO": address}, {"type": type}));

            return r;
        }, []);

        res.render('data_list', {title: 'Список заказов', result: result});
    });
};

// Display detail page for a specific file from index page.
exports.file_detail = async function(req, res) {

    var orders = await readSourceFolder('new');

    orders.forEach( (order) => {
        if (order['ORDER'].NUMBER == req.params.id ) {
            res.render('data_detail', { title:  req.params.id, header: order, details: order['ORDER']['HEAD'][0]['POSITION'] });
        }
    });
};

// Display list of all Archived Orders (already processed orders).
exports.order_list = function(req, res) {
    Order.find({})
        .populate('soldTo')
        .exec(function (err, list_orders) {
            if (err) { return next(err); }
            //Successful, so render

            var orders = [];

            list_orders.forEach(function (order) {
                if (order.soldTo) { // check whether SoldTo exists in related entity
                    order.soldTo.shipTo.forEach(function (shipTo_list) {
                        if (shipTo_list.jdeId == order.shipTo) {
                            orders.push(Object.assign(order, {"deliveryAddress": shipTo_list.address}));
                        }
                    });
                } else { // In case SoldTo deleted from related entity show undefined
                    orders.push(Object.assign(order, {"soldTo":{"name": 'undefined'}, "deliveryAddress": 'undefined'}));
                }
            });

            res.render('order_list', { title: 'Архив заказов', orders_list: orders });
        });
};

// Display detail page for a specific archive order (already processed order).
exports.order_detail = function(req, res) {
    Order.findById(req.params.id)
        .populate('soldTo')
        .exec(function (err, order) {
            if (err) {
                console.log(err);
                return;
            }
            //Successful, so render
            res.render('order_detail', { title: 'Заказ', order: order});
        });
};

// Display detail page for a specific file in archive folder.
exports.archive_file_detail = function(req, res) {

    let files = readSourceFolder('archive');

    Order.findById(req.params.id)
        .exec(function (err, order) {
            if (err) {
                console.log(err);
                return;
            }

            files.forEach(function (file) {
                if (file['FILENAME'] == order.fileName ) {
                    res.render('data_detail', { title:  order.ediOrder, header:file, details: file['ORDER']['HEAD'][0]['POSITION'] });
                }
            });
        });
};

// Order create GET.
exports.order_create_get = async function (req, res) {
    const order = await findFileByOrderNumber(req.params.id);
    const settings = await settingsController.getGlobalSettingsWithPromise();
    const folder = settings.folder;

    Promise.resolve(getDataForOrderRequest({order: order, settings: settings}))
        .then(request => {
            Promise.resolve(createOrderPostRequest(request))
                .then(result => {
                    moveFile(folder + result.fileName, folder + '/archive/', 'SP_' + result.orderId + '.xml');

                    res.json({'status': 'success', 'message': '', 'id': result._id});
                }).catch(error => {
                    res.json({'status': 'error', 'message': error, 'id': ''})
            })
        })
        .catch(error => {
            res.json({'status': 'error', 'message': error.message, 'id': ''});
        });
};