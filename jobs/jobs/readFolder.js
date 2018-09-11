var order_controller            = require('../../controllers/orderController');

module.exports = function(agenda) {
    agenda.define('read-folder', function(job) {
        order_controller.autoModeProcess();
    });
};