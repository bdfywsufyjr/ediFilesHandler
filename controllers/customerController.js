var Customer = require('../models/customer');

// Display list of all Customers.
exports.customer_list = function(req, res) {

    Customer.find({})
        .exec(function (err, list_customers) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('customer_list', { title: 'Клиенты', customers_list: list_customers });
        });
};

// Get one customer settings
exports.getCustomerSettings = (content) => {

    return Customer.findOne({gln: { $in: content}}, null, { sort: { updated_at: -1 } })
        .exec()
        .then((result) => {
            return result;
        });
};

/*exports.getCustomerSettings = function(content, callback) {

    Customer.findOne({
        gln: { $in: content}
    }, null, { sort: { updated_at: -1 } })
        .exec()
        .then(function (result) {


            callback(result);
        });
};*/

// Get customers settings
exports.getCustomersSettings = function(content, callback) {

    Customer.find({
        gln: { $in: content}
    }, null, { sort: { updated_at: -1 } })
        .lean()
        .then(function (result) {
            callback(result);
        });
};

exports.checkBuyers = (content) => {

    return new Promise( (resolve, reject) => {
        Customer.find({
            gln: { $in: content}
        }, null, { sort: { updated_at: -1 } })
            .lean()
            .then( (result) => resolve(result))
            .catch( (err) => reject(err))
    })
};

// Display Customer create form on GET.
exports.customer_create_get = function(req, res) {

    res.render('customer_form', { title: 'Добавить клиента' });
};

// Handle Customer create on POST.
exports.customer_create_post = function(req, res) {

    var shipTo = [];

    for (var i = 0; i < req.body.sTjdeId.length; i++) {
        shipTo.push({jdeId: req.body.sTjdeId[i], gln: req.body.sTgln[i], address: req.body.sTaddress[i]})
    }

    var customer = new Customer({
        jdeId:      req.body.jdeId,
        name:       req.body.name,
        login:      req.body.login,
        password:   req.body.password,
        gln:        req.body.gln,
        shipTo:     shipTo,
        created_at: Date.now()
    });

    Customer.findOne({ 'jdeId': req.body.jdeId })
        .exec( function(err, found_customer) {
            if (err) { return next(err); }

            if (found_customer) {
                // Customer exists, redirect to its detail page.
                res.redirect(found_customer.url);
            }
            else {
                customer.save(function (err) {
                    if (err) { console.log(err); }
                    // Customer saved. Redirect to detail page.
                    res.redirect(customer.url);
                });
            }
        });
};

// Customer delete on GET.
exports.customer_delete_get = function(req, res) {
    Customer.findByIdAndRemove(req.params.id, (err, customer) => {
        if (err) return res.status(500).send(err);
        const response = {
            message: "Customer successfully deleted",
            id: customer._id
        };

        return res.json({'status': '200', 'response': response});
    });
};

// Display Customer update form on GET.
exports.customer_update_get = function(req, res, next) {
    // Get customer for form.
    Customer.findById(req.params.id)
        .exec(function (err, customer) {
            if (err) { return next(err); }
            //Successful, so render
            res.render('customer_form', { title: 'Редактировать ' + customer.name, customer: customer });
        });
};

// Handle Customer update on POST.
exports.customer_update_post = function(req, res) {

    var shipTo = [];

    for (var i = 0; i < req.body.sTjdeId.length; i++) {
        shipTo.push({jdeId: req.body.sTjdeId[i], gln: req.body.sTgln[i], address: req.body.sTaddress[i]})
    }

    var editedCustomer = new Customer(
        {
            jdeId:      req.body.jdeId,
            name:       req.body.name,
            login:      req.body.login,
            password:   req.body.password,
            gln:        req.body.gln,
            shipTo:     shipTo,
            _id:        req.params.id //This is required, or a new ID will be assigned!
        });

    console.log(editedCustomer);

    Customer.findByIdAndUpdate(req.params.id, editedCustomer, {}, function (err,customer) {
        if (err) { return next(err); }

        res.redirect(customer.url);
    });
};

// Return list of all Customer ShipTo.
exports.customerShipTo_list = function(req, res, next) {

    Customer.findById(req.params.id)
        .exec(function (err, customer) {
            if (err) { return next(err); }
            //Successful, so render
            res.json({'shipTo': customer.shipTo});
        });
};
/*
// Display list of all Customer ShipTo for AJAX request.
exports.customerShipTo_list_ajax = function(req, res, next) {

    Customer.findById(req.params.id)
        .exec(function (err, customer) {
            if (err) { return next(err); }
            //Successful, so render

            res.json({'shipTo': customer.shipTo});
        });
};
*/
// Display Customer shipto address create form on GET.
exports.customerShipTo_create_get = function(req, res) {

    res.render('customerShipTo_form', { title: 'Create ShipTo', customer: req.params.id });
};

// Handle Customer create on POST.
exports.customerShipTo_create_post = function(req, res, next) {

    var newAddress = {
        jdeId: req.body.jdeId,
        address: req.body.address,
        gln: req.body.gln
    };

    Customer.findByIdAndUpdate(req.body.id, {$push: {shipTo: newAddress}}, function (err, customer) {
        if (err) { return next(err); }
        // Successful - redirect to shipTo list page.

        res.redirect(customer.shipto_url);
    });
};

// Display Customer ShipTo update form on GET.
exports.customerShipTo_update_get = function(req, res, next) {
    // Get customer ShipTo for form.
    Customer.findById(req.params.id)
        .exec(function (err, customer) {
            if (err) { return next(err); }

            customer.shipTo.forEach( function (shipTo) {
                if (shipTo._id == req.params.oid) {
                    res.render('customerShipTo_form', { title: 'Update ' + customer.name + ' ship address', customer: customer, shipTo: shipTo });
                }
            });
        });
};

// Handle Customer ShipTo update on POST.
exports.customerShipTo_update_post = function(req, res) {

    var editedShipTo = {
        _id:        req.params.id,
        jdeId:      req.params.jdeId,
        address:    req.params.address,
        gln:        req.params.gln
    }

    var editedCustomer = new Customer(
        {
            jdeId:      req.body.jdeId,
            name:       req.body.name,
            login:      req.body.login,
            password:   req.body.password,
            gln:        req.body.gln,
            _id:        req.params.id
        });

    Customer.findByIdAndUpdate(req.params.id, editedCustomer, {}, function (err,customer) {
        if (err) { return next(err); }

        res.redirect(customer.url);
    });
};