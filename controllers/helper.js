var fs      = require('fs');
var path    = require('path');

module.exports = readFolder = (dirname, extFilter) => {

    const readDirPr = new Promise( (resolve, reject) => {
        fs.readdir(dirname,
            (err, filenames) => (err) ? reject(err) : resolve(filenames))
    });

    return readDirPr.then( filenames =>
        Promise.all(filenames
            .filter((filename) => { return path.extname(filename) === extFilter; })
            .map((filename) => {
                return new Promise ( (resolve, reject) => {
                    fs.readFile(dirname + filename, 'utf-8',
                        (err, content) => (err) ? reject(err) : resolve([filename, content]));
                })
            })).catch( error => Promise.reject(error)))
};

module.exports = jdeDate = (ediDate) => {
    var myDate = new Date(ediDate);
    var start = new Date(myDate.getFullYear(), 0, 0);
    var diff = (myDate - start) + ((start.getTimezoneOffset() - myDate.getTimezoneOffset()) * 60 * 1000);
    var dayInYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    var orderDate = '1'+ myDate.getFullYear().toString().substr(-2) + dayInYear;

    return orderDate;
};

module.exports = moveFile = (file, dir2, newName) => {

    var f = path.basename(file);
    var dest = path.resolve(dir2, newName);

    fs.rename(file, dest, (err) => {
        if(err) throw err;
        else console.log('Successfully moved');
    });
};





