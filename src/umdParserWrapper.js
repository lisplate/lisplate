(function(root, factory) {
  if (typeof define === 'function' && define.amd && define.amd.dust === true) {
    define('lisplate.parser', [], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.lisplateParser = factory();
  }
}(this, function() {
  var parser = @@parser;

  return parser;
}));
