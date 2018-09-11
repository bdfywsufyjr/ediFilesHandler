var express = require('express');
var router = express.Router();


// Cron Job
/*
var CronJob = require('cron').CronJob;
var async = require('async');
var NUMBER_CONCURRENT_JOBS = 1;

var q = async.queue(function(task, callback) {
    task(callback);
}, NUMBER_CONCURRENT_JOBS);

var job = function(callback) {
    setTimeout(function() {
        console.log('JOB EXECUTED');
        callback();
    }, 5000);
}

new CronJob('* * * * * *', function() {
    console.log('JOB REQUIRED');
    q.push(job);
}, null, true, 'America/Los_Angeles');

*/


// GET home page.
router.get('/', function(req, res) {

    res.redirect('/data');
});

module.exports = router;
