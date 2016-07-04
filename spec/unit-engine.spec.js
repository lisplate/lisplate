var Lisplate = require('../');
var fs = require('fs');
var path = require('path');
var Bluebird = require('bluebird');

var readFile = Bluebird.promisify(fs.readFile);

describe('Lisplate unit tests', function() {

  describe('constructor', function() {
    it('should allow no option constructor', function() {
      var engine = new Lisplate();
      expect(engine).not.toBeNull();
      expect(engine.sourceLoader).toBeUndefined();
      expect(engine.viewModelLoader).toBeUndefined();
      expect(engine.stringsLoader).toBeUndefined();
    });

    it('should set loaders passed via options', function() {
      var options = {
        sourceLoader: function(){},
        viewModelLoader: function(){},
        stringsLoader: function(){}
      };

      var engine = new Lisplate(options);
      expect(engine.sourceLoader).toEqual(options.sourceLoader);
      expect(engine.viewModelLoader).toEqual(options.viewModelLoader);
      expect(engine.stringsLoader).toEqual(options.stringsLoader);
    });
  });

  describe('loadTemplate', function() {
    it('should fail if null templateName', function(done) {
      var engine = new Lisplate();
      engine
        .loadTemplate()
        .then(function() {
          done.fail('Should not call then, expected error');
        })
        .catch(function(err) {
          expect(err).not.toEqual(null);
          done();
        });
    });

    it('should fail if empty templateName', function(done) {
      var engine = new Lisplate();
      engine
        .loadTemplate('')
        .then(function() {
          done.fail('Should not call then, expected error');
        })
        .catch(function(err) {
          expect(err).not.toEqual(null);
          done();
        });
    });

    it('should return function passed as templateName', function(done) {
      var engine = new Lisplate();
      var fn = function() {
        return '';
      };
      engine
        .loadTemplate(fn)
        .then(function(out) {
          expect(out).toEqual(fn);
          done();
        })
        .catch(function(err) {
          done.fail('Should not call catch');
        });
    });

    it('should return from cache when possible', function(done) {
      var engine = new Lisplate();
      var fn = function() {};
      engine.cache['test'] = fn;
      engine
        .loadTemplate('test')
        .then(function(out) {
          expect(out).toEqual(fn);
          done();
        })
        .catch(function(err) {
          done.fail('Should not call catch');
        });
    });

    it('should fail with no sourceLoader and not cached', function(done) {
      var engine = new Lisplate();
      engine
        .loadTemplate('test')
        .then(function() {
          done.fail('Should not call then, expected error');
        })
        .catch(function(err) {
          expect(err).not.toEqual(null);
          done();
        });
    });

    it('should call sourceLoader when not cached', function() {
      var src = '{if}';
      var thenable = {
        then: jasmine
          .createSpy('thenable')
          .and.callFake(function(then) {
            then(src);
          })
      };
      var sourceLoader = jasmine
        .createSpy('sourceLoader')
        .and.returnValue(thenable);

      var engine = new Lisplate({
        sourceLoader: sourceLoader
      });
      spyOn(engine, 'compileFn');

      engine.loadTemplate('test');
      expect(sourceLoader).toHaveBeenCalledTimes(1);
      expect(sourceLoader).toHaveBeenCalledWith('test');
      expect(thenable.then).toHaveBeenCalledTimes(1);
      expect(engine.compileFn).toHaveBeenCalledTimes(1);
      expect(engine.compileFn).toHaveBeenCalledWith('test', src);
    });

    it('should allow callback support with returns', function(done) {
      var engine = new Lisplate();
      var fn = function() {};
      engine.loadTemplate(fn, function(err, out) {
        expect(err).toBeNull();
        expect(out).toEqual(fn);
        done();
      });
    });

    it('should allow callback support with errors', function(done) {
      var engine = new Lisplate();
      engine.loadTemplate('test', function(err) {
        expect(err).not.toBeNull();
        done();
      });
    });
  });

  describe('compileFn', function() {
    it('should compile source and turn to runnable function', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var renderable = function(){ return 'test'; };
      var renderableSource = renderable.toString();
      var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

      var engine = new Lisplate();
      spyOn(engine, 'compile').and.returnValue(renderableSource);
      spyOn(engine, 'loadCompiledSource').and.returnValue(factory);

      engine
        .compileFn(templateName, src)
        .then(function(fn) {
          expect(engine.compile).toHaveBeenCalledTimes(1);
          expect(engine.compile).toHaveBeenCalledWith(templateName, src);
          expect(engine.loadCompiledSource).toHaveBeenCalledTimes(1);
          expect(engine.loadCompiledSource).toHaveBeenCalledWith(renderableSource);
          expect(factory).toHaveBeenCalledTimes(1);
          expect(factory).toHaveBeenCalledWith(null);
          expect(fn.templateName).toEqual(templateName);
          expect(fn).toEqual(renderable);
          expect(engine.cache[templateName]).toEqual(renderable);
          done();
        })
        .catch(function(err) {
          done.fail('Should not catch with error');
        });
    });

    it('should initialize view model if viewModelLoader is defined', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var renderable = function(){ return 'test'; };
      var renderableSource = renderable.toString();
      var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

      function MockClass() {
      }

      var engine = new Lisplate({
        viewModelLoader: jasmine
          .createSpy('viewModelLoader')
          .and.returnValue(Promise.resolve(MockClass))
      });
      spyOn(engine, 'compile').and.returnValue(renderableSource);
      spyOn(engine, 'loadCompiledSource').and.returnValue(factory);

      engine
        .compileFn(templateName, src)
        .then(function(fn) {
          expect(engine.compile).toHaveBeenCalledTimes(1);
          expect(engine.compile).toHaveBeenCalledWith(templateName, src);
          expect(engine.loadCompiledSource).toHaveBeenCalledTimes(1);
          expect(engine.loadCompiledSource).toHaveBeenCalledWith(renderableSource);
          expect(factory).toHaveBeenCalledTimes(1);
          expect(factory).toHaveBeenCalledWith(MockClass);
          expect(fn.templateName).toEqual(templateName);
          expect(fn).toEqual(renderable);
          expect(engine.cache[templateName]).toEqual(renderable);
          done();
        })
        .catch(function(err) {
          done.fail('Should not catch with error');
        });
    });

    it('should reject with compiler errors', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var error = 'test error';

      var engine = new Lisplate();
      spyOn(engine, 'compile').and.throwError(error);

      engine
        .compileFn(templateName, src)
        .then(function(fn) {
          done.fail('Should have thrown error');
        })
        .catch(function(err) {
          expect(engine.compile).toHaveBeenCalledTimes(1);
          expect(err).not.toBeNull();
          done();
        });
    });

    it('should reject with load source errors', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var renderable = function(){ return 'test'; };
      var renderableSource = renderable.toString();
      var error = 'test error';

      var engine = new Lisplate();
      spyOn(engine, 'compile').and.returnValue(renderableSource);
      spyOn(engine, 'loadCompiledSource').and.throwError(error);

      engine
        .compileFn(templateName, src)
        .then(function(fn) {
          done.fail('Should have thrown error');
        })
        .catch(function(err) {
          expect(engine.compile).toHaveBeenCalledTimes(1);
          expect(engine.loadCompiledSource).toHaveBeenCalledTimes(1);
          expect(err).not.toBeNull();
          done();
        });
    });

    it('should allow callback support with returns', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var renderable = function(){ return 'test'; };
      var renderableSource = renderable.toString();
      var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

      var engine = new Lisplate();
      spyOn(engine, 'compile').and.returnValue(renderableSource);
      spyOn(engine, 'loadCompiledSource').and.returnValue(factory);

      engine.compileFn(templateName, src, function(err, fn) {
        expect(err).toBeNull();
        expect(engine.compile).toHaveBeenCalledTimes(1);
        expect(engine.compile).toHaveBeenCalledWith(templateName, src);
        expect(engine.loadCompiledSource).toHaveBeenCalledTimes(1);
        expect(engine.loadCompiledSource).toHaveBeenCalledWith(renderableSource);
        expect(factory).toHaveBeenCalledTimes(1);
        expect(factory).toHaveBeenCalledWith(null);
        expect(fn.templateName).toEqual(templateName);
        expect(fn).toEqual(renderable);
        expect(engine.cache[templateName]).toEqual(renderable);
        done();
      });
    });

    it('should allow callback support with errors', function(done) {
      var templateName = 'testName';
      var src = 'test';
      var renderable = function(){ return 'test'; };
      var renderableSource = renderable.toString();
      var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

      var error = 'test error';

      var engine = new Lisplate({
        viewModelLoader: jasmine
          .createSpy('viewModelLoader')
          .and.returnValue(Promise.reject(error))
      });
      spyOn(engine, 'compile').and.returnValue(renderableSource);
      spyOn(engine, 'loadCompiledSource').and.returnValue(factory);

      engine.compileFn(templateName, src, function(err) {
        expect(err).toEqual(error);
        expect(engine.cache[templateName]).not.toEqual(renderable);
        done();
      });
    });

  });

  describe('loadCompiledSource', function() {
    it('should convert source to fn', function() {
      var engine = new Lisplate();
      var fn = engine.loadCompiledSource('function(){return function(){};}');
      expect(typeof fn).toEqual('function');
    });
  });

  describe('render', function() {
    it('should work without stringsLoader defined', function() {
      var fakeData = {stuff: 'should show'};
      var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);

      var engine = new Lisplate();
      var out = engine.render(renderable, fakeData);
      expect(renderable).toHaveBeenCalledTimes(1);
      expect(renderable).toHaveBeenCalledWith(engine, fakeData, null, jasmine.any(Object));
      expect(out).toEqual(fakeData.stuff);
    });

    it('should call stringsLoader if defined', function(done) {
      var fakeData = {stuff: 'should show'};
      var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
      var fakeStrings = {str: 'a-string'};
      var engine = new Lisplate({
        stringsLoader: jasmine.createSpy('stringsLoader').and.returnValue(Promise.resolve(fakeStrings))
      });
      engine.render(renderable, fakeData).then(function(out) {
        expect(engine.stringsLoader).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledWith(engine, fakeData, fakeStrings, jasmine.any(Object));
        expect(out).toEqual(fakeData.stuff);
        done();
      }).catch(function(err) {
        done.fail('Should not catch with error');
      });
    });

    it('should allow callback support with return direct', function(done) {
      var renderable = jasmine.createSpy('renderable').and.returnValue('test');

      var engine = new Lisplate();
      engine.render(renderable, null, function(err, out) {
        expect(renderable).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledWith(engine, null, null, jasmine.any(Object));
        expect(out).toEqual('test');
        done();
      });
    });

    it('should allow callback support with return promise', function(done) {
      var renderable = jasmine.createSpy('renderable').and.returnValue(Promise.resolve('test'));

      var engine = new Lisplate();
      engine.render(renderable, null, function(err, out) {
        expect(renderable).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledWith(engine, null, null, jasmine.any(Object));
        expect(out).toEqual('test');
        done();
      });
    });

    it('should allow callback support with errors', function(done) {
      var renderable = jasmine.createSpy('renderable');

      var fakeErr = 'an error';
      var engine = new Lisplate({
        stringsLoader: function() { return Promise.reject(fakeErr); }
      });
      engine.render(renderable, null, function(err) {
        expect(err).toEqual(fakeErr);
        done();
      });
    });
  });

  describe('renderTemplate', function() {
    it('should call loadTemplate followed by render', function() {
      var renderable = function(){};
      var fakePromise = {};
      var fakeData = {stuff: 'should show'};
      var thenable = {
        then: jasmine
          .createSpy('thenable')
          .and.callFake(function(then) {
            then(renderable);
            return fakePromise;
          })
      };

      var engine = new Lisplate();
      spyOn(engine, 'loadTemplate')
        .and.returnValue(thenable);

      spyOn(engine, 'render');

      var ret = engine.renderTemplate('test', fakeData);

      expect(engine.loadTemplate).toHaveBeenCalledTimes(1);
      expect(engine.loadTemplate).toHaveBeenCalledWith('test');
      expect(engine.render).toHaveBeenCalledTimes(1);
      expect(engine.render).toHaveBeenCalledWith(renderable, fakeData);
      expect(ret).toEqual(fakePromise);
    });

    it('should allow callback support with returns', function(done) {
      var engine = new Lisplate({
        sourceLoader: function() { return Promise.resolve('should show'); }
      });
      engine.renderTemplate('test', null, function(err, out) {
        expect(err).toBeNull();
        expect(out).toEqual('should show');
        done();
      });
    });

    it('should allow callback support with errors', function(done) {
      var engine = new Lisplate();
      engine.renderTemplate('test', null, function(err) {
        expect(err).not.toBeNull();
        done();
      });
    });
  });

});
