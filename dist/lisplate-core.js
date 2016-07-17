/*! lisplate - v0.5.3
* https://github.com/lisplate/lisplate
* Copyright (c) 2016 ; Released under the MIT License */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.utils', [], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Lisplate = {};
    root.Lisplate.Utils = factory();
  }
}(this, function() {
  'use strict';

  return {
    loadCompiledSource: function loadCompiledSource(compiledSource) {
      var template = null;
      eval('template=' + compiledSource);
      return template;
    },

    resolve: function resolve(item) {
      if (typeof item === 'function') {
        return item();
      } else {
        return item;
      }
    },

    thenable: function thenable(item) {
      return (typeof item === 'object' || typeof item === 'function') && typeof item.then === 'function';
    }
  };
}));

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.runtime', ['lisplate.utils'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./util'));
  } else {
    root.Lisplate.Runtime = factory(root.Lisplate.Utils);
  }
}(this, function(utils) {
  'use strict';

  var _resolve = utils.resolve;
  var _thenable = utils.thenable;

  var htmlTest = /[&<>\"\']/;
  var htmlReplace = /[&<>\"\']/g;
  var htmlReplacements = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;'
  };

  var jsTest = /[\\\/\r\n\f\t'"\u2028\u2029]/;
  var jsReplace = /[\\\/\r\n\f\t'"\u2028\u2029]/g;
  var jsReplacements = {
    '\\': '\\\\',
    '/': '\\/',
    '\r': '\\r',
    '\n': '\\n',
    '\f': '\\f',
    '\t': '\\t',
    '\'': '\\\'',
    '"': '\\"',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  };

  var jsonTest = /["<\u2028\u2029]/;
  var jsonReplace = /["<\u2028\u2029]/g;
  var jsonReplacements = {
    '"': '\\"',
    '<': '\\u003c',
    '\u2028': '\\u2029',
    '\u2029': '\\u2029'
  };

  function replaceHtmlChar(match) {
    return htmlReplacements[match];
  }
  function replaceJsChar(match) {
    return jsReplacements[match];
  }
  function replaceJsonChar(match) {
    return jsonReplacements[match];
  }

  var Runtime = {
    escapeHtml: function escapeHtml(str) {
      if (typeof str !== 'string') {
        return str;
      }
      if (!htmlTest.test(str)) {
        return str;
      }
      return str.replace(htmlReplace, replaceHtmlChar);
    },

    escapeJs: function escapeJs(str) {
      if (typeof str !== 'string') {
        return str;
      }
      if (!jsTest.test(str)) {
        return str;
      }
      return str.replace(jsReplace, replaceJsChar);
    },

    escapeJson: function escapeJson(str) {
      if (typeof str !== 'string') {
        return str;
      }
      if (!jsonTest.test(str)) {
        return str;
      }
      return str.replace(jsonReplace, replaceJsonChar);
    },

    get: function(obj, key) {
      if (!key) {
        return obj;
      }

      return obj[key];
    },

    not: function(l) {
      return !(l);
    },

    eq: function(l, r) {
      return (l) === (r);
    },

    neq: function(l, r) {
      return (l) !== (r);
    },

    lt: function(l, r) {
      return (l) < (r);
    },

    gt: function(l, r) {
      return (l) > (r);
    },

    lte: function(l, r) {
      return (l) <= (r);
    },

    gte: function(l, r) {
      return (l) >= (r);
    },

    cmpand: function(l, r) {
      return (l) && (r);
    },

    cmpor: function(l, r) {
      return (l) || (r);
    },

    add: function(l, r) {
      return (l) + (r);
    },

    sub: function(l, r) {
      return (l) - (r);
    },

    mul: function(l, r) {
      return (l) * (r);
    },

    div: function(l, r) {
      return (l) / (r);
    },

    mod: function(l, r) {
      return (l) % (r);
    },

    safe: function(value) {
      // since chunks are safe/unescaped, we can just wrap it in a chunk
      var chunk = new Chunk();
      chunk.w(value);
      return chunk;
    },

    each: function(arr, then, elsethen) {
      var value = (arr);
      if (_thenable(value)) {
        return value.then(function(a) {
          return Runtime.each(a, then, elsethen);
        });
      }

      var totalLen = 0;
      if (value && (totalLen = value.length)) {
        if (then) {
          var chunk = new Chunk();
          var i = 0;
          for (; i < totalLen; i++) {
            if (typeof then === 'function') {
              chunk.w(then(value[i], i));
            } else {
              chunk.w(then);
            }
          }
          return chunk.getOutput();
        }
      } else {
        if (elsethen) {
          return _resolve(elsethen);
        }
      }
      return '';
    },

    if: function(cond, then, elsethen) {
      var value = (cond);
      if (_thenable(value)) {
        return value.then(function(c) {
          return Runtime.if(c, then, elsethen);
        });
      }

      if (value) {
        if (then) {
          return _resolve(then);
        }
      } else {
        if (elsethen) {
          return _resolve(elsethen);
        }
      }
      return '';
    },

    // using the same rules that DustJS uses here
    isEmpty: function(item) {
      var value = (item);

      if (value === 0) {
        return false;
      }
      if (Array.isArray(value) && !value.length) {
        return true;
      }
      return !value;
    },

    isNotEmpty: function(item) {
      return !Runtime.isEmpty(item);
    }
  };

  function Chunk() {
    this.current = '';
    this.stack = [];
    this.lastFlushedIndex = 0;
    this.thenables = [];
    this.isAsync = false;
    this.lastWasAsync = false;
  }
  Chunk.prototype.w = function w(item) {
    var towrite = (item);

    // don't do anything when it's null or undefined
    if (towrite == null) {
      return;
    }

    if (towrite instanceof Chunk) {
      towrite = towrite.getOutput();
    }

    if (_thenable(towrite)) {
      if (this.current.length) {
        this.stack.push(this.current);
        this.current = '';
      }

      this.isAsync = true;
      this.lastWasAsync = true;
      var slotIndex = this.stack.length;
      this.stack.push('');

      var _self = this;
      var promise = towrite.then(function(output) {
        _self.stack[slotIndex] = output;
      });
      this.thenables.push(promise);
      // TODO: flush out the current progress
    } else {
      if (this.lastWasAsync) {
        this.current = towrite;
      } else {
        this.current += towrite;
      }
      this.lastWasAsync = false;
    }
  };
  Chunk.prototype.getOutput = function() {
    var _self = this;

    if (_self.isAsync) {
      if (_self.current.length) {
        _self.stack.push(_self.current);
      }

      return Promise
        .all(_self.thenables)
        .then(function() {
          return _self.stack.join('');
        });
    } else {
      return _self.current;
    }
  };

  Runtime.Chunk = Chunk;

  return Runtime;
}));

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
    return function() {
      var totalArgs = arguments.length;
      var callback = totalArgs ? arguments[totalArgs - 1] : null;
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

  Lisplate.prototype.render = _callbackify(function render(template, data, renderContext) {
    var _self = this;
    if (_self.stringsLoader) {
      return _promisifyPossibleAsync(_self
        .stringsLoader)(template.templateName, renderContext)
        .then(function(strings) {
          return template(data, strings, Lisplate.Runtime, renderContext);
        });
    } else {
      // done this way for non-async optimization
      return template(data, null, Lisplate.Runtime, renderContext);
    }
  });

  Lisplate.prototype.renderTemplate = _callbackify(function renderTemplate(templateName, data, renderContext) {
    var _self = this;

    return _self.loadTemplate(templateName).then(function(template) {
      return _self.render(template, data, renderContext);
    });
  });

  return Lisplate;
}));
