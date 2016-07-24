module.exports = {
  v: 'SHOULD SHOW|should not show|should not show',
  fn1: function(p) {
    return p.split('|');
  },
  fn2: function(p) {
    return p[0];
  },
  fn3: function(p) {
    return p.toLowerCase();
  },

  getkey1: function(p) {
    return p.key1;
  },

  js: 'var js = "test<br>";'
};
