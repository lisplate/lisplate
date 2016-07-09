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
