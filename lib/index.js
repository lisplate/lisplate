(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.core', ['lisplate.compiler', 'lisplate.runtime', 'lisplate.utils'], factory);
  } else if (typeof exports === 'object') {
    // in Node, require this file if we want to use the compiler as a standalone module
    module.exports = factory(require('./compiler'), require('./runtime'), require('./util'));
  } else {
    // in the browser, store the factory output if we want to use the compiler directly
    root.Lisplate = factory(root.lisplateCompiler, root.lisplateRuntime, root.lisplateUtils);
  }
}(this, function(compiler, runtime, utils) {
  'use strict';

  var _thenable = utils.thenable;

  function _callbackify(fn) {
    var expectedArgs = fn.length;

    return function() {
      var totalArgs = arguments.length;
      var callback = totalArgs > expectedArgs ? arguments[totalArgs - 1] : null;
      var args = null;
      if (typeof callback === 'function') {
        args = Array.prototype.slice.call(arguments, 0, totalArgs - 1);
      } else {
        args = Array.prototype.slice.call(arguments, 0, totalArgs);
        callback = null;
      }

      var output = fn.apply(this, args);

      if (_thenable(output)) {
        if (!callback) {
          return output;
        }

        output.then(function(str) {
          callback(null, str);
        }).catch(function(err) {
          callback(err);
        });
      } else {
        if (callback) {
          callback(null, output);
          return undefined;
        }
        return output;
      }

      return undefined;
    };
  }

  function _promisifyPossibleAsync(fn) {
    if (!fn) {
      return fn;
    }

    var fnArgCount = fn.length;
    return function() {
      var args = Array.prototype.slice.apply(arguments);
      var argsLength = args.length;

      if (fnArgCount === argsLength + 1) {
        // if callback, promisify
        return new Promise(function(resolve, reject) {
          args.push(function(err, out) {
            if (err) {
              reject(err);
              return;
            }

            resolve(out);
          });

          fn.apply(null, args);
        });
      } else {
        // could be promise or sync
        return Promise.resolve(fn.apply(null, args));
      }
    };
  }

  function Lisplate(options) {
    if (!options) {
      options = {};
    }

    // cacheEnabled must be explicitly set to false to disable
    this.cacheEnabled = !(options.cacheEnabled === false);

    this.sourceLoader = _promisifyPossibleAsync(options.sourceLoader);
    this.viewModelLoader = _promisifyPossibleAsync(options.viewModelLoader);
    this.stringsLoader = _promisifyPossibleAsync(options.stringsLoader);

    this.helpers = {};
    this.cache = {};
  }

  Lisplate.prototype.addHelper = function addHelper(helperName, fn) {
    this.helpers[helperName] = fn;
  };

  Lisplate.prototype.loadTemplate = _callbackify(function loadTemplate(templateInfo) {
    var _self = this;

    if (!templateInfo) {
      return Promise.reject(new Error('Must specify template information to load'));
    }

    var templateName = typeof templateInfo === 'string' ? templateInfo : templateInfo.templateName;
    var renderFactory = templateInfo.render;

    if (templateName === '') {
      return Promise.reject(new Error('Must specify a valid template name to load'));
    }

    if (renderFactory) {
      renderFactory = Promise.resolve(renderFactory);
    } else {
      if (_self.cache[templateName]) {
        return Promise.resolve(_self.cache[templateName]);
      }

      if (!_self.sourceLoader) {
        return Promise.reject(new Error('Must define a sourceLoader'));
      }

      renderFactory = _self
        .sourceLoader(templateName)
        .then(function(src) {
          var compiled = null;
          var factory = null;

          try {
            compiled = _self.compile(templateName, src);
            factory = _self.loadCompiledSource(compiled);
          } catch (e) {
            return Promise.reject(e);
          }

          return Promise.resolve(factory);
        });
    }

    return renderFactory.then(function(factory) {
      var promise = null;
      if (_self.viewModelLoader) {
        promise = _self.viewModelLoader(templateName);
      } else {
        promise = Promise.resolve(null);
      }

      return promise.then(function(viewModelClass) {
        var fn = factory(_self, viewModelClass);
        fn.templateName = templateName;
        _self.cache[templateName] = fn;
        return fn;
      });
    });
  });

  Lisplate.prototype.compile = compiler.compile;
  Lisplate.prototype.compileModule = compiler.compileModule;

  Lisplate.prototype.loadCompiledSource = function loadCompiledSource(compiledSource) {
    var template = null;
    eval('template=' + compiledSource);
    return template;
  };

  Lisplate.prototype.render = _callbackify(function render(template, data) {
    var _self = this;
    if (_self.stringsLoader) {
      return _self
        .stringsLoader(template.templateName)
        .then(function(strings) {
          return template(data, strings, runtime);
        });
    } else {
      // done this way for non-async optimization
      return template(data, null, runtime);
    }
  });

  Lisplate.prototype.renderTemplate = _callbackify(function renderTemplate(templateName, data) {
    var _self = this;

    return _self.loadTemplate(templateName).then(function(template) {
      return _self.render(template, data);
    });
  });

  return Lisplate;
}));
