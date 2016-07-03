var Lisplate = require('../');
var fs = require('fs');
var path = require('path');
var Bluebird = require('bluebird');

var readFile = Bluebird.promisify(fs.readFile);

var tests = fs
  .readdirSync(__dirname + '/templates')
  .filter(function(testname) {
    return testname !== 'subcomponents';
  })
  .map(function(testname) {
    return testname.substring(0, testname.length - 5);
  });

describe('Integration tests', function() {
  var engine = null;

  beforeEach(function() {
    engine = new Lisplate({
      sourceLoader: function(templateName) {
        var filepath = path.resolve(__dirname, 'templates', templateName + '.ltml');
        return readFile(filepath, 'UTF-8');
      },

      viewModelLoader: function(templateName) {
        var filepath = path.resolve(__dirname, 'template-viewmodels', templateName + '.js');
        var viewmodel = null;
        try {
            viewmodel = require(filepath);
        } catch(e) {
        }
        return Bluebird.resolve(viewmodel);
      },

      stringsLoader: function(templateName) {
        var filepath = path.resolve(__dirname, 'template-strings', templateName + '.json');
        var strings = null;
        try {
            strings = require(filepath);
        } catch(e) {
        }
        return Bluebird.resolve(strings);
      }
    });

    engine.addHelper('reverse', function reverse(str) {
      var out = "";
      for (var i=str.length-1; i>=0; i--) {
        out += str.charAt(i);
      }
      return out;
    });
  });

  afterEach(function() {
    engine = null;
    data = null;
  });

  tests.forEach(function(templateName) {
    var data = null;
    try {
      data = require(path.resolve(__dirname, 'template-data', templateName + '.json'));
    } catch (e) {
    }
    if (!data) {
      try {
        data = require(path.resolve(__dirname, 'template-data', templateName));
      } catch (e) {
      }
    }

    var expectedOutput = fs.readFileSync(
      path.resolve(__dirname, 'expected-outputs', templateName + '.html'),
      'UTF-8'
    );

    it('Template test - ' + templateName, function(callback) {
      engine
        .loadTemplate(templateName)
        .then(function(fn) {
          return engine.render(fn, data);
        })
        .then(function(output) {
          expect(output).toEqual(expectedOutput);
          callback();
        })
        .catch(function(err) {
          callback.fail('Catch should not be called with ' + err.message);
        });
    });
  });

});
