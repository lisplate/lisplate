(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.utils', [], factory);
  } else if (typeof exports === 'object') {
    // in Node, require this file if we want to use the compiler as a standalone module
    module.exports = factory();
  } else {
    // in the browser, store the factory output if we want to use the compiler directly
    root.lisplateUtils = factory();
  }
}(this, function() {
  'use strict';

  return {
    resolve: function _resolve(item) {
      if (typeof item === 'function') {
        return item();
      } else {
        return item;
      }
    },

    thenable: function _thenable(item) {
      return (typeof item === 'object' || typeof item === 'function') && typeof item.then === 'function';
    }
  };
}));
