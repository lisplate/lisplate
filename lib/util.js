(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('lisplate.utils', [], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Lisplate = {};
    root.Lisplate.Utils = factory();
  }
}(this, function() {
  'use strict';

  return {
    loadCompiledSource: function loadCompiledSource(compiledSource) {
      var template = null;
      eval('template=' + compiledSource);
      return template;
    },

    resolve: function resolve(item) {
      if (typeof item === 'function') {
        return item();
      } else {
        return item;
      }
    },

    thenable: function thenable(item) {
      return (typeof item === 'object' || typeof item === 'function') && typeof item.then === 'function';
    }
  };
}));
