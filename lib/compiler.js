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

  // some callables are re-mapped internally, such as include
  var internalCallRemap = {
    include: 'processinclude'
  };

  var compilerCalls = {
    def: 'processdef',
    safe: 'processsafe'
  };

  function Scope() {
    this.vars = [];
    this.defs = {};
  }
  Scope.prototype.addToScope = function(key, value) {
    if (this.vars.indexOf(key) !== -1) {
      return false;
    }

    this.vars.push(key);

    if (arguments.length === 2) {
      this.defs[key] = value;
    }

    return true;
  };
  Scope.prototype.findInScope = function(key) {
    return this.vars.indexOf(key);
  };

  function SymbolTable() {
    this.scopes = [];
  }
  SymbolTable.prototype.pushScope = function(keys) {
    var newScope = new Scope();
    if (keys && keys.length) {
      keys.forEach(function(k) {
        newScope.addToScope(k);
      });
    }
    this.scopes.push(newScope);
  };
  SymbolTable.prototype.popScope = function() {
    var scope = this.scopes.pop();
    return scope.defs;
  };
  SymbolTable.prototype.addDefToScope = function(key, value) {
    return this.scopes[this.scopes.length - 1].addToScope(key, value);
  };
  SymbolTable.prototype.findAddress = function(key) {
    for (var i = this.scopes.length; i--;) {
      var scope = this.scopes[i];
      var index = scope.findInScope(key);
      if (index !== -1) {
        return [i, index];
      }
    }

    // if not set, it's somewhere else
    return null;
  };

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
    if (!str || !str.length) {
      return '';
    }
    return '$c.' + cmd + '(' + str + ')\n';
  }

  function Compiler() {
    this.internalsUsed = ['escapeHtml'];
    this.symbolTable = new SymbolTable();
    this.needLookup = [];
  }

  Compiler.prototype.processblock = function processblock(b, paramKeys, disableEscaper) {
    // could be format, buffer, null(comment), or expression
    var _self = this;

    var output = '';

    var bLen = b.length;
    var prevBuff = '';

    this.symbolTable.pushScope(paramKeys);

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
        var expression = _self.processexp(e, disableEscaper);
        output += addCmdOut('w', expression);
      }
    });

    var defs = this.symbolTable.popScope();
    var defStr = '';
    for (var prop in defs) {
      defStr += 'var ' + prop + ' = ' + defs[prop] + ';\n';
    }

    return defStr + output;
  };

  Compiler.prototype.processexp = function processexp(e, disableEscaper) {
    var type = e[0];
    try {
      if (type === 'fn') {
        return this.processfn(e[1], disableEscaper);
      } else if (type === 'call') {
        return this.processcall(e[1], disableEscaper);
      } else if (type === 'raw') {
        return this.processraw(e[1]);
      } else if (type === 'escape') {
        return this.processescape(e[1]);
      } else if (type === 'identifier') {
        return this.processidentifier(e[1])[0];
      } else if (type === 'literal') {
        return this.processliteral(e[1]);
      } else if (type === 'map') {
        return this.processmap(e[1], disableEscaper);
      } else if (type === 'array') {
        return this.processarray(e[1], disableEscaper);
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
    var ns = v[0];
    var identifierName = v[1];

    if (ns) {
      if (identifierName) {
        return ['$' + ns + '.' + identifierName, true];
      } else {
        return ['$' + ns, true];
      }
    }

    if (Lisplate.Runtime[identifierName]) {
      return [this.useinternal(identifierName), false];
    }

    var parts = identifierName.split('.');
    var nameRoot = parts[0];

    if (this.symbolTable.findAddress(nameRoot)) {
      return [identifierName, true];
    } else {
      if (this.needLookup.indexOf(nameRoot) === -1) {
        this.needLookup.push(nameRoot);
      }

      return ['$lu_' + identifierName, true];
    }
  };

  Compiler.prototype.processliteral = function processliteral(v) {
    return v[0];
  };

  Compiler.prototype.processmap = function processmap(v, disableEscaper) {
    var _self = this;

    var arr = v[0];
    var output = '{';
    if (arr && arr.length) {
      output += arr.map(function(e) {
        return e[0] + ':' + _self.processexp(e[1], disableEscaper);
      }).join(',');
    }
    output += '}';

    return output;
  };

  Compiler.prototype.processarray = function processarray(v, disableEscaper) {
    var _self = this;

    var arr = v[0];
    var output = '[';
    if (arr && arr.length) {
      output += arr.map(function(e) {
        return _self.processexp(e, disableEscaper);
      }).join(',');
    }
    output += ']';

    return output;
  };

  Compiler.prototype.processempty = function processempty() {
    return 'null';
  };

  Compiler.prototype.processfn = function processfn(v, disableEscaper) {
    var params = v[0];
    var block = v[1];

    var output = '(function(';
    if (params && params.length) {
      output += params.map(function(p) {
        return p;
      }).join(',');
    }

    output += ') {\nvar $c = new $_w();\n';

    if (!block || block[0] !== 'block' || !block[1]) {
      throw makeErrorWithParserArray(
        null,
        'Expected function to contain a block',
        'block',
        block ? block[0] : 'null'
      );
    }

    output += this.processblock(block[1], params, disableEscaper);

    output += '\n return $c;\n})\n';
    return output;
  };

  Compiler.prototype.processinclude = function processinclude(params) {
    if (!params || params.length < 1 || params.length > 2) {
      throw makeErrorWithParserArray(
        null,
        'Include must be called with 1 or 2 parameters: template-name and optional data',
        '1 or 2 parameters, template-name and optional data',
        (params ? params.length : 0)
      );
    }

    params = params.slice();

    if (params.length === 1) {
      params.push(['empty']);
    }
    params.push(['identifier', ['ctx', null]]);

    return ['$$Lisplate.renderTemplate', params, false];
  };

  Compiler.prototype.processdef = function processdef(params, disableEscaper) {
    if (!params || params.length !== 2) {
      throw makeErrorWithParserArray(
        null,
        'def must be called with 2 parameters, the identifier to define and a value to bind to',
        '2 parameters, identifier to define and value to use for binding',
        (params ? params.length : 0)
      );
    }

    var keyParam = params[0];
    if (keyParam[0] !== 'identifier') {
      throw makeErrorWithParserArray(
        null,
        'def first parameter must be an identifier to create and bind value to',
        'identifier',
        keyParam[0]
      );
    }
    if (keyParam[1][0] !== '') {
      throw makeErrorWithParserArray(
        null,
        'def first parameter must not be namespaced, cannot bind value to namespaced identifiers',
        'non-namespaced identifier',
        keyParam[1][0] + '::' + keyParam[1][1]
      );
    }

    var key = keyParam[1][1];
    var value = this.processexp(params[1], disableEscaper);

    if (!this.symbolTable.addDefToScope(key, value)) {
      throw makeErrorWithParserArray(
        null,
        'identifier is already defined in the scope and cannot be redefined in the same scope',
        'unused identifier or different scope for identifier',
        key
      );
    }
    return '';
  };

  Compiler.prototype.processsafe = function processsafe(params) {
    if (!params || params.length !== 1) {
      throw makeErrorWithParserArray(
        null,
        'safe must be called with 1 parameter',
        '1 parameter that will not be escaped',
        (params ? params.length : 0)
      );
    }

    return this.processexp(params[0], true);
  };

  Compiler.prototype.processcall = function processcall(v, disableEscaper) {
    var _self = this;

    var needsProtection = true;
    var shouldDisableEscape = disableEscaper;

    var callable = null;
    var type = v[0][0];
    var params = v[1];

    if (type === 'fn') {
      needsProtection = false;
      callable = _self.processfn(v[0][1], disableEscaper);
    } else if (type === 'identifier') {
      if (v[0][1][0] === '') {
        callable = v[0][1][1];

        if (internalCallRemap[callable]) {
          var remap = this[internalCallRemap[callable]](params, disableEscaper);
          callable = remap[0];
          params = remap[1];
          needsProtection = remap[2];
        } else if (compilerCalls[callable]) {
          return this[compilerCalls[callable]](params, disableEscaper);
        } else {
          callable = null;
        }
      }

      if (!callable) {
        var ret = _self.processidentifier(v[0][1]);
        callable = ret[0];
        needsProtection = ret[1];
      }
    } else {
      throw makeErrorWithParserArray(
        null,
        'Unknown callable',
        'fn, identifier, or internal',
        type
      );
    }

    needsProtection = needsProtection && disableEscaper !== true;

    var output = callable;

    if (params && params.length) {
      output += '(';
      output += params.map(function(p) {
        return _self.processexp(p, shouldDisableEscape);
      }).join(',');
      output += ')';
    } else {
      // may or may not be a function here
      output = '(typeof ' + output + ' === \'function\' ? ' + output + '() : ' + output + ')';
    }

    if (needsProtection) {
      output = _self.useinternal('escapeHtml') + '(' + output + ')';
    }

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
      return '$i_' + item + ' = $runtime.' + item;
    }).join(',\n') + ';\n\n';
  };

  Compiler.prototype.outputLookups = function outputLookups() {
    if (!this.needLookup.length) {
      return '';
    }

    var lookup = 'function $_lookup(key) {\n' +
                 '  var searches = [$viewmodel, $data, $helper, $strings, $ctx];\n' +
                 '  for (var i=0; i < searches.length; i++) {\n' +
                 '    var s = searches[i];\n' +
                 '    if (s && s[key]) {\n' +
                 '      return s[key];\n' +
                 '    }\n' +
                 '  }\n' +
                 '  return null;\n' +
                 '};\n';

    return lookup + 'var ' + this.needLookup.map(function(key) {
      return '$lu_' + key + ' = $_lookup(\'' + key + '\')';
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

      var compiled = codeGenerator.processblock(ast[1], null, false);
      var internals = codeGenerator.outputInternals();
      var lookups = codeGenerator.outputLookups();

      var code = 'function($$Lisplate,$$vmc){' +
        'return function($data,$strings,$runtime,$ctx) {' +
        'var $viewmodel = $$vmc ? new $$vmc($data,$strings,$ctx) : null;' +
        'var $helper = $$Lisplate.helpers;' +
        'var $_w = $runtime.Chunk;' +
        'var $c = new $_w();\n' +
        internals +
        lookups +
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
