(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.core', ['lisplate.runtime', 'lisplate.utils'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./runtime'), require('./util'));
  } else {
    root.Lisplate = factory(root.Lisplate.Runtime, root.Lisplate.Utils);
  }
}(this, function(runtime, utils) {
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

    this.sourceLoader = options.sourceLoader;
    this.viewModelLoader = options.viewModelLoader;
    this.stringsLoader = options.stringsLoader;

    this.helpers = {};
    this.cache = {};
  }
  Lisplate.Runtime = runtime;
  Lisplate.Utils = utils;
  Lisplate.FactoryCache = {};

  Lisplate.prototype.addHelper = function addHelper(helperName, fn) {
    this.helpers[helperName] = fn;
  };

  Lisplate.prototype.loadTemplate = _callbackify(function loadTemplate(templateInfo) {
    var _self = this;

    if (!templateInfo) {
      return Promise.reject(new Error('Must specify template information to load'));
    }

    var templateName = typeof templateInfo === 'string' ? templateInfo : templateInfo.templateName;
    var renderFactory = templateInfo.renderFactory;

    if (templateName === '') {
      return Promise.reject(new Error('Must specify a valid template name to load'));
    }

    if (renderFactory) {
      renderFactory = Promise.resolve(renderFactory);
    } else if (_self.cacheEnabled && _self.cache[templateName]) {
      return Promise.resolve(_self.cache[templateName]);
    } else if (_self.cacheEnabled && Lisplate.FactoryCache[templateName]) {
      renderFactory = Promise.resolve(Lisplate.FactoryCache[templateName]);
    } else {
      if (!_self.sourceLoader) {
        return Promise.reject(new Error('Must define a sourceLoader'));
      }

      if (!Lisplate.Compiler || !Lisplate.Compiler.compile) {
        return Promise.reject('Compiler is not loaded to compile loaded source');
      }

      renderFactory = _promisifyPossibleAsync(_self
        .sourceLoader)(templateName)
        .then(function(src) {
          var compiled = null;
          var factory = null;

          try {
            compiled = Lisplate.Compiler.compile(templateName, src);
            factory = Lisplate.Utils.loadCompiledSource(compiled);
          } catch (e) {
            return Promise.reject(e);
          }

          return Promise.resolve(factory);
        });
    }

    return renderFactory.then(function(factory) {
      if (_self.cacheEnabled) {
        Lisplate.FactoryCache[templateName] = factory;
      }

      var promise = null;
      if (_self.viewModelLoader) {
        promise = _promisifyPossibleAsync(_self.viewModelLoader)(templateName);
      } else {
        promise = Promise.resolve(null);
      }

      return promise.then(function(viewModelClass) {
        var fn = factory(_self, viewModelClass);
        fn.templateName = templateName;

        if (_self.cacheEnabled) {
          _self.cache[templateName] = fn;
        }
        return fn;
      });
    });
  });

  Lisplate.prototype.render = _callbackify(function render(template, data) {
    var _self = this;
    if (_self.stringsLoader) {
      return _promisifyPossibleAsync(_self
        .stringsLoader)(template.templateName)
        .then(function(strings) {
          return template(data, strings, Lisplate.Runtime);
        });
    } else {
      // done this way for non-async optimization
      return template(data, null, Lisplate.Runtime);
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
