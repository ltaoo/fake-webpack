# 「抄代码」之 webpack

## 支持 commonjs

现有三个文件：

```javascript
// example.js
var inc = require('./increment').increment;
var a = 1;
inc(a);
```

```javascript
// increment.js
var add = require('./math').add;
exports.increment = function(val) {
    return add(val, 1);
};
```

```javascript
// add.js
exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
```

现支持，以`example.js`为入口，通过命令：

```bash
node webpack example.js output.js
```

将生成一份`output.js`文件，该文件能够直接运行在浏览器中。
