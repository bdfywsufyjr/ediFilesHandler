var orderController            = require('../../controllers/orderController');

module.exports = function(agenda) {
    agenda.define('read-folder', function(job) {
        orderController.autoModeProcess();
    });
};