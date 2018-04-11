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


## 基本原理

虽然原理说起来很简单

> 从入口文件开始，分析每个文件里面的依赖，构建出一棵依赖树，最后将所有文件打包到一起。

### 构建依赖树

首先，对于`webpack`而言，所有的文件都是字符串。我们给定了一个入口文件如`example.js`，`webpack`会使用`fs`模块读取该文件，使用`esprima`做语法分析，并根据自己的规则（`parse.js`）生成特定的数据结构。

从这个语法分析的过程，就能够拿到`example.js`文件依赖什么文件、依赖的这个文件文件名、依赖的这个文件文件名在代码中的坐标。由此构建出的特定数据结构，能够用来精准描述`example.js`这个「模块」。

所有被`example.js`文件依赖的文件都经过这个分析后，构建依赖树的工作就完成了。

### 生成代码

接下来的工作就是将依赖树写入我们最终想生成的文件了。主要做的就是将我们写的文件名替换为`webpack`对这个文件的标志。

```javascript
var inc = require('./increment').increment;
var a = 1;
inc(a);
```

这么一段代码，实际会被替换为

```javascript
var inc = require(1).increment;
var a = 1;
inc(a);
```

因为`./increment`这个「模块」，在`webpack`内注册为了 1。

但问题在于，`webpack`是如何将`./increment`字符串替换为 1 呢？直接 `filecontent.replace('./increament', 1)` 这样吗？

实际上语法分析后能够得到`./increment`这个字符串所在的「位置」为`(18, 30)`，然后会将整个文件的`0-18`+`id`+`30-content.length`，就得到了想要的字符串。

