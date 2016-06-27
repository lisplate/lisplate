var compiler = require('./compiler');
//var Bluebird = require('bluebird');
// var AsyncWriter = require('async-writer');
var path = require('path');
var fs = require('fs');

function Lisplate(options) {
  this.helpers = {};
  this.sourceLoader = null;
}

Lisplate.prototype.addHelper = function addHelper(name, fn) {
  this.helpers[name] = fn;
};

Lisplate.prototype.loadTemplate = function load(templateName) {
  if (!templateName || !templateName.length) {
      throw new Error('Must specify a template to load');
  }

  if (templateName instanceof Function) {
    return templateName;
  }

  if (!this.sourceLoader) {
    throw new Error('Must define a sourceLoader');
  }
  var src = this.sourceLoader(templateName);

  return this.compileFn(src);
};

Lisplate.prototype.compileFn = function compileFn(src) {
  var compiled = this.compile(src);

  var fn = this.loadCompiledSource(compiled);

  return fn;
};

Lisplate.prototype.compile = compiler;

Lisplate.prototype.loadCompiledSource = function loadCompiledSource(compiledSource) {
  var template = null;
  eval('template=' + compiledSource);
  return template;
};

Lisplate.prototype.render = function render(template, params) {
  var output = template(this, Chunk, params, internal);
  // chunk.getOutput().then(function(output) {
  //     // console.log('out:');
  //     // console.log(output);
  //     // throw new Error('');
  //     callback(null, output);
  //     // console.log(output);
  // });
  return output;
  // callback(null, chunk.writer.getOutput());
}

Lisplate.prototype.renderTemplate = function render(templateName, params) {
  var fn = this.loadTemplate(templateName);
  return this.render(fn, params);
}

var engine = new Lisplate();
module.exports = engine;

function _resolve(item) {
  if (item instanceof Function) {
    return item();
  } else {
    return item;
  }
}

var htmlTest = /[&<>\"\']/;
var htmlReplace = /[&<>\"\']/g;
var replacements = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  '\'': '&#39;'
};

function replaceChar(match) {
  return replacements[match];
}

var internal = {
  escapeHtml: function escapeXmlAttr(str) {
    if (!htmlTest.test(str)) {
      return str;
    }
    return str.replace(htmlReplace, replaceChar);
  },

  eq: function(l, r) {
    return _resolve(l) == _resolve(r);
  },

  neq: function(l, r) {
    return _resolve(l) != _resolve(r);
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

  cmpand : function(l, r) {
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

  include: function(name) {
    // load name if it exists (may load direct or compile it)
    return engine.renderTemplate(name);
  },

  each: function(arr, then, elsethen) {
    var value = _resolve(arr);
    // if (_thenable(value)) {
    //   return value.then(function(a) {
    //     return internal.each(new Chunk(), a, then, elsethen);
    //   });
    // }

    var totalLen = 0;
    if (value && (totalLen = value.length)) {
      if (then) {
        var chunk = new Chunk();
        var i = 0;
        for (; i < totalLen; i++) {
            if (then instanceof Function) {
              chunk.w(then(value[i], i));
            } else {
              chunk.w(then);
            }
        }
        return chunk.getOutput();
        // value.forEach(function(v, i) {
        //     if (then instanceof Function) {
        //       chunk.w(then(chunk, v, i));
        //     } else {
        //       chunk.w(then);
        //     }
        // });
      }
    } else {
      if (elsethen) {
        return _resolve(elsethen);
      }
    }
    return '';
    // return chunk;
  },

  if: function(cond, then, elsethen) {
    var value = _resolve(cond);
    // if (_thenable(value)) {
    //   return value.then(function(c) {
    //     return internal.if(new Chunk(), c, then, elsethen);
    //   });
    // }

    if (value) {// == false
      if (then) {
        return _resolve(then);
      }
    } else {
      if (elsethen) {
        return _resolve(elsethen);
      }
    }
    return '';
  }
};

function _thenable(item) {
  return item && item.then instanceof Function;
}

function Chunk() {
  this.output = '';
  // this.writer = AsyncWriter.create();
}
Chunk.prototype.w = function w(item) {
  this.output += _resolve(item);
  // if (item instanceof Function) {
  //   // this.c(item, [this]);
  //   this.w(item());
  // } else {
  //     this.output += item;
  //     // this.writer.w(item);
  // }
  // return this;
};
// Chunk.prototype.c = function c(fn, args) {
//   fn.apply(null, args);
//   // return this;
// };
Chunk.prototype.getOutput = function() {
  return this.output;
//   return Bluebird
//     .all(this.output)
//     .then(function(items) {
//       return Bluebird.all(items.map(function(item) {
//         if (item instanceof Chunk) {
//           return item.getOutput();
//         }
//         return item;
//       }));
//     })
//     .then(function(items) {
//       return items.join('');
//     });
    // return Bluebird.resolve(this.output);
};

