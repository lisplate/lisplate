(function(root, factory) {
  if (typeof define === 'function' && define.amd && define.amd.dust === true) {
    define('lisplate.compiler', [], factory);
  } else if (typeof exports === 'object') {
    // in Node, require this file if we want to use the compiler as a standalone module
    module.exports = factory();
  } else {
    // in the browser, store the factory output if we want to use the compiler directly
    root.lisplateCompiler = factory();
  }
}(this, function() {
  return function() {
    throw new Error('Compiler is not in the core build');
  }
}));
