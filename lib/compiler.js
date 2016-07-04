'use strict';

var parser = require('./parser').parse;
var pegSyntaxError = require('./parser').SyntaxError;

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
      var nextIndex = indx + 1;
      if (!(nextIndex < bLen && (b[nextIndex][0] === 'format' || b[nextIndex][0] === 'buffer'))) {
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
  try {
    if (type === 'fn') {
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
}
function processliteral(v) {
  return v[0];
}
function processmap(v) {
  // console.log('map');
  var arr = v[0];
  var output = '{';
  if (arr && arr.length) {
    output += arr.map(function(e) {
      return e[0] + ':' + processexp(e[1]);
    }).join(',');
  }
  output += '}';

  return output;
}
function processarray(v) {
  // console.log('array');
  var arr = v[0];
  var output = '[';
  if (arr && arr.length) {
    output += arr.map(function(e) {
      return processexp(e);
    }).join(',');
  }
  output += ']';

  return output;
}
function processempty() {
  return 'null';
}

function processfn(v) {
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

  output += processblock(block[1]);
  output += '\n return $c.getOutput();\n})\n';
  return output;
}

function processcall(v) {
  // console.log('call');
  var needsProtection = true;

  var callable = null;
  var type = v[0][0];
  if (type === 'fn') {
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
    throw makeErrorWithParserArray(
      null,
      'Unknown callable',
      'fn, identifier, or internal',
      type
    );
  }

  var params = v[1];
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
  return '"' + v[0] + '"';
}

function processescape(v) {
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
}


module.exports = function(templateName, src) {
  try {
    var ast = parser(src);

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

    var compiled = processblock(ast[1]);

    var internals = internalsUsed.length ? 'var ' + internalsUsed.map(function(item) {
      return '$i_' + item + '= $runtime.' + item;
    }).join(',\n') + ';\n\n' : '';

    var code = 'function($$vmc){return function($$Lisplate,$data,$strings,$runtime) {var $viewmodel=$$vmc?new $$vmc($data):null; var $helper=$$Lisplate.helpers; var $_w=$runtime.$W;\nvar $c = new $_w();\n' + internals + compiled + '\nreturn $c.getOutput();\n}\n}';
    return code;
  } catch (err) {
    if (!err.location) {
      throw err;
    }

    var newMessage = err.message + ' [' + templateName + ':' + err.location.start.line + ':' + err.location.start.column + ']';
    throw new pegSyntaxError(newMessage, err.expected, err.found, err.location);
  }
};
