(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('../'), require('./template-tests/all'));
  } else {
    factory(root.Lisplate, root.IntegrationTests);
  }
}(this, function(Lisplate, all) {
  'use strict';

  describe('Integration tests', function() {
    var engine = null;

    beforeEach(function() {
      engine = new Lisplate({
        sourceLoader: function(templateName) {
          if (all.tests[templateName]) {
            return all.tests[templateName].source;
          }

          if (all.subcomponents[templateName]) {
            return all.subcomponents[templateName].source;
          }

          throw new Error('Unknown template to load: ' + templateName);
        },

        viewModelLoader: function(templateName) {
          if (all.tests[templateName]) {
            return all.tests[templateName].viewmodel;
          }

          return null;
        },

        stringsLoader: function(templateName) {
          if (all.tests[templateName]) {
            return all.tests[templateName].strings;
          }

          return null;
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
    });

    Object.keys(all.tests).forEach(function(templateName) {
      var data = all.tests[templateName].data;
      var expectedOutput = all.tests[templateName].expected;

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
            console.log(err);
            callback.fail('Catch should not be called with ' + err.message);
          });
      });
    });

  });

}));
