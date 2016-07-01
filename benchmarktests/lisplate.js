var Lisplate = require('../');
var fs = require('fs');
var path = require('path');
var Bluebird = require('bluebird');

var readFile = Bluebird.promisify(fs.readFile);

var test = process.argv[2] || 'ui-components';

var engine = new Lisplate({
    sourceLoader: function(name) {
        var filepath = path.resolve(__dirname, test, name + '.ltml');
        return readFile(filepath, 'UTF-8');
    },

    viewModelLoader: function(templatePath) {
        var filepath = path.resolve(__dirname, test, templatePath + '.js');
        var viewmodel = null;
        try {
            viewmodel = require(filepath);
        } catch(e) {
        }
        return Bluebird.resolve(viewmodel);
    }
});

// engine.addHelper('reverse', require('../helpers/util').reverse);

var data = null;
try {
    data = require('./' + test + '/data.json');
} catch (e) {
}
if (!data) {
    try {
        data = require('./' + test + '/data');
    } catch (e) {
    }
}

engine
    .loadTemplate('template')
    .then(function(fn) {
        return engine.render(fn, data);
    })
    .then(function(output) {
        console.log(output);
    })
    .catch(function(err) {
        console.log(err);
    });
