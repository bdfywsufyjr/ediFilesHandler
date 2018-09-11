const Agenda = require('agenda');
var mongoose = require('mongoose');

//const mongoConnectionString = 'mongodb://admin:qwweer55@ds020168.mlab.com:20168/elkoedifileshandler';
//let agenda = new Agenda({db: {address: mongoConnectionString, collection: 'jobs'}});
//var jobs = mongoose.connection.collection('jobs');
//let agenda = new Agenda().mongo(jobs);

var agenda = new Agenda();

mongoose.connection.on('connected', () => {
    agenda.mongo(mongoose.connection.collection('jobs').conn.db, 'jobs');
});

let jobTypes = process.env.JOB_TYPES ? process.env.JOB_TYPES.split(',') : [];

jobTypes.forEach(function(type) {
    require('./jobs/' + type)(agenda);
});

if(jobTypes.length) {
    agenda.on('ready', function() {
        agenda.start();
    });
}

function graceful() {
    agenda.stop(function() {
        process.exit(0);
    });
}

process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);

module.exports = agenda;