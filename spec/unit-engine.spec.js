(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('../'));
  } else {
    factory(root.Lisplate);
  }
}(this, function(Lisplate) {
  describe('Lisplate unit tests', function() {

    beforeEach(function() {
      Lisplate.FactoryCache = {};
    });

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
        expect(engine.sourceLoader).not.toBeNull();
        expect(engine.viewModelLoader).not.toBeNull();
        expect(engine.stringsLoader).not.toBeNull();
      });

      it('should allow compiler options to be set', function(done) {
        var src = '{if}';
        var compiledSource = 'function(){ return function(){} }';
        var factory = function(){ return function(){} };
        var sourceLoader = jasmine
          .createSpy('sourceLoader')
          .and.returnValue(src);

        var compilerOptions = {
          keepWhitespace: true
        };

        var engine = new Lisplate({
          sourceLoader: sourceLoader,
          compilerOptions: compilerOptions
        });
        spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
        spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

        engine
          .loadTemplate('test')
          .then(function() {
            expect(sourceLoader).toHaveBeenCalledTimes(1);
            expect(sourceLoader).toHaveBeenCalledWith('test');
            expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
            expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, compilerOptions);
            expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
            expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
            done();
          })
          .catch(function(err) {
            done.fail('Should not catch with error');
          });
      });
    });

    describe('loadTemplate', function() {
      it('should fail if null templateInfo', function(done) {
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

      describe('string templateInfo - compiles', function() {
        it('should fail if empty-string templateInfo', function(done) {
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

        it('should return from cache when available', function(done) {
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
              expect(err).not.toBeNull();
              done();
            });
        });

        it('should fail with no sourceLoader and cache disabled', function(done) {
          var engine = new Lisplate({
            cacheEnabled: false
          });
          // even if something is in the caches, should be ignored
          engine.cache.test = function() {return 'test';};
          Lisplate.FactoryCache.test = function() {return function(){return 'test'};};

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

        it('should call sourceLoader when not cached', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });

          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(sourceLoader).toHaveBeenCalledTimes(1);
              expect(sourceLoader).toHaveBeenCalledWith('test');
              expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
              expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, undefined);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });
        it('should error if promise sourceLoader errors', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.reject('some error'));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

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

        it('should support sync sourceLoader', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(src);

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(sourceLoader).toHaveBeenCalledTimes(1);
              expect(sourceLoader).toHaveBeenCalledWith('test');
              expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
              expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, undefined);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error ' + err);
            });
        });

        it('should support callback sourceLoader', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = function(templateName, callback) {
            callback(null, src);
          };

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
              expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, undefined);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });
        it('should error if callback sourceLoader errors', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = function(templateName, callback) {
            callback('some error');
          };

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

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

        it('should have in cache when finished', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var fn = function(){};
          var factory = function(){ return fn; };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            cacheEnabled: true,
            sourceLoader: sourceLoader
          });

          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(engine.cache.test).toEqual(fn);
              expect(Lisplate.FactoryCache.test).toEqual(factory);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });

        it('should not set cache when explicitly disabled', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var fn = function(){};
          var factory = function(){ return fn; };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            cacheEnabled: false,
            sourceLoader: sourceLoader
          });

          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(engine.cache.test).not.toBeTruthy();
              expect(Lisplate.FactoryCache.test).not.toBeTruthy();
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });

        it('should use factory cache when cached and cache enabled', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var fn = function(){};
          var factory = function(){ return fn; };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          Lisplate.FactoryCache.test = factory;

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });

          engine
            .loadTemplate('test')
            .then(function(ret) {
              expect(sourceLoader).not.toHaveBeenCalled();
              expect(Lisplate.Compiler.compile).not.toHaveBeenCalled();
              expect(Lisplate.Utils.loadCompiledSource).not.toHaveBeenCalled();

              expect(ret).toEqual(fn);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });

        it('should not use factory cache when cached and cache disabled', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var fn = function(){};
          var factory = function(){ return fn; };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          Lisplate.FactoryCache.test = factory;

          var engine = new Lisplate({
            sourceLoader: sourceLoader,
            cacheEnabled: false
          });

          engine
            .loadTemplate('test')
            .then(function(ret) {
              expect(sourceLoader).toHaveBeenCalled();
              expect(Lisplate.Compiler.compile).toHaveBeenCalled();
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalled();

              expect(ret).toEqual(fn);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });

        it('should be able to use templateInfo.templateName with no .renderFactory', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate({templateName: 'test'})
            .then(function() {
              expect(sourceLoader).toHaveBeenCalledTimes(1);
              expect(sourceLoader).toHaveBeenCalledWith('test');
              expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
              expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, undefined);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });

        it('should reject with compiler errors', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.throwError('some error');
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate({templateName: 'test'})
            .then(function() {
              done.fail('Should not call then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });

        it('should reject with load source errors', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.throwError('some error');

          engine
            .loadTemplate({templateName: 'test'})
            .then(function() {
              done.fail('Should not call then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });
      });

      describe('object templateInfo - no compile', function() {
        it('should error if templateInfo.templateName is empty with no renderFactory', function(done) {
          var engine = new Lisplate();

          engine
            .loadTemplate({templateName: ''})
            .then(function() {
              done.fail('Should not call then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });
        it('should error if templateInfo.templateName is empty with renderFactory', function(done) {
          var factory = function(){ return function(){} };

          var engine = new Lisplate();

          engine
            .loadTemplate({templateName: '', renderFactory: factory})
            .then(function() {
              done.fail('Should not call then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });
        it('should use templateInfo.renderFactory', function(done) {
          var src = '{if}';
          var compiledSource = 'function(){ return function(){} }';
          var factory = function(){ return function(){} };
          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));

          var engine = new Lisplate({
            sourceLoader: sourceLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function() {
              expect(sourceLoader).not.toHaveBeenCalled();
              expect(Lisplate.Compiler.compile).not.toHaveBeenCalled();
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });
      });

      describe('common parts', function() {
        it('should initialize view model if viewModelLoader is defined', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);
          function MockClass() {
          }

          var engine = new Lisplate({
            viewModelLoader: jasmine
              .createSpy('viewModelLoader')
              .and.returnValue(Promise.resolve(MockClass))
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function(fn) {
              expect(factory).toHaveBeenCalledTimes(1);
              expect(factory).toHaveBeenCalledWith(engine, MockClass);
              expect(fn).toEqual(renderable);
              expect(engine.cache['test']).toEqual(renderable);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error ' + err);
            });
        });
        it('should error if promise viewModelLoader errors', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);
          function MockClass() {
          }

          var engine = new Lisplate({
            viewModelLoader: jasmine
              .createSpy('viewModelLoader')
              .and.returnValue(Promise.reject('some error'))
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function(fn) {
              done.fail('Should not have called then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });

        it('should support sync viewModelLoader', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);
          function MockClass() {
          }

          var engine = new Lisplate({
            viewModelLoader: jasmine
              .createSpy('viewModelLoader')
              .and.returnValue(MockClass)
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function(fn) {
              expect(factory).toHaveBeenCalledTimes(1);
              expect(factory).toHaveBeenCalledWith(engine, MockClass);
              expect(fn).toEqual(renderable);
              expect(engine.cache['test']).toEqual(renderable);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error ' + err);
            });
        });

        it('should support callback viewModelLoader', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);
          function MockClass() {
          }

          var engine = new Lisplate({
            viewModelLoader: function(templateName, callback) {
              callback(null, MockClass);
            }
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function(fn) {
              expect(factory).toHaveBeenCalledTimes(1);
              expect(factory).toHaveBeenCalledWith(engine, MockClass);
              expect(fn).toEqual(renderable);
              expect(engine.cache['test']).toEqual(renderable);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error ' + err);
            });
        });
        it('should error if callback viewModelLoader errors', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

          var engine = new Lisplate({
            viewModelLoader: function(templateName, callback) {
              callback('some error');
            }
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory})
            .then(function(fn) {
              done.fail('Should not have called then, expected error');
            })
            .catch(function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });

        it('should allow callback support with returns', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

          var engine = new Lisplate();

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory}, function(err, fn) {
              expect(err).toBeNull();
              expect(factory).toHaveBeenCalledTimes(1);
              expect(engine.cache['test']).toEqual(renderable);
              expect(fn).toEqual(renderable);
              done();
            });
        });

        it('should allow callback support with errors', function(done) {
          var renderable = function(){ return 'test'; };
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);

          var engine = new Lisplate({
            viewModelLoader: function(templateName, callback) {
              callback('some error');
            }
          });

          engine
            .loadTemplate({templateName: 'test', renderFactory: factory}, function(err) {
              expect(err).not.toBeNull();
              done();
            });
        });

        it('should perform full compile and load with string', function(done) {
          var src = '{if}';
          var renderable = function(){ return 'test'; };
          var compiledSource = renderable.toString();
          var factory = jasmine.createSpy('renderableFactory').and.returnValue(renderable);
          function MockClass() {
          }

          var sourceLoader = jasmine
            .createSpy('sourceLoader')
            .and.returnValue(Promise.resolve(src));
          var viewModelLoader = jasmine
            .createSpy('viewModelLoader')
            .and.returnValue(Promise.resolve(MockClass));

          var engine = new Lisplate({
            sourceLoader: sourceLoader,
            viewModelLoader: viewModelLoader
          });
          spyOn(Lisplate.Compiler, 'compile').and.returnValue(compiledSource);
          spyOn(Lisplate.Utils, 'loadCompiledSource').and.returnValue(factory);

          engine
            .loadTemplate('test')
            .then(function() {
              expect(sourceLoader).toHaveBeenCalledTimes(1);
              expect(sourceLoader).toHaveBeenCalledWith('test');
              expect(viewModelLoader).toHaveBeenCalledTimes(1);
              expect(viewModelLoader).toHaveBeenCalledWith('test');
              expect(Lisplate.Compiler.compile).toHaveBeenCalledTimes(1);
              expect(Lisplate.Compiler.compile).toHaveBeenCalledWith('test', src, undefined);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledTimes(1);
              expect(Lisplate.Utils.loadCompiledSource).toHaveBeenCalledWith(compiledSource);
              expect(factory).toHaveBeenCalledTimes(1);
              expect(factory).toHaveBeenCalledWith(engine, MockClass);
              done();
            })
            .catch(function(err) {
              done.fail('Should not catch with error');
            });
        });
      });
    });

    describe('loadCompiledSource', function() {
      it('should convert source to fn', function() {
        var engine = new Lisplate();
        var fn = Lisplate.Utils.loadCompiledSource('function(){return function(){};}');
        expect(typeof fn).toEqual('function');
      });
    });

    describe('render', function() {
      it('should work without stringsLoader defined', function() {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var renderContext = {};

        var engine = new Lisplate();
        var out = engine.render(renderable, fakeData, renderContext);
        expect(renderable).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledWith(fakeData, null, jasmine.any(Object), renderContext);
        expect(out).toEqual(fakeData.stuff);
      });

      it('should work without renderContext defined', function() {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);

        var engine = new Lisplate();
        var out = engine.render(renderable, fakeData);
        expect(renderable).toHaveBeenCalledTimes(1);
        expect(renderable).toHaveBeenCalledWith(fakeData, null, jasmine.any(Object), undefined);
        expect(out).toEqual(fakeData.stuff);
      });

      it('should call stringsLoader if defined', function(done) {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var fakeStrings = {str: 'a-string'};
        var engine = new Lisplate({
          stringsLoader: jasmine
            .createSpy('stringsLoader')
            .and.returnValue(Promise.resolve(fakeStrings))
        });
        engine
          .render(renderable, fakeData)
          .then(function(out) {
            expect(renderable).toHaveBeenCalledTimes(1);
            expect(renderable).toHaveBeenCalledWith(fakeData, fakeStrings, jasmine.any(Object), undefined);
            expect(out).toEqual(fakeData.stuff);
            done();
          })
          .catch(function(err) {
            done.fail('Should not catch with error');
          });
      });
      it('should error if promise stringsLoader errors', function(done) {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var fakeStrings = {str: 'a-string'};
        var engine = new Lisplate({
          stringsLoader: jasmine
            .createSpy('stringsLoader')
            .and.returnValue(Promise.reject('some error'))
        });
        engine
          .render(renderable, fakeData)
          .then(function(out) {
            done.fail('Should not have called then, expected error');
          })
          .catch(function(err) {
            expect(err).not.toBeNull();
            done();
          });
      });

      it('should support sync stringsLoader', function(done) {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var fakeStrings = {str: 'a-string'};
        var engine = new Lisplate({
          stringsLoader: jasmine
            .createSpy('stringsLoader')
            .and.returnValue(fakeStrings)
        });
        engine
          .render(renderable, fakeData)
          .then(function(out) {
            expect(renderable).toHaveBeenCalledTimes(1);
            expect(renderable).toHaveBeenCalledWith(fakeData, fakeStrings, jasmine.any(Object), undefined);
            expect(out).toEqual(fakeData.stuff);
            done();
          })
          .catch(function(err) {
            done.fail('Should not catch with error');
          });
      });

      it('should support callback stringsLoader', function(done) {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var fakeStrings = {str: 'a-string'};
        var engine = new Lisplate({
          stringsLoader: function(templateName, renderContext, callback) {
            callback(null, fakeStrings);
          }
        });
        engine
          .render(renderable, fakeData)
          .then(function(out) {
            expect(renderable).toHaveBeenCalledTimes(1);
            expect(renderable).toHaveBeenCalledWith(fakeData, fakeStrings, jasmine.any(Object), undefined);
            expect(out).toEqual(fakeData.stuff);
            done();
          })
          .catch(function(err) {
            done.fail('Should not catch with error');
          });
      });
      it('should error if callback stringsLoader errors', function(done) {
        var fakeData = {stuff: 'should show'};
        var renderable = jasmine.createSpy('renderable').and.returnValue(fakeData.stuff);
        var fakeStrings = {str: 'a-string'};
        var engine = new Lisplate({
          stringsLoader: function(templateName, renderContext, callback) {
            callback('some error');
          }
        });
        engine
          .render(renderable, fakeData)
          .then(function(out) {
            done.fail('Should not have called then, expected error');
          })
          .catch(function(err) {
            expect(err).not.toBeNull();
            done();
          });
      });

      it('should allow callback support with renderContext with return direct', function(done) {
        var renderable = jasmine.createSpy('renderable').and.returnValue('test');
        var renderContext = {};

        var engine = new Lisplate();
        engine.render(renderable, null, renderContext, function(err, out) {
          expect(renderable).toHaveBeenCalledTimes(1);
          expect(renderable).toHaveBeenCalledWith(null, null, jasmine.any(Object), renderContext);
          expect(out).toEqual('test');
          done();
        });
      });
      it('should allow callback support without renderContext with return direct', function(done) {
        var renderable = jasmine.createSpy('renderable').and.returnValue('test');

        var engine = new Lisplate();
        engine.render(renderable, null, function(err, out) {
          expect(renderable).toHaveBeenCalledTimes(1);
          expect(renderable).toHaveBeenCalledWith(null, null, jasmine.any(Object), undefined);
          expect(out).toEqual('test');
          done();
        });
      });
      it('should allow callback support with only renderable', function(done) {
        var renderable = jasmine.createSpy('renderable').and.returnValue('test');

        var engine = new Lisplate();
        engine.render(renderable, function(err, out) {
          expect(renderable).toHaveBeenCalledTimes(1);
          expect(renderable).toHaveBeenCalledWith(undefined, null, jasmine.any(Object), undefined);
          expect(out).toEqual('test');
          done();
        });
      });

      it('should allow callback support with renderContext with return promise', function(done) {
        var renderable = jasmine.createSpy('renderable').and.returnValue(Promise.resolve('test'));
        var renderContext = {};

        var engine = new Lisplate();
        engine.render(renderable, null, renderContext, function(err, out) {
          expect(renderable).toHaveBeenCalledTimes(1);
          expect(renderable).toHaveBeenCalledWith(null, null, jasmine.any(Object), renderContext);
          expect(out).toEqual('test');
          done();
        });
      });
      it('should allow callback support without renderContext with return promise', function(done) {
        var renderable = jasmine.createSpy('renderable').and.returnValue(Promise.resolve('test'));

        var engine = new Lisplate();
        engine.render(renderable, null, function(err, out) {
          expect(renderable).toHaveBeenCalledTimes(1);
          expect(renderable).toHaveBeenCalledWith(null, null, jasmine.any(Object), undefined);
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
        var renderContext = {};
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

        var ret = engine.renderTemplate('test', fakeData, renderContext);

        expect(engine.loadTemplate).toHaveBeenCalledTimes(1);
        expect(engine.loadTemplate).toHaveBeenCalledWith('test');
        expect(engine.render).toHaveBeenCalledTimes(1);
        expect(engine.render).toHaveBeenCalledWith(renderable, fakeData, renderContext);
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

}));
