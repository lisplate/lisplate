(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.parser', ['lisplate.core'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('./'));
  } else {
    factory(root.Lisplate);
  }
}(this, function(Lisplate) {
  var parser = @@parser;

  Lisplate.Parser = parser;
  return parser;
}));
