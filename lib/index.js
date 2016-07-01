var compiler = require('./compiler');
var Bluebird = require('bluebird');

var runtime = require('./runtime');

function _callbackify(fn) {
  var expectedArgs = fn.length;

  return function() {
    var totalArgs = arguments.length;
    var callback = totalArgs > expectedArgs ? arguments[totalArgs-1] : null;
    var args = null;
    if (callback instanceof Function) {
      args = Array.prototype.slice.call(arguments, 0, totalArgs-1);
    } else {
      args = Array.prototype.slice.call(arguments, 0, totalArgs);
      callback = null;
    }

    var output = fn.apply(this, args);

    if (output && output.then instanceof Function) {
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
        return;
      }
      return output;
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

  this.helpers = {};
  this.cache = {};
}

Lisplate.prototype.addHelper = function addHelper(name, fn) {
  this.helpers[name] = fn;
};

Lisplate.prototype.loadTemplate = _callbackify(function loadTemplate(templateName) {
  var _self = this;

  if (!templateName || !templateName.length) {
      return Bluebird.reject(new Error('Must specify a template to load'));
  }

  if (templateName instanceof Function) {
    return Bluebird.resolve(templateName);
  }

  if (_self.cache[templateName]) {
    return Bluebird.resolve(_self.cache[templateName]);
  }

  if (!_self.sourceLoader) {
    return Bluebird.reject(new Error('Must define a sourceLoader'));
  }

  return _self.sourceLoader(templateName).then(function(src) {
    return _self.compileFn(templateName, src);
  });
});

Lisplate.prototype.compileFn = _callbackify(function compileFn(templateName, src) {
  var _self = this;

  var compiled = _self.compile(src);

  var factory = _self.loadCompiledSource(compiled);

  var promise = null;
  if (_self.viewModelLoader) {
    promise = _self.viewModelLoader(templateName);
  } else {
    promise = Bluebird.resolve(null);
  }
  return promise.then(function(viewModelClass) {
    var fn = factory(viewModelClass);
    _self.cache[templateName] = fn;
    return fn;
  });
});

Lisplate.prototype.compile = compiler;

Lisplate.prototype.loadCompiledSource = function loadCompiledSource(compiledSource) {
  var template = null;
  eval('template=' + compiledSource);
  return template;
};

Lisplate.prototype.render = _callbackify(function render(template, data) {
  return template(this, data, runtime);
});

Lisplate.prototype.renderTemplate = _callbackify(function renderTemplate(templateName, data) {
  var _self = this;

  return _self.loadTemplate(templateName).then(function(template) {
    return _self.render(template, data);
  });
});

module.exports = Lisplate;
