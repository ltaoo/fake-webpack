var inc = require('./increment').increment;
var a = 1;
const res = inc(a);
console.log(res);

module.increment = inc;
