var Module = require('module');

var parser = require('../lib/parser');
var originalParser = parser.parse;

var Lisplate = require('../lib/')
var compiler = require('../lib/compiler');
var pegSyntaxError = parser.SyntaxError;

describe('Compiler unit tests', function() {

  describe('Parser sanity checks', function() {
    afterEach(function() {
      parser.parse = originalParser;
    });

    it('should catch and throw any parser error', function() {
      var error = new Error('test error');

      parser.parse = function() {
        throw error;
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError();
    });

    it('should catch and throw any parser-syntax error', function() {
      var error = new pegSyntaxError('test error', 'expect', 'found', {start:{line:0, column:0}});

      parser.parse = function() {
        throw error;
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if start is not block', function() {
      parser.parse = function() {
        return ['notablock'];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should silently ignore no-type in block', function() {
      parser.parse = function() {
        return ['block', [[null]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).not.toThrowError();
    });

    it('should error on invalid expression', function() {
      parser.parse = function() {
        return ['block', [['notanexpression']]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 does not exist', function() {
      parser.parse = function() {
        return ['block', [['fn', [[]]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 is not block', function() {
      parser.parse = function() {
        return ['block', [['fn', [[], ['notablock']]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 block is null', function() {
      parser.parse = function() {
        return ['block', [['fn', [[], ['block', null]]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if unknown callable is used in call', function() {
      parser.parse = function() {
        return ['block', [['call', ['badcallable', []]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error no params for include', function() {
      parser.parse = function() {
        return ['block',[['call',[['identifier',['','include']]]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });
    it('should error for 0 params for include', function() {
      parser.parse = function() {
        return ['block',[['call',[['identifier',['','include']],[]]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });
    it('should error for 3 params for include', function() {
      parser.parse = function() {
        return ['block',[['call',[['identifier',['','include']],['1','2','3']]]]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error with unknown escape sequences', function() {
      parser.parse = function() {
        return ['block', [['escape', 'badescapeseq']]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });
  });

  describe('compileModule', function() {
    it('should wrap compiled code', function(done) {
      var src = 'test';
      var out = compiler.compileModule('test', src);
      expect(out).not.toEqual(src);

      var targetPath = __dirname + '/out/test';
      var targetModule = new Module(targetPath, module.parent);
      targetModule._compile(out, targetPath);

      var engine = new Lisplate();
      engine
        .loadTemplate(targetModule.exports)
        .then(function(fn) {
          return engine.render(fn, null);
        })
        .then(function(rendered) {
          expect(rendered).toEqual('test');
          done();
        })
        .catch(function(err) {
          done.fail('Catch should not be called with error');
        });
      done();
    });
  });

});
