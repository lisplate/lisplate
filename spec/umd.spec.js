var utils = require('../lib/util');
var runtime = require('../lib/runtime');
var Lisplate = require('../lib/index');
var parser = require('../lib/parser');
var compiler = require('../lib/compiler');

var amdModules = {
  'lisplate.core': Lisplate,
  'lisplate.parser': parser,
  'lisplate.compiler': compiler,
  'lisplate.runtime': runtime,
  'lisplate.utils': utils
};
var globalModules = {
  'Lisplate': Lisplate,
};

var fs = require('fs');
var vm = require('vm');

var covKey = Object.keys(global).find(function(k) {
  return k.length > 8 &&
    k.substring(0, 6) === '$$cov_' &&
    k.substring(k.length-2) === '$$';
});
var isIstanbul = !!covKey;

var istanbul = require('istanbul');
var instrumenter = new istanbul.Instrumenter();

function runTest(filename, isAmd) {
  var path = require.resolve('../lib/' + filename);
  var src = fs.readFileSync(path, 'utf8');
  if (isIstanbul) {
    src = instrumenter.instrumentSync(src);
  }

  var ctx = {};
  if (isAmd) {
    var define = jasmine.createSpy('define').and.callFake(function(name, reqs, factory) {
      var args = reqs.map(function(r) {
        return amdModules[r];
      });
      factory.apply(null, args);
    });
    define.amd = true;

    ctx.define = define;
  } else {
    ctx.Lisplate = Lisplate;
  }

  vm.runInNewContext(src, ctx, {
    filename: filename + '.js'
  });

  if (isIstanbul) {
    var coverageReport = ctx.__coverage__[Object.keys(ctx.__coverage__)[0]];
    var globalCoverage = global[covKey][path];

    if (coverageReport && globalCoverage) {
      Object.keys(globalCoverage.f).forEach(function(k) {
        globalCoverage.f[k] += coverageReport.f[k];
      });
      Object.keys(globalCoverage.s).forEach(function(k) {
        globalCoverage.s[k] += coverageReport.s[k];
      });
      Object.keys(globalCoverage.b).forEach(function(k) {
        globalCoverage.b[k] = globalCoverage.b[k].map(function(v, i) {
          return v + coverageReport.b[k][i];
        });
      });
    }
  }

  if (isAmd) {
    expect(define).toHaveBeenCalled();
  }
}

var umdFiles = ['compiler', 'parser', 'index', 'runtime', 'util'];

describe('Verify UMD:', function() {

  umdFiles.forEach(function(f) {
    describe(f, function() {
      it('should support AMD', function() {
        runTest(f, true);
      });
      it('should support global for browsers', function() {
        runTest(f, false);
      });
    });
  });

});
