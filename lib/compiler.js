'use strict';

const SyntaxError = require('./parser').SyntaxError;
const parser = require('./parser').parse;

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

function addCmdOut(cmd, str) {
  if (cmd) {
    return '$c.' + cmd + '(' + str + ')\n';
  } else {
    return str;
  }
}

function processblock(b) {
  // could be format, buffer, null(comment), or expression
  // console.log('block');
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
      if (!(indx+1 < bLen && (b[indx+1][0] === 'format' || b[indx+1][0] === 'buffer'))) {
        if (prevBuff.length) {
          output += addCmdOut('w', '"' + prevBuff.replace(/"/g, '\\"') + '"');
          prevBuff = '';
        }
      }
    } else {
      output += addCmdOut('w', processexp(e));
    }
  });

  return output;
}
function processexp(e) {
  // console.log('exp');
  var type = e[0];
  if (!type) {
    throw new Error('uhhh, fail no type ' + e);
  } if (type === 'fn') {
    return processfn(e[1]);
  } else if (type === 'call') {
    return processcall(e[1]);
  } else if (type === 'raw') {
    return processraw(e[1]);
  } else if (type === 'escape') {
    return processescape(e[1]);
  } else if (type === 'identifier') {
    return processidentifier(e[1]);
  } else if (type === 'literal') {
    return processliteral(e[1]);
  } else if (type === 'map') {
    return processmap(e[1]);
  } else if (type === 'array') {
    return processarray(e[1]);
  } else if (type === 'empty') {
    return processempty();
  } else {
    throw new Error('unknown thing ' + e);
  }
}

var internalsUsed = [];
function processinternal(v) {
  var i = v[0];
  if (internalsUsed.indexOf(i) === -1) {
    internalsUsed.push(i);
  }
  return '$i_' + v[0];
}

function processidentifier(v) {
  // console.log('identifier');
  var ctx = v.length === 2 ? v.shift() : null;
  var name = v.shift();

  if (ctx) {
    if (name) {
      return '$' + ctx + '.' + name;
    } else {
      return '$' + ctx;
    }
  }

  return name;
}
function processliteral(v) {
  return v[0];
}
function processmap(v) {
  // console.log('map');
  var arr = v[0];
  var output = '{';
  output += arr.map(function(e) {
     return e[0] + ':' + processexp(e[1]);
  }).join(',');
  output += '}';

  return output;
}
function processarray(v) {
  // console.log('array');
  var arr = v[0];
  var output = '[';
  output += arr.map(function(e) {
     return processexp(e);
  }).join(',');
  output += ']';

  return output;
}
function processempty() {
  return 'null';
}

  function processfn(v) {
    // console.log('fn');
    var params = v.length === 2 ? v.shift() : null;
    var block = v.shift();

    var output = '(function(';
    if (params && params.length) {
      output += params.map(function(p) {
        return p;
      }).join(',');
    }
    output += ') {\nvar $c = new $_w();\n';
    // output += ') {\n';

    if (!block || block[0] !== 'block' || !block[1]) {
      throw new Error('Invalid block in a function');
    }

    output += processblock(block[1]);
    output += '\n return $c.getOutput();\n})\n';
    return output;
  }

  function processcall(v) {
    // console.log('call');
    var needsProtection = true;

    var callable = null;
    var type = v[0][0];
    if (!type) {
      throw new Error('no callable type ' + v[0]);
    } if (type === 'fn') {
      needsProtection = false;
      callable = processfn(v[0][1]);
    } else if (type === 'identifier') {
      callable = processidentifier(v[0][1]);
    } else if (type === 'internal') {
      needsProtection = false;
      if (v[0][1][0] === 'include') {
        callable = '$$Lisplate.renderTemplate';
      } else {
        callable = processinternal(v[0][1]);
      }
    } else {
      throw new Error('unknown callable ' + v[0]);
    }

    var params = v[1] || null;
    if (v[2]) {
      needsProtection = false;
    }

    var output = callable;

    if (needsProtection) {
      output = processinternal(['escapeHtml']) + '(' + output;
    }

    if (params && params.length) {
      output += '(';
      output += params.map(function(p) {
        return processexp(p);
      }).join(',');
      output += ')';
    }

    if (needsProtection) {
      output += ')';
    }

    return output;
  }

  function processraw(v) {
    return v[0];
  }

  function processescape(v) {
    var item = v[0];

    if (item === 's') {
      return ' ';
    } else if (item === 'n') {
      return '\\n';
    } else if (item === 'r') {
      return '\\r';
    } else if (item === 'lb') {
      return '{';
    } else if (item === 'rb') {
      return '}';
    } else {
      throw new Error('Unknown escape: ' + item);
    }
  }


module.exports = function(src) {
  var ast = parser(src);

  if (ast[0] !== 'block') {
    throw new Error('Template must start with a block');
  }

  var compiled = processblock(ast[1]);

  var internals = internalsUsed.length ? 'var ' + internalsUsed.map(function(item) {
    return '$i_' + item + '= $runtime.' + item;
  }).join(',\n') + ';\n\n' : '';

  var code = 'function($$vmc){return function($$Lisplate,$data,$strings,$runtime) {var $viewmodel=$$vmc?new $$vmc($data):null; var $helper=$$Lisplate.helpers; var $_w=$runtime.$W;\nvar $c = new $_w();\n' + internals + compiled + '\nreturn $c.getOutput();\n}\n}';
  return code;
}
