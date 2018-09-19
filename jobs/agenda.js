const Agenda = require('agenda');
var mongoose = require('mongoose');

var agenda = new Agenda();

mongoose.connection.on('error', () => {
    console.log('MongoDB connection error');
});

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