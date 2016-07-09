/*! lisplate - v0.4.1
* https://github.com/HallM/lisplate
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

    not: function(l) {
      return !_resolve(l);
    },

    eq: function(l, r) {
      return _resolve(l) === _resolve(r);
    },

    neq: function(l, r) {
      return _resolve(l) !== _resolve(r);
    },

    lt: function(l, r) {
      return _resolve(l) < _resolve(r);
    },

    gt: function(l, r) {
      return _resolve(l) > _resolve(r);
    },

    lte: function(l, r) {
      return _resolve(l) <= _resolve(r);
    },

    gte: function(l, r) {
      return _resolve(l) >= _resolve(r);
    },

    cmpand: function(l, r) {
      return _resolve(l) && _resolve(r);
    },

    cmpor: function(l, r) {
      return _resolve(l) || _resolve(r);
    },

    add: function(l, r) {
      return _resolve(l) + _resolve(r);
    },

    sub: function(l, r) {
      return _resolve(l) - _resolve(r);
    },

    mul: function(l, r) {
      return _resolve(l) * _resolve(r);
    },

    div: function(l, r) {
      return _resolve(l) / _resolve(r);
    },

    mod: function(l, r) {
      return _resolve(l) % _resolve(r);
    },

    safe: function(value) {
      // since chunks are safe/unescaped, we can just wrap it in a chunk
      var chunk = new Chunk();
      chunk.w(value);
      return chunk;
    },

    each: function(arr, then, elsethen) {
      var value = _resolve(arr);
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
      var value = _resolve(cond);
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
      var value = _resolve(item);

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
    var towrite = _resolve(item);

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
    } else {
      if (_self.cache[templateName]) {
        return Promise.resolve(_self.cache[templateName]);
      }

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
      var promise = null;
      if (_self.viewModelLoader) {
        promise = _promisifyPossibleAsync(_self.viewModelLoader)(templateName);
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

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.parser', ['lisplate.core'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./'));
  } else {
    factory(root.Lisplate);
  }
}(this, function(Lisplate) {
  var parser = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = function(t) { return t; },
        peg$c1 = function(s) { return ['block', s]; },
        peg$c2 = "\n",
        peg$c3 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c4 = "\r\n",
        peg$c5 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },
        peg$c6 = "\r",
        peg$c7 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c8 = "\u2028",
        peg$c9 = { type: "literal", value: "\u2028", description: "\"\\u2028\"" },
        peg$c10 = "\u2029",
        peg$c11 = { type: "literal", value: "\u2029", description: "\"\\u2029\"" },
        peg$c12 = /^[\t\x0B\f \xA0\uFEFF]/,
        peg$c13 = { type: "class", value: "[\\t\\v\\f \\u00A0\\uFEFF]", description: "[\\t\\v\\f \\u00A0\\uFEFF]" },
        peg$c14 = "{",
        peg$c15 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c16 = "}",
        peg$c17 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c18 = "(",
        peg$c19 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c20 = ")",
        peg$c21 = { type: "literal", value: ")", description: "\")\"" },
        peg$c22 = "\"",
        peg$c23 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c24 = { type: "any", description: "any character" },
        peg$c25 = function(c) {return c},
        peg$c26 = function(s) { return '"' + s.join('') + '"'; },
        peg$c27 = function(n) { return n; },
        peg$c28 = ".",
        peg$c29 = { type: "literal", value: ".", description: "\".\"" },
        peg$c30 = function(l, r) { return parseFloat(l + "." + r); },
        peg$c31 = /^[0-9]/,
        peg$c32 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c33 = function(digits) { return makeInteger(digits); },
        peg$c34 = "-",
        peg$c35 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c36 = function(n) { return n * -1; },
        peg$c37 = "true",
        peg$c38 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c39 = function() { return true; },
        peg$c40 = "false",
        peg$c41 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c42 = function() { return false; },
        peg$c43 = function(l) { return ['literal', [l]]; },
        peg$c44 = /^[a-zA-Z$_]/,
        peg$c45 = { type: "class", value: "[a-zA-Z$_]", description: "[a-zA-Z$_]" },
        peg$c46 = /^[a-zA-Z0-9$_]/,
        peg$c47 = { type: "class", value: "[a-zA-Z0-9$_]", description: "[a-zA-Z0-9$_]" },
        peg$c48 = function(s, c) { return s + c.join(''); },
        peg$c49 = function(f, p) { return p; },
        peg$c50 = function(f, r) { return r ? [f].concat(r).join('.') : f; },
        peg$c51 = /^[a-zA-Z]/,
        peg$c52 = { type: "class", value: "[a-zA-Z]", description: "[a-zA-Z]" },
        peg$c53 = /^[a-zA-Z0-9_]/,
        peg$c54 = { type: "class", value: "[a-zA-Z0-9_]", description: "[a-zA-Z0-9_]" },
        peg$c55 = "::",
        peg$c56 = { type: "literal", value: "::", description: "\"::\"" },
        peg$c57 = function(c) { return ['identifier', [c, null]]; },
        peg$c58 = function(c, i) { return ['identifier', [c, i]]; },
        peg$c59 = function(i) { return ['identifier', ['', i]]; },
        peg$c60 = function(k) { return k; },
        peg$c61 = function(p) { return p; },
        peg$c62 = function(e) { return e; },
        peg$c63 = function(e, w) { return ["format", ['\\n' + w.join('')]]; },
        peg$c64 = function(b) { return ["buffer", [b.join('')]]; },
        peg$c65 = "rb",
        peg$c66 = { type: "literal", value: "rb", description: "\"rb\"" },
        peg$c67 = "lb",
        peg$c68 = { type: "literal", value: "lb", description: "\"lb\"" },
        peg$c69 = "s",
        peg$c70 = { type: "literal", value: "s", description: "\"s\"" },
        peg$c71 = "n",
        peg$c72 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c73 = "r",
        peg$c74 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c75 = "~",
        peg$c76 = { type: "literal", value: "~", description: "\"~\"" },
        peg$c77 = function(k) { return ['escape', [k]]; },
        peg$c78 = "*",
        peg$c79 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c80 = "`",
        peg$c81 = { type: "literal", value: "`", description: "\"`\"" },
        peg$c82 = function(r) { return withPosition(['raw', [r.join('')]]); },
        peg$c83 = "fn",
        peg$c84 = { type: "literal", value: "fn", description: "\"fn\"" },
        peg$c85 = function(l) { return l; },
        peg$c86 = function(p, b) { return withPosition(['fn', [p, b]]); },
        peg$c87 = function(c, p) { return withPosition(['call', [c, p]]); },
        peg$c88 = ":",
        peg$c89 = { type: "literal", value: ":", description: "\":\"" },
        peg$c90 = function(k, v) { return [k, v]; },
        peg$c91 = function() { return ['map', []]; },
        peg$c92 = function(a) { return ['map', [a]]; },
        peg$c93 = function() { return ['array', []]; },
        peg$c94 = function(a) { return ['array', [a]]; },
        peg$c95 = function() { return ['empty', []]; },
        peg$c96 = "==",
        peg$c97 = { type: "literal", value: "==", description: "\"==\"" },
        peg$c98 = function() {return 'eq'; },
        peg$c99 = "!=",
        peg$c100 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c101 = function() {return 'neq'; },
        peg$c102 = "<=",
        peg$c103 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c104 = function() {return 'lte'; },
        peg$c105 = ">=",
        peg$c106 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c107 = function() {return 'gte'; },
        peg$c108 = "<",
        peg$c109 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c110 = function() {return 'lt'; },
        peg$c111 = ">",
        peg$c112 = { type: "literal", value: ">", description: "\">\"" },
        peg$c113 = function() {return 'gt'; },
        peg$c114 = "and",
        peg$c115 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c116 = function() {return 'cmpand'; },
        peg$c117 = "or",
        peg$c118 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c119 = function() {return 'cmpor'; },
        peg$c120 = "not",
        peg$c121 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c122 = function() {return 'not';},
        peg$c123 = function(c) { return ['identifier', [null, c]]; },
        peg$c124 = "+",
        peg$c125 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c126 = function() {return 'add'; },
        peg$c127 = function() {return 'sub'; },
        peg$c128 = function() {return 'mul'; },
        peg$c129 = "/",
        peg$c130 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c131 = function() {return 'div'; },
        peg$c132 = "%",
        peg$c133 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c134 = function() {return 'mod'; },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseblock();

      return s0;
    }

    function peg$parseblock() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = [];
      s4 = peg$parseComment();
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = peg$parseComment();
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parseTag();
        if (s4 === peg$FAILED) {
          s4 = peg$parsebuffer();
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s2;
          s3 = peg$c0(s4);
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$currPos;
        s3 = [];
        s4 = peg$parseComment();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseComment();
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseTag();
          if (s4 === peg$FAILED) {
            s4 = peg$parsebuffer();
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s2;
            s3 = peg$c0(s4);
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseComment();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseComment();
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c1(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseeol() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 10) {
        s0 = peg$c2;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c4) {
          s0 = peg$c4;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c6;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c7); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 8232) {
              s0 = peg$c8;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 8233) {
                s0 = peg$c10;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsews() {
      var s0;

      if (peg$c12.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c13); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseeol();
      }

      return s0;
    }

    function peg$parseopentag() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 123) {
        s0 = peg$c14;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }

      return s0;
    }

    function peg$parseclosetag() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 125) {
        s0 = peg$c16;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }

      return s0;
    }

    function peg$parseopenarray() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 40) {
        s0 = peg$c18;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }

      return s0;
    }

    function peg$parseclosearray() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 41) {
        s0 = peg$c20;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }

      return s0;
    }

    function peg$parsestring() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c22;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 34) {
          s5 = peg$c22;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c23); }
        }
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseeol();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c25(s6);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 34) {
            s5 = peg$c22;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseeol();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c25(s6);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c22;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c26(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsefloat();
      if (s1 === peg$FAILED) {
        s1 = peg$parseinteger();
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c27(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsefloat() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseinteger();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s2 = peg$c28;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseunsigned_integer();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c30(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseunsigned_integer() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c31.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c31.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c33(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsesigned_integer() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c34;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseunsigned_integer();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c36(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseinteger() {
      var s0;

      s0 = peg$parsesigned_integer();
      if (s0 === peg$FAILED) {
        s0 = peg$parseunsigned_integer();
      }

      return s0;
    }

    function peg$parseboolean() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c37) {
        s1 = peg$c37;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c39();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c40) {
          s1 = peg$c40;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c41); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c42();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseliteral() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsestring();
      if (s1 === peg$FAILED) {
        s1 = peg$parsenumber();
        if (s1 === peg$FAILED) {
          s1 = peg$parseboolean();
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c43(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsekeypart() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c44.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c46.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c47); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c46.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c48(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsekey() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsekeypart();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s4 = peg$c28;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsekeypart();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c49(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s4 = peg$c28;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsekeypart();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c49(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c50(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsectx() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c51.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c53.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c54); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c53.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c54); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c48(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsescopeoperator() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c55) {
        s0 = peg$c55;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c56); }
      }

      return s0;
    }

    function peg$parseidentifier() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsectx();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsescopeoperator();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c28;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c29); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c57(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsectx();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsescopeoperator();
          if (s2 !== peg$FAILED) {
            s3 = peg$parsekey();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c58(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsekey();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c59(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseparamlist() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseopenarray();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsefiller();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parsekey();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsefiller();
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s5 = peg$c60(s5);
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parsekey();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsefiller();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s5 = peg$c60(s5);
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsefiller();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseclosearray();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c61(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseparamset() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parseexpression();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsefiller();
        if (s4 !== peg$FAILED) {
          peg$savedPos = s2;
          s3 = peg$c62(s3);
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$currPos;
        s3 = peg$parseexpression();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsefiller();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s2;
            s3 = peg$c62(s3);
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c61(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsebuffer() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseeol();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsews();
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c63(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parseComment();
        peg$silentFails--;
        if (s4 === peg$FAILED) {
          s3 = void 0;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseopentag();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseclosetag();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$parseeol();
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = void 0;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s7 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c24); }
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s2;
                  s3 = peg$c25(s7);
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parseComment();
            peg$silentFails--;
            if (s4 === peg$FAILED) {
              s3 = void 0;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parseopentag();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$currPos;
                peg$silentFails++;
                s6 = peg$parseclosetag();
                peg$silentFails--;
                if (s6 === peg$FAILED) {
                  s5 = void 0;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$currPos;
                  peg$silentFails++;
                  s7 = peg$parseeol();
                  peg$silentFails--;
                  if (s7 === peg$FAILED) {
                    s6 = void 0;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                  if (s6 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                      s7 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c24); }
                    }
                    if (s7 !== peg$FAILED) {
                      peg$savedPos = s2;
                      s3 = peg$c25(s7);
                      s2 = s3;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c64(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseescapekeys() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c65) {
        s0 = peg$c65;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c66); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c67) {
          s0 = peg$c67;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 115) {
            s0 = peg$c69;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c70); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 110) {
              s0 = peg$c71;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c72); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 114) {
                s0 = peg$c73;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c74); }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseescapes() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 126) {
          s2 = peg$c75;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseescapekeys();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseclosetag();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c77(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsecommentopen() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 42) {
          s2 = peg$c78;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c79); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsecommentclose() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c78;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c79); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseclosetag();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsecommentopen();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parsecommentclose();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c24); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parsecommentclose();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsecommentclose();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsefiller() {
      var s0, s1;

      s0 = [];
      s1 = peg$parsews();
      if (s1 === peg$FAILED) {
        s1 = peg$parseComment();
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parsews();
        if (s1 === peg$FAILED) {
          s1 = peg$parseComment();
        }
      }

      return s0;
    }

    function peg$parserawopen() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 96) {
          s2 = peg$c80;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c81); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parserawclose() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 96) {
        s1 = peg$c80;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c81); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseclosetag();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRaw() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parserawopen();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parserawclose();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c24); }
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c25(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parserawclose();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c24); }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c25(s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parserawclose();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c82(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseFnCreate() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsefiller();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c83) {
            s3 = peg$c83;
            peg$currPos += 2;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c84); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsefiller();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$parseparamlist();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsefiller();
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c85(s6);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 === peg$FAILED) {
                s5 = null;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseblock();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsefiller();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseclosetag();
                    if (s8 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c86(s5, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseCall() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsefiller();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsecallable();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsefiller();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseparamset();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsefiller();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseclosetag();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c87(s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseassociativeitem() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 58) {
        s1 = peg$c88;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c89); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsekey();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsefiller();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexpression();
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c90(s2, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseMap() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseopenarray();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s2 = peg$c88;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c89); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseclosearray();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c91();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseopenarray();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsefiller();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            s5 = peg$parseassociativeitem();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsefiller();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s5 = peg$c62(s5);
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$currPos;
                s5 = peg$parseassociativeitem();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsefiller();
                  if (s6 !== peg$FAILED) {
                    peg$savedPos = s4;
                    s5 = peg$c62(s5);
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              }
            } else {
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parsefiller();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseclosearray();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c92(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseArray() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseopenarray();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseclosearray();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c93();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseopenarray();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsefiller();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            s5 = peg$parseexpression();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsefiller();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s5 = peg$c62(s5);
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$currPos;
                s5 = peg$parseexpression();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsefiller();
                  if (s6 !== peg$FAILED) {
                    peg$savedPos = s4;
                    s5 = peg$c62(s5);
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              }
            } else {
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parsefiller();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseclosearray();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c94(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseEmpty() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseopentag();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseclosetag();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c95();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseTag() {
      var s0;

      s0 = peg$parseFnCreate();
      if (s0 === peg$FAILED) {
        s0 = peg$parseCall();
        if (s0 === peg$FAILED) {
          s0 = peg$parseRaw();
          if (s0 === peg$FAILED) {
            s0 = peg$parseescapes();
            if (s0 === peg$FAILED) {
              s0 = peg$parseEmpty();
            }
          }
        }
      }

      return s0;
    }

    function peg$parseexpression() {
      var s0;

      s0 = peg$parseTag();
      if (s0 === peg$FAILED) {
        s0 = peg$parseliteral();
        if (s0 === peg$FAILED) {
          s0 = peg$parseMap();
          if (s0 === peg$FAILED) {
            s0 = peg$parseArray();
            if (s0 === peg$FAILED) {
              s0 = peg$parseidentifier();
            }
          }
        }
      }

      return s0;
    }

    function peg$parsecomparators() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c96) {
        s2 = peg$c96;
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c97); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c98();
      }
      s1 = s2;
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c99) {
          s2 = peg$c99;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c100); }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$c101();
        }
        s1 = s2;
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c102) {
            s2 = peg$c102;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c103); }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s1;
            s2 = peg$c104();
          }
          s1 = s2;
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c105) {
              s2 = peg$c105;
              peg$currPos += 2;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c106); }
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s1;
              s2 = peg$c107();
            }
            s1 = s2;
            if (s1 === peg$FAILED) {
              s1 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 60) {
                s2 = peg$c108;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c109); }
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s1;
                s2 = peg$c110();
              }
              s1 = s2;
              if (s1 === peg$FAILED) {
                s1 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 62) {
                  s2 = peg$c111;
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c112); }
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s1;
                  s2 = peg$c113();
                }
                s1 = s2;
                if (s1 === peg$FAILED) {
                  s1 = peg$currPos;
                  if (input.substr(peg$currPos, 3) === peg$c114) {
                    s2 = peg$c114;
                    peg$currPos += 3;
                  } else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c115); }
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s1;
                    s2 = peg$c116();
                  }
                  s1 = s2;
                  if (s1 === peg$FAILED) {
                    s1 = peg$currPos;
                    if (input.substr(peg$currPos, 2) === peg$c117) {
                      s2 = peg$c117;
                      peg$currPos += 2;
                    } else {
                      s2 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c118); }
                    }
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s1;
                      s2 = peg$c119();
                    }
                    s1 = s2;
                    if (s1 === peg$FAILED) {
                      s1 = peg$currPos;
                      if (input.substr(peg$currPos, 3) === peg$c120) {
                        s2 = peg$c120;
                        peg$currPos += 3;
                      } else {
                        s2 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c121); }
                      }
                      if (s2 !== peg$FAILED) {
                        peg$savedPos = s1;
                        s2 = peg$c122();
                      }
                      s1 = s2;
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c123(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsemathators() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 43) {
        s2 = peg$c124;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c125); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c126();
      }
      s1 = s2;
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c34;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$c127();
        }
        s1 = s2;
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 42) {
            s2 = peg$c78;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c79); }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s1;
            s2 = peg$c128();
          }
          s1 = s2;
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 47) {
              s2 = peg$c129;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c130); }
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s1;
              s2 = peg$c131();
            }
            s1 = s2;
            if (s1 === peg$FAILED) {
              s1 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 37) {
                s2 = peg$c132;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c133); }
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s1;
                s2 = peg$c134();
              }
              s1 = s2;
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c123(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsecallable() {
      var s0;

      s0 = peg$parseFnCreate();
      if (s0 === peg$FAILED) {
        s0 = peg$parsecomparators();
        if (s0 === peg$FAILED) {
          s0 = peg$parsemathators();
          if (s0 === peg$FAILED) {
            s0 = peg$parseidentifier();
          }
        }
      }

      return s0;
    }


      function makeInteger(arr) {
        return parseInt(arr.join(''), 10);
      }
      function withPosition(arr) {
        var loc = location().start;
        return arr.concat([loc.line, loc.column]);
      }


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

  Lisplate.Parser = parser;
  return parser;
}));

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.compiler', ['lisplate.core', 'lisplate.parser'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./'), require('./parser'));
  } else {
    factory(root.Lisplate, root.Lisplate.Parser);
  }
}(this, function(Lisplate, parser) {
  'use strict';

  var pegSyntaxError = parser.SyntaxError;

  // function Scope() {
  //   this.vars = {};
  // }
  // Scope.prototype.addToScope = function(key) {
  //   var index = this.findInScope(key);
  //   if (index === -1) {
  //     this.vars.push([key, null]);
  //   }
  // };
  // Scope.prototype.findInScope = function(key) {
  //   return this.vars.findIndex(function(item) {
  //     return item[0] === key;
  //   });
  // };

  // function SymbolTable() {
  //   this.scopes = [];
  // }
  // SymbolTable.prototype.pushScope = function(keys) {
  //   var newScope = new Scope();
  //   if (keys && keys.length) {
  //     keys.forEach(newScope.addToScope);
  //   }
  //   this.scopes.splice(0, 0, newScope);
  // };
  // SymbolTable.prototype.findAddress = function(key) {
  //   var address = null;

  //   this.scopes.forEach(function(scope, scopeIndex) {
  //     var index = scope.findInScope(key);
  //     if (index !== -1) {
  //       address = [scopeIndex, index];
  //     }
  //   });

  //   // if not set, assume it's in the viewmodel
  //   return address;
  // };

  function makeErrorWithParserArray(arr, message, expected, found) {
    var line = arr ? arr[3] : 0;
    var col = arr ? arr[4] : 0;
    return new pegSyntaxError(
      message,
      expected,
      found,
      {
        start: { offset: 0, line: line, column: col },
        end: { offset: 0, line: line, column: col }
      }
    );
  }

  function addCmdOut(cmd, str) {
    return '$c.' + cmd + '(' + str + ')\n';
  }

  function Compiler() {
    this.internalsUsed = ['escapeHtml'];
    this._expEscapeDisable = false;
  }

  Compiler.prototype.processblock = function processblock(b) {
    // could be format, buffer, null(comment), or expression
    // console.log('block');
    var _self = this;

    var output = '';

    var bLen = b.length;
    var prevBuff = '';

    b.forEach(function(e, indx) {
      var type = e[0];
      if (!type) {
        output += '';
      } else if (type === 'format' || type === 'buffer') {
        // do a look ahead
        prevBuff += type === 'format' ? '' : e[1];
        var nextIndex = indx + 1;
        if (!(nextIndex < bLen && (b[nextIndex][0] === 'format' || b[nextIndex][0] === 'buffer'))) {
          if (prevBuff.length) {
            output += addCmdOut('w', '"' + prevBuff.replace(/"/g, '\\"') + '"');
            prevBuff = '';
          }
        }
      } else {
        var expression = _self.processexp(e);
        output += addCmdOut('w', expression);
      }
    });

    return output;
  };

  Compiler.prototype.processexp = function processexp(e) {
    // console.log('exp');
    var type = e[0];
    try {
      if (type === 'fn') {
        return this.processfn(e[1]);
      } else if (type === 'call') {
        return this.processcall(e[1]);
      } else if (type === 'raw') {
        return this.processraw(e[1]);
      } else if (type === 'escape') {
        return this.processescape(e[1]);
      } else if (type === 'identifier') {
        return this.processidentifier(e[1]);
      } else if (type === 'literal') {
        return this.processliteral(e[1]);
      } else if (type === 'map') {
        return this.processmap(e[1]);
      } else if (type === 'array') {
        return this.processarray(e[1]);
      } else if (type === 'empty') {
        return this.processempty();
      } else {
        throw makeErrorWithParserArray(
          null,
          'Expected to find an expression type but did not find one',
          'type',
          'null'
        );
      }
    } catch (err) {
      throw makeErrorWithParserArray(
        e,
        err.message,
        err.expected,
        err.found
      );
    }
  };

  Compiler.prototype.useinternal = function useinternal(i) {
    if (this.internalsUsed.indexOf(i) === -1) {
      this.internalsUsed.push(i);
    }
    return '$i_' + i;
  };

  Compiler.prototype.processidentifier = function processidentifier(v) {
    // console.log('identifier');
    var ctx = v[0];
    var identifierName = v[1];

    if (ctx) {
      if (identifierName) {
        return '$' + ctx + '.' + identifierName;
      } else {
        return '$' + ctx;
      }
    }

    return identifierName;
  };

  Compiler.prototype.processliteral = function processliteral(v) {
    return v[0];
  };

  Compiler.prototype.processmap = function processmap(v) {
    // console.log('map');
    var _self = this;

    var arr = v[0];
    var output = '{';
    if (arr && arr.length) {
      output += arr.map(function(e) {
        return e[0] + ':' + _self.processexp(e[1]);
      }).join(',');
    }
    output += '}';

    return output;
  };

  Compiler.prototype.processarray = function processarray(v) {
    // console.log('array');
    var _self = this;

    var arr = v[0];
    var output = '[';
    if (arr && arr.length) {
      output += arr.map(function(e) {
        return _self.processexp(e);
      }).join(',');
    }
    output += ']';

    return output;
  };

  Compiler.prototype.processempty = function processempty() {
    return 'null';
  };

  Compiler.prototype.processfn = function processfn(v) {
    // console.log('fn');
    var params = v[0];
    var block = v[1];

    var output = '(function(';
    if (params && params.length) {
      output += params.map(function(p) {
        return p;
      }).join(',');
    }
    output += ') {\nvar $c = new $_w();\n';
    // output += ') {\n';

    if (!block || block[0] !== 'block' || !block[1]) {
      throw makeErrorWithParserArray(
        null,
        'Expected function to contain a block',
        'block',
        block ? block[0] : 'null'
      );
    }

    output += this.processblock(block[1]);
    // output += '\n return $c.getOutput();\n})\n';
    output += '\n return $c;\n})\n';
    return output;
  };

  Compiler.prototype.processcall = function processcall(v) {
    // console.log('call');
    var _self = this;

    var needsProtection = !this._expEscapeDisable;

    var callable = null;
    var type = v[0][0];
    if (type === 'fn') {
      needsProtection = false;
      callable = _self.processfn(v[0][1]);
    } else if (type === 'identifier') {
      // TODO: is it possible to determine source of identifier?
      callable = _self.processidentifier(v[0][1]);

      if (Lisplate.Runtime[callable]) {
        needsProtection = false;

        if (callable === 'safe') {
          this._expEscapeDisable = true;
        }
        callable = _self.useinternal(callable);
      } else if (callable === 'include') {
        needsProtection = false;
        callable = '$$Lisplate.renderTemplate';
      }
    // } else if (type === 'internal') {
    //   needsProtection = false;
    //   if (v[0][1][0] === 'include') {
    //     callable = '$$Lisplate.renderTemplate';
    //   } else {
    //     if (v[0][1][0] === 'safe') {
    //       this._expEscapeDisable = true;
    //     }
    //     callable = useinternal(callable);
    //   }
    } else {
      throw makeErrorWithParserArray(
        null,
        'Unknown callable',
        'fn, identifier, or internal',
        type
      );
    }

    var params = v[1];

    var output = callable;

    if (needsProtection) {
      output = _self.useinternal('escapeHtml') + '(' + output;
    }

    if (params && params.length) {
      output += '(';
      output += params.map(function(p) {
        return _self.processexp(p);
      }).join(',');
      output += ')';
    }

    if (needsProtection) {
      output += ')';
    }

    this._expEscapeDisable = false;

    return output;
  };

  Compiler.prototype.processraw = function processraw(v) {
    return '"' + v[0] + '"';
  };

  Compiler.prototype.processescape = function processescape(v) {
    var item = v[0];

    if (item === 's') {
      return '" "';
    } else if (item === 'n') {
      return '"\\n"';
    } else if (item === 'r') {
      return '"\\r"';
    } else if (item === 'lb') {
      return '"{"';
    } else if (item === 'rb') {
      return '"}"';
    } else {
      throw new Error('Unknown escape: ' + item);
    }
  };

  Compiler.prototype.outputInternals = function outputInternals() {
    return 'var ' + this.internalsUsed.map(function(item) {
      return '$i_' + item + '= $runtime.' + item;
    }).join(',\n') + ';\n\n';
  };

  function compile(templateName, src) {
    var codeGenerator = new Compiler();

    try {
      var ast = parser.parse(src);

      if (ast[0] !== 'block') {
        throw new pegSyntaxError(
          'Expected template to start with a block, but found ' + ast[0] + ' instead',
          'block',
          ast[0],
          {
            start: { offset: 0, line: 0, column: 0 },
            end: { offset: 0, line: 0, column: 0 }
          }
        );
      }

      var compiled = codeGenerator.processblock(ast[1]);
      var internals = codeGenerator.outputInternals();

      var code = 'function($$Lisplate,$$vmc){' +
        'return function($data,$strings,$runtime) {' +
        'var $viewmodel = $$vmc ? new $$vmc($data) : null;' +
        'var $helper = $$Lisplate.helpers;' +
        'var $_w = $runtime.Chunk;' +
        'var $c = new $_w();\n' +
        internals +
        compiled +
        '\nreturn $c.getOutput();\n}\n}';
      return code;
    } catch (err) {
      if (!err.location) {
        throw err;
      }

      var newMessage = err.message + ' [' + templateName + ':' + err.location.start.line + ':' + err.location.start.column + ']';
      throw new pegSyntaxError(newMessage, err.expected, err.found, err.location);
    }
  }

  function compileModule(templateName, src) {
    var template = compile(templateName, src);

    var moduleCode = '(function(root, factory) {\n' +
      'if (typeof define === \'function\' && define.amd) {\n' +
        'define(\'' + templateName + '\', [], factory);\n' +
      '} else if (typeof exports === \'object\') {\n' +
        'module.exports = factory();\n' +
      '} else {\n' +
        'root[\'' + templateName + '\'] = factory();\n' +
      '}\n' +
    '}(this, function() {\n' +
      '\'use strict\';\n' +

      'var fn = ' + template + '\n' +

      'return {\n' +
          'templateName: \'' + templateName + '\',\n' +
          'renderFactory: fn\n' +
      '};\n' +
    '}));\n';

    return moduleCode;
  }

  Lisplate.Compiler = {
    compile: compile,
    compileModule: compileModule
  };

  return Lisplate.Compiler;
}));
