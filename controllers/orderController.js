var xml2js                      = require('xml2js');
var parser                      = new xml2js.Parser();

var rp                          = require('request-promise');
var errors                      = require('request-promise/errors');

var helper                      = require('../controllers/helper');

var Order                       = require('../models/order');

var customerController          = require('../controllers/customerController');
var settingsController          = require('../controllers/settingsController');
var errorController             = require('../controllers/errorController');


var fs      = require('fs');
var path    = require('path');

/**
 *
 * Helper methods
 */

// Check and read folder content
function readSourceFolder(archive, callback) {
    settingsController.getGlobalSettings(function (err, data) {

        if (err) {
            callback(err);

            return;
        }

        var sourceFolder = archive == false ? data[0].folder : data[0].folder + '/archive/';

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
                }).catch( error => callback(error));
        }
    })
}

// Prepare data for JDE order request

function findFileByOrderNumber(orderNumber, callback){

    settingsController.getGlobalSettings(function (err, data) {

        var sourceFolder = data[0].folder;

        if (sourceFolder) {
            readFolder(sourceFolder, '.xml')
                .then(allContents => {
                    var results = [];

                    allContents.forEach(function (item) {
                        parser.parseString(item[1], function (err, result) {
                            results.push(Object.assign(result, {"FILENAME": item[0]}));
                        })
                    });

                    var actualFile = results.filter(o => o['ORDER'].NUMBER[0] == orderNumber);

                    callback(actualFile[0]);
                }).catch( error => callback(error));
        }
    })
}

function orderRequestPreparing(req, callback) {

    findFileByOrderNumber(req.params.id, function (order) {

        customerController.getCustomerSettings(order['ORDER']['HEAD'][0]['BUYER'], function (data) {
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
        });
    });
}

// JDE order request to ELKO
function jdeOrderCreateRequest(req, callback) {

    orderRequestPreparing(req, function (options) {
        // API request for order
        rp(options.request)
            .then( (result) => {

                // Save new order
                var newOrder = new Order(
                    {
                        orderId: result.body.orderId,
                        holdCode: result.body.holdCode,
                        soldTo: options.customer._id,
                        shipTo: options.request.body.deliveryAddress,
                        comments: result.body.comments,
                        shipDate: result.body.shipDate,
                        success: true,
                        orderDetails: result.body.orderDetails,
                        ediOrder: options.order['ORDER'].NUMBER,
                        fileName: options.order['FILENAME'],
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
                callback(reason);
                // The server responded with a status codes other than 2xx.
            })
            .catch(errors.RequestError, function (reason) {
                callback(reason);
                // The request failed due to technical reasons.
            });
    })
}

/**
 * Application Auto mode processing
 */

exports.autoModeProcess = () => {

   readSourceFolder(false, function (err, orders) {

       var buyers = orders.reduce( function (r, o) {
           r.push(o['ORDER']['HEAD'][0]['BUYER']);

           return r;
       }, []);

       customerController.checkBuyers(buyers)
           .then( rest => {

               var result = orders.filter(o1 => rest.find(o2 => o1['ORDER']['HEAD'][0]['BUYER'] == o2.gln));

               result.forEach(function (order) {
                   var req = {'params': {'id': order['ORDER'].NUMBER}};
                   jdeOrderCreateRequest(req, function (err, result) {
                       settingsController.getGlobalSettings( (e, data) => {
                           var folder = data[0].folder;
                           if (err) {
                               let file = order['FILENAME'];
                               let error = {order: order['ORDER'].NUMBER, fileName: file, status: err.statusCode, response: err.message}
                               errorController.error_create(error)
                                   .then( res => {
                                       moveFile(folder + file, folder + '/errors/', file);
                                   })
                           } else {
                               moveFile(folder + result.fileName, folder + '/archive/', 'SP_' + result.orderId + '.xml');
                           }
                       });
                   });
               })
           })
    })
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
    jdeOrderCreateRequest(req, function (err, result) {
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