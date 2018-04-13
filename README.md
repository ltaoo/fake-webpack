# 「抄代码」之 webpack

## 运行前

项目使用`ts`，为了简单，全局安装`ts-node`和`typescript`，使用`ts-node`替代`node`执行文件。

## 说明

### v0.1.0 

完成了最简单的打包器，能够将`commonjs`规范的代码打包到一起。

### v0.2.0

支持样式文件的打包。

## 支持 commonj

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

打包后的文件在`src/test/bundle.js`，构建的依赖树为`src/test/bundle.json`。

三个文件经过词法分析后得到的结果分别为：

```js
{
  overwrite: [],
  requires: [
    {
      name: './increment',
      idOnly: true,
      expressionRange: [18, 31],
      line: 1,
      column: 10,
    },
    { name: '__webpack_console', line: 4, column: 0, variable: 'console' },
  ],
};
```

```js
{
  overwrite: [],
  requires: [
    {
      name: './math',
      idOnly: true,
      expressionRange: [18, 26],
      line: 1,
      column: 10,
    },
  ],
};
```

```js
{ overwrite: [] };
```


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

## 源码

addModule -> resolve -> readFile -> buildModule -> fs.readfile -> execLoader -> execLoader -> execLoader -> processJs -> **parse** -> processParsedJs

if (requiresNames.length)  -> addModule

-> 

buildTree -> addChunk -> addModuleToChunk

### addModule

通过该函数，添加模块。从这里作为入口，将会递归调用`addModule`实现对所有的依赖处理。

### processParsedJs

处理经过语法分析后得到的特定结构，从这个结构中提取中文件的依赖。

## 支持 json

现在在代码中`require('./package.json')`，结果会是什么呢？如果要加载该文件，会在哪个步骤加载进来呢？

在`resolve`时(`addModule 26line`)，`enhanced-resolve`就会在`node_module`目录寻找`json-loader`依赖，并得到

`/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/json-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/src/test/loader/package.json`格式的`request`。

再借助`execLoaders`，读取文件并添加好`module.exports = `，就得到了源码。