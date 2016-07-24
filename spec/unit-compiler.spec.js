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

    it('should error when safe called with no params', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'safe']]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when safe called with empty params', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'safe']], []]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when safe called with 2 params', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'safe']], [
            ['literal', ['test']],
            ['literal', ['test']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with no params', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with empty params', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], []]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with 1 param', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], [
            ['identifier', ['', 'test']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with 3 param', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], [
            ['identifier', ['', 'test']],
            ['identifier', ['', 'something']],
            ['identifier', ['', 'else']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with 1st param not identifier', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], [
            ['literal', ['test']],
            ['literal', ['test']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when def called with namespaced identifier', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], [
            ['identifier', ['ns', 'test']],
            ['literal', ['something']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });

    it('should error when re-def-ing a variable', function() {
      parser.parse = function() {
        return ['block', [
          ['call', [['identifier', ['', 'def']], [
            ['identifier', ['', 'test']],
            ['literal', ['Hello world']]
          ]]],
          ['call', [['identifier', ['', 'def']], [
            ['identifier', ['', 'test']],
            ['literal', ['redef']]
          ]]]
        ]];
      };

      expect(function() {
        compiler.compile('test', 'src');
      }).toThrowError(pegSyntaxError);
    });
  });

  describe('compiler options', function() {
    it('should default enabled trim format-whitespace', function(done) {
      var src = 'test\n   test';

      var compiled = compiler.compile('test', src);
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }).then(function(out) {
        expect(out).toEqual('testtest');
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should allow disable trim format-whitespace', function(done) {
      var src = 'test\n   test';

      var compiled = compiler.compile('test', src, {
        keepWhitespace: true
      });
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }).then(function(out) {
        expect(out).toEqual('test\n   test');
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should allow enable trim format-whitespace', function(done) {
      var src = 'test\n   test';

      var compiled = compiler.compile('test', src, {
        keepWhitespace: false
      });
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }).then(function(out) {
        expect(out).toEqual('testtest');
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should default escaper to escapeHtml', function(done) {
      var src = '{data::test}';

      var compiled = compiler.compile('test', src);
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      spyOn(Lisplate.Runtime, 'escapeHtml').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJs').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJson').and.callThrough();

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }, {test: '<br>'}).then(function(out) {
        expect(out).toEqual('&lt;br&gt;');
        expect(Lisplate.Runtime.escapeHtml).toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJs).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJson).not.toHaveBeenCalled();
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should allow escaper to be falsey (disabled)', function(done) {
      var src = '{data::test}';

      var compiled = compiler.compile('test', src, {
        defaultEscape: false
      });
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      spyOn(Lisplate.Runtime, 'escapeHtml').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJs').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJson').and.callThrough();

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }, {test: '<"test">'}).then(function(out) {
        expect(out).toEqual('<"test">');
        expect(Lisplate.Runtime.escapeHtml).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJs).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJson).not.toHaveBeenCalled();
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should allow user specified internal escaper', function(done) {
      var src = '{data::test}';

      var compiled = compiler.compile('test', src, {
        defaultEscape: 'escapeJs'
      });
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      spyOn(Lisplate.Runtime, 'escapeHtml').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJs').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJson').and.callThrough();

      var engine = new Lisplate();
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }, {test: '"test"'}).then(function(out) {
        expect(out).toEqual('\\"test\\"');
        expect(Lisplate.Runtime.escapeHtml).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJs).toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJson).not.toHaveBeenCalled();
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });

    it('should allow user specified external escaper', function(done) {
      var src = '{data::test}';

      var escaper = jasmine.createSpy('escaper').and.callFake(function(str) {
        return 'custom escape';
      });

      var compiled = compiler.compile('test', src, {
        defaultEscape: 'helper::escaper'
      });
      var factory = Lisplate.Utils.loadCompiledSource(compiled);

      spyOn(Lisplate.Runtime, 'escapeHtml').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJs').and.callThrough();
      spyOn(Lisplate.Runtime, 'escapeJson').and.callThrough();

      var engine = new Lisplate();
      engine.addHelper('escaper', escaper);
      engine.renderTemplate({
        templateName: 'test',
        renderFactory: factory
      }, {test: '<"test">'}).then(function(out) {
        expect(out).toEqual('custom escape');
        expect(Lisplate.Runtime.escapeHtml).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJs).not.toHaveBeenCalled();
        expect(Lisplate.Runtime.escapeJson).not.toHaveBeenCalled();
        done();
      }).catch(function(err) {
        done.fail('Did not expect catch to be called ' + err);
      });
    });
  });

  describe('compileModule', function() {
    it('should support falsey wrapper to return without wrap', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src, {
        wrapper: false
      });
      expect(out).toEqual(test);
    });

    it('should default to umd wrap', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src);
      expect(out).not.toEqual(src);
      expect(out).not.toEqual(test);
    });

    it('should support umd wrapper', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src, {wrapper: 'umd'});
      expect(out).not.toEqual(src);
      expect(out).not.toEqual(test);
    });

    it('should support amd wrapper', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src, {wrapper: 'amd'});
      expect(out).not.toEqual(src);
      expect(out).not.toEqual(test);
    });

    it('should support commonjs wrapper', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src, {wrapper: 'commonjs'});
      expect(out).not.toEqual(src);
      expect(out).not.toEqual(test);
    });

    it('should support es6 wrapper', function() {
      var src = 'test';
      var test = compiler.compile('test', src);
      var out = compiler.compileModule('test', src, {wrapper: 'es6'});
      expect(out).not.toEqual(src);
      expect(out).not.toEqual(test);
    });

    it('should error if unsupport wrapper', function() {
      var src = 'test';
      expect(function() {
        compiler.compileModule('test', src, {wrapper: '**invalid**'});
      }).toThrowError();
    });
  });

});
