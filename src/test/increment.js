var add = require('./math').add;

var increment = require('./example');

increment(3);

exports.increment = function(val) {
    return add(val, 1);
};