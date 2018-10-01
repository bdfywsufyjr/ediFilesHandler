var Order                       = require('../models/order');

var xml2js                      = require('xml2js');
var parser                      = new xml2js.Parser();
var fs                          = require('fs');
var path                        = require('path');
var rp                          = require('request-promise');
var errors                      = require('request-promise/errors');

var helper                      = require('../controllers/helper');

var customerController          = require('../controllers/customerController');
var settingsController          = require('../controllers/settingsController');
var errorController             = require('../controllers/errorController');

/**
 *
 * Helper methods
 */

async function readSourceFolderWithPromise(archive) {

    let settings = await settingsController.getGlobalSettingsWithPromise();
    let sourceFolder = archive == false ? settings.folder : settings.folder + '/archive/';

    var content = await readFolder(sourceFolder, '.xml')
        .then(allContents => {
            var results = [];

            allContents.forEach(function (item) {
                parser.parseString(item[1], function (err, result) {
                    results.push(Object.assign(result, {"FILENAME": item[0]}));
                })
            });
            return results;
        }).catch(error => callback(error));

    return content;
}

// Check and read folder content
async function readSourceFolder(archive, callback) {

    let settings = await settingsController.getGlobalSettingsWithPromise();

    let sourceFolder = archive == false ? settings.folder : settings.folder + '/archive/';

    if (sourceFolder) {
        readFolder(sourceFolder, '.xml')
            .then(allContents => {
                var results = [];

                allContents.forEach(function (item) {
                    parser.parseString(item[1], function (err, result) {
                        results.push(Object.assign(result, {"FILENAME": item[0]}));
                    })
                });
                callback(null, results);
            }).catch(error => callback(error));
    }
}

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
/*
function getDataForOrderRequest(req, callback) {

    findFileByOrderNumber(req.params.id, async function (order) {

        let data = await customerController.getCustomerSettings(order['ORDER']['HEAD'][0]['BUYER']);
        let settings = await settingsController.getGlobalSettingsWithPromise();
        let folder = settings.folder;
        let file = order['FILENAME'];

        if (!data) {
            let error = {order: order['ORDER'].NUMBER, fileName: file, status: 'undefined', response: 'Customer doesnt exists'};
            errorController.error_create(error).then( () => {moveFile(folder + file, folder + '/errors/', file)});
        } else {
            var shipTo;
            var orderLines = [];

            data.shipTo.forEach(function (item) {
                if (item.gln == order['ORDER']['HEAD'][0]['DELIVERYPLACE'][0]) {
                    shipTo = item.jdeId;
                }
            });

            order['ORDER']['HEAD'][0]['POSITION'].forEach(function (orderLine) {
                var jsonOrderLine = {
                    "productId": parseInt(orderLine.PRODUCTIDSUPPLIER[0]),
                    "quantity": parseInt(orderLine.ORDEREDQUANTITY[0]),
                    "price": parseFloat(orderLine.PRICEWITHVAT[0]),
                    "customerProductId": parseInt(orderLine.PRODUCTIDBUYER[0])
                };
                orderLines.push(jsonOrderLine);
            });

            var json = {
                "deliveryAddress": parseInt(shipTo),
                "requestedDeliveryDate": parseInt(jdeDate(order['ORDER'].DATE)),
                "orderIfAllAvailable": false,
                "deliveryInstructions": "Номер заказа: " + order['ORDER'].NUMBER,
                "customerPO": order['ORDER'].NUMBER[0],
                "orderLines": orderLines
            };

            var options = {
                url: 'https://kiev.elkogroup.com/api/Sales/CreateOrder?username=' + data.login + '&password=' + data.password,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                resolveWithFullResponse: true,
                body: json,
                json: true
            };

            callback({request: options, order: order, customer: data})
        }
    });
}
*/
async function getDataForOrderRequestWithPromise(req) {

    let order = await findFileByOrderNumber(req.params.id);
    let data = await customerController.getCustomerSettings(order['ORDER']['HEAD'][0]['BUYER']);
    let settings = await settingsController.getGlobalSettingsWithPromise();
    let folder = settings.folder;
    let file = order['FILENAME'];

    var options = {
        url: 'https://kiev.elkogroup.com/api/Sales/CreateOrder?username=' + data.login + '&password=' + data.password,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        resolveWithFullResponse: true,
        body: '',
        json: true
    };

    if (!data) {
        let error = {order: order['ORDER'].NUMBER, fileName: file, status: 'undefined', response: 'Customer doesnt exists'};
        errorController.error_create(error).then( () => {moveFile(folder + file, folder + '/errors/', file)});

    } else {
        var shipTo;
        var orderLines = [];

        data.shipTo.forEach(function (item) {
            if (item.gln == order['ORDER']['HEAD'][0]['DELIVERYPLACE'][0]) {
                shipTo = item.jdeId;
            }
        });

        order['ORDER']['HEAD'][0]['POSITION'].forEach(function (orderLine) {
            var jsonOrderLine = {
                "productId": parseInt(orderLine.PRODUCTIDSUPPLIER[0]), "quantity": parseInt(orderLine.ORDEREDQUANTITY[0]),
                "price": parseFloat(orderLine.PRICEWITHVAT[0]), "customerProductId": parseInt(orderLine.PRODUCTIDBUYER[0])
            };
            orderLines.push(jsonOrderLine);
        });

        var json = {
            "deliveryAddress": parseInt(shipTo), "requestedDeliveryDate": parseInt(jdeDate(order['ORDER'].DATE)),
            "orderIfAllAvailable": false, "deliveryInstructions": "Номер заказа: " + order['ORDER'].NUMBER,
            "customerPO": order['ORDER'].NUMBER[0], "orderLines": orderLines
        };

        options.body = json;

        return {request: options, order: order, customer: data};
    }
}

