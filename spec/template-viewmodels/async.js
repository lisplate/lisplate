function Model() {
}
Model.prototype.showme = function() {
  return Promise.resolve('should show');
};
Model.prototype.iftest = function() {
  return Promise.resolve(true);
};
Model.prototype.eachtest = function() {
  return Promise.resolve(['a', 'b', 'c']);
};

module.exports = Model;
