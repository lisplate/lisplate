module.exports.resolve = function _resolve(item) {
  if (typeof item === 'function') {
    return item();
  } else {
    return item;
  }
};

module.exports.thenable = function _thenable(item) {
  return typeof item === 'object' && typeof item.then === 'function';
};
