var rewire = require('rewire');
var compiler = rewire('../lib/compiler');
var pegSyntaxError = compiler.__get__('pegSyntaxError');

describe('Compiler unit tests', function() {

  describe('Parser sanity checks', function() {
    it('should catch and throw any parser error', function() {
      var error = new Error('test error');

      compiler.__set__('parser', function() {
        throw error;
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(Error);
    });

    it('should catch and throw any parser-syntax error', function() {
      var error = new pegSyntaxError('test error', 'expect', 'found', {start:{line:0, column:0}});

      compiler.__set__('parser', function() {
        throw error;
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if start is not block', function() {
      compiler.__set__('parser', function() {
        return ['notablock'];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should silently ignore no-type in block', function() {
      compiler.__set__('parser', function() {
        return ['block', [[null]]];
      });

      expect(function() {
        compiler('test', 'src');
      }).not.toThrowError();
    });

    it('should error on invalid expression', function() {
      compiler.__set__('parser', function() {
        return ['block', [['notanexpression']]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 does not exist', function() {
      compiler.__set__('parser', function() {
        return ['block', [['fn', [[]]]]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 is not block', function() {
      compiler.__set__('parser', function() {
        return ['block', [['fn', [[], ['notablock']]]]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if fn-declare param 2 block is null', function() {
      compiler.__set__('parser', function() {
        return ['block', [['fn', [[], ['block', null]]]]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error if unknown callable is used in call', function() {
      compiler.__set__('parser', function() {
        return ['block', [['call', ['badcallable', []]]]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error with unknown escape sequences', function() {
      compiler.__set__('parser', function() {
        return ['block', [['escape', 'badescapeseq']]];
      });

      expect(function() {
        compiler('test', 'src');
      }).toThrowError(pegSyntaxError);
    });
  });

});
