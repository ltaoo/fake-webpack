var inc = require('./increment').increment;
require('./package.json');

var a = 1;
const res = inc(a);
console.log(res);