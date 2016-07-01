var Lisplate = require('../');
var fs = require('fs');
var path = require('path');
var Bluebird = require('bluebird');

var readFile = Bluebird.promisify(fs.readFile);

var test = 'ui-components';

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

engine
    .loadTemplate('template')
    .then(function(fn) {
        return engine.render(fn, require('./' + test + '/data.json'));
    })
    .then(function(output) {
        console.log(output);
    })
    .catch(function(err) {
        console.log(err);
    });