// JDE order request to ELKO
async function createOrderPostRequest(req, callback) {

    let options = await getDataForOrderRequestWithPromise(req);

    // API request for order
    rp(options.request)
        .then( (result) => {

            // Save new order
            var newOrder = new Order(
                {
                    orderId: result.body.orderId, holdCode: result.body.holdCode, soldTo: options.customer._id,
                    shipTo: options.request.body.deliveryAddress, comments: result.body.comments,
                    shipDate: result.body.shipDate, success: true, orderDetails: result.body.orderDetails,
                    ediOrder: options.order['ORDER'].NUMBER, fileName: options.order['FILENAME'],
                }
            );

            Order.findOne( { 'orderId': result.body.orderId } )
                .exec( function (foundOrder) {

                    if (foundOrder) {

                        callback(null, foundOrder);
                    } else {
                        newOrder.save( function (err, savedOrder) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, savedOrder);
                            }
                        });
                    }
                });
        })
        .catch(errors.StatusCodeError, function (reason) {
            console.log('The server responded with a status codes other than 2xx.');
            console.log('Error: ' + reason);
            callback(reason);
            // The server responded with a status codes other than 2xx.
        })
        .catch(errors.RequestError, function (reason) {
            console.log('The request failed due to technical reasons.');
            console.log('Error: ' + reason);
            callback(reason);
            // The request failed due to technical reasons.
        });
}

/**
 * Application Auto mode processing
 */

exports.autoModeProcess = async () => {

    var orders = await readSourceFolderWithPromise(false);
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
            let error = {order: order['ORDER'].NUMBER, fileName: file, status: 'undefined', response: 'Customer doesnt exists'};
            errorController.error_create(error).then( () => {moveFile(folder + file, folder + '/errors/', file)});
        })
    }
    
    matchedOrders.forEach(function (order) {
        var req = {'params': {'id': order['ORDER'].NUMBER}};
        createOrderPostRequest(req, async function (err, result) {
            let file = order['FILENAME'];
            if (err) {
                let error = {order: order['ORDER'].NUMBER, fileName: file, status: err.statusCode, response: err.message};
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
exports.index = function (req, res) {

    readSourceFolder(false, function(err, orders) {

        if (err) {
            // Something bad happened
            res.render('error', {message: err});

            return;
        }

        var buyers = orders.reduce( function (r, o) {
            r.push(o['ORDER']['HEAD'][0]['BUYER']);

            return r;
        }, []);

        customerController.getCustomersSettings(buyers, function (rest) {

            var result = orders.reduce(function (r, o1) {
                var f = rest.find(function (o2) {

                    return o1['ORDER']['HEAD'][0]['BUYER'] == o2.gln
                });

                var address = 'undefined';

                if (f) {
                    f.shipTo.forEach(function (shipTo) {
                        if (shipTo.gln == o1['ORDER']['HEAD'][0]['DELIVERYPLACE'][0]) {
                            address = shipTo.address;
                        }
                    });
                }

                r.push(f ? Object.assign(o1, {"CUSTOMER": f.name}, {"SHIPTO": address}) : Object.assign(o1, {"CUSTOMER": 'undefined'}, {"SHIPTO": address}));

                return r;
            }, []);

            res.render('data_list', {title: 'Список заказов', result: result});
        });
    });
};

// Display detail page for a specific file from index page.
exports.file_detail = function(req, res) {
    readSourceFolder(false, function (err, results) {
        results.forEach(function (order) {
            if (order['ORDER'].NUMBER == req.params.id ) {
                res.render('data_detail', { title:  req.params.id, header: order, details: order['ORDER']['HEAD'][0]['POSITION'] });
            }
        });
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
                            //console.log(shipTo_list.address);
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

    readSourceFolder(true, function (err, results) {

        Order.findById(req.params.id)
            .exec(function (err, order) {
                if (err) {
                    console.log(err);
                    return;
                }

                results.forEach(function (file) {
                    if (file['FILENAME'] == order.fileName ) {
                        res.render('data_detail', { title:  order.ediOrder, header:file, details: file['ORDER']['HEAD'][0]['POSITION'] });
                    }
                });
            });
    });
};

// Order create GET.
exports.order_create_get = function(req, res) {
    createOrderPostRequest(req, function (err, result) {
        if (err) {
            // Something bad happened

            res.json({'status': 'error', 'message': err.message, 'id': ''});

            return;
        }

        settingsController.getGlobalSettings(function (err, data) {
            var folder = data[0].folder;

            if (folder) {
                moveFile(folder + result.fileName, folder + '/archive/', 'SP_' + result.orderId + '.xml');
            }

            res.json({'status': 'success', 'message': '', 'id': result._id});
        })
    });
};