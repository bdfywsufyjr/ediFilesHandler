var fs      = require('fs');
var path    = require('path');
var xml2js  = require('xml2js');
var parser  = new xml2js.Parser();

var settingsController = require('./controllers/settingsController');

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

module.exports = readSourceFolder = async (source) => {

    let settings = await settingsController.getGlobalSettingsWithPromise();

    let sourceFolder = source == 'new' ? settings.folder : source == 'archive' ? settings.folder + '/archive/' : settings.folder + '/errors/';

    var content = await readFolder(sourceFolder, '.xml')
        .then(allContents => {
            var results = [];

            allContents.forEach(function (item) {
                parser.parseString(item[1], function (err, result) {
                    results.push(Object.assign(result, {"FILENAME": item[0]}));
                })
            });
            return results;
        }).catch(error => console.log(error));

    return content;
}

module.exports = jdeDate = (ediDate) => {
    var myDate = new Date(ediDate);
    var start = new Date(myDate.getFullYear(), 0, 0);
    var diff = (myDate - start) + ((start.getTimezoneOffset() - myDate.getTimezoneOffset()) * 60 * 1000);
    var dayInYear = Math.floor(diff / (1000 * 60 * 60 * 24)).toLocaleString('en', {minimumIntegerDigits:3,minimumFractionDigits:0,useGrouping:false});;
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

module.exports = distinctByProp = (theArray, prop) => {
    let tempArray = [];
    let isFound = obj => tempArray.find( n => n[prop] === obj[prop]);
    theArray.forEach( current => !isFound(current) && tempArray.push(current));
    return tempArray;
}





