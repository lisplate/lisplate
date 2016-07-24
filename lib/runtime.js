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
