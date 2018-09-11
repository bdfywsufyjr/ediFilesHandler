var express                     = require('express');
var router                      = express.Router();

// Require controller modules.
var settings_controller         = require('../controllers/settingsController');
var customer_controller         = require('../controllers/customerController');
var order_controller            = require('../controllers/orderController');

/// ROUTES ///

// GET error page.
router.get('/error', settings_controller.error);

/// NEW ORDER ROUTES ///

// GET data home page.
router.get('/', order_controller.index);

// GET newOrder details page.
router.get('/detail/:id', order_controller.file_detail);

/// SETTINGS ROUTES ///

// GET settings home page.
router.get('/settings', settings_controller.index);

// GET global settings information.
router.get('/settings/global', settings_controller.getGlobalSettings);

// GET request for settings creating.
router.get('/settings/create', settings_controller.globalSettings_create_get);

// GET request for settings creating.
router.post('/settings/create', settings_controller.globalSettings_create_post);

// GET global settings update
router.get('/settings/:id/update', settings_controller.globalSettings_update_get);

// POST global settings update
router.post('/settings/:id/update', settings_controller.globalSettings_update_post);

// GET request to delete global settings.
router.get('/settings/:id/delete', settings_controller.globalSettings_delete_get);

/// ORDER ROUTES ///

// GET request for creating Order.
router.get('/order/create/:id', order_controller.order_create_get);

// POST request for creating Order.
router.post('/order/create', order_controller.order_create_post);

// GET request to delete Order.
router.get('/order/:id/delete', order_controller.order_delete_get);

// POST request to delete Order.
router.post('/order/:id/delete', order_controller.order_delete_post);

// GET request to update Order.
router.get('/order/:id/update', order_controller.order_update_get);

// POST request to update Order.
router.post('/order/:id/update', order_controller.order_update_post);

// GET request for one Order.
router.get('/order/:id', order_controller.order_detail);

// GET request for one Order to view file from archive folder.
router.get('/order/:id/archive', order_controller.archive_file_detail);

// GET request for list of all Orders (processed orders)
router.get('/orders', order_controller.order_list);

/// CUSTOMER ROUTES ///

// GET request for creating a Customer. NOTE This must come before route that displays Customer (uses id).
router.get('/customer/create', customer_controller.customer_create_get);

// POST request for creating Customer.
router.post('/customer/create', customer_controller.customer_create_post);

// GET request to delete Customer.
router.get('/customer/:id/delete', customer_controller.customer_delete_get);

// POST request to delete Customer.
//router.post('/customer/:id/delete', customer_controller.customer_delete_post);

// GET request to update Customer.
router.get('/customer/:id/update', customer_controller.customer_update_get);

// POST request to update Customer.
router.post('/customer/:id/update', customer_controller.customer_update_post);

// GET request for one Customer.
//router.get('/customer/:id', customer_controller.customer_detail);

// GET request for list of all Customer.
router.get('/customer', customer_controller.customer_list);

// GET request for Customer ShipTo list.
router.get('/customer/:id/shipTo', customer_controller.customerShipTo_list);

// GET request for Customer ShipTo list for AJAX request.
//router.get('/customer/:id/shipToList', customer_controller.customerShipTo_list_ajax);

// GET request for creating customer ShipTo address.
router.get('/customer/:id/shipto/create', customer_controller.customerShipTo_create_get);

// POST request for creating customer ShipTo address.
router.post('/customer/:id/shipto/create', customer_controller.customerShipTo_create_post);

// GET request to update Customer ShipTo.
router.get('/customer/:id/shipto/:oid/update', customer_controller.customerShipTo_update_get);

// POST request to update Customer ShipTo.
router.post('/customer/:id/shipto/:oid/update', customer_controller.customerShipTo_update_post);

module.exports = router;