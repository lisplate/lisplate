var lisplatepath = require.resolve('../lib/');
var compilerpath = require.resolve('../lib/compiler');

delete require.cache[lisplatepath];
delete require.cache[compilerpath];

var Lisplate = require(lisplatepath);

describe('Lisplate - no compiler - unit tests', function() {

  describe('loadTemplate', function() {
    it('should fail with compiler not loaded and not cached', function(done) {
      var sourceLoader = jasmine
        .createSpy('sourceLoader')
        .and.returnValue(Promise.resolve(''));

      var engine = new Lisplate({
        sourceLoader: sourceLoader
      });
      engine
        .loadTemplate('test')
        .then(function() {
          done.fail('Should not call then, expected error');
        })
        .catch(function(err) {
          expect(err).not.toBeNull();
          done();
        });
    });

    it('should fail with compiler.compile not loaded and not cached', function(done) {
      Lisplate.Compiler = {};

      var sourceLoader = jasmine
        .createSpy('sourceLoader')
        .and.returnValue(Promise.resolve(''));

      var engine = new Lisplate({
        sourceLoader: sourceLoader
      });
      engine
        .loadTemplate('test')
        .then(function() {
          done.fail('Should not call then, expected error');
        })
        .catch(function(err) {
          expect(err).not.toBeNull();
          done();
        });
    });
  });

});
