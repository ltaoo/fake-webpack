# 「抄代码」之 webpack

## 运行前

项目使用`ts`，为了简单，全局安装`ts-node`和`typescript`，使用`ts-node`替代`node`执行文件。

## 说明

### [v0.1.0](https://github.com/ltaoo/fake-webpack/tree/0.1.0)

完成了最简单的打包器，能够将`commonjs`规范的代码打包到一起。

### [v0.2.0](https://github.com/ltaoo/fake-webpack/tree/0.2.0)

支持`loader`，能够对样式文件进行打包。

## 支持 json

现在在代码中`require('./package.json')`，结果会是什么呢？如果要加载该文件，会在哪个步骤加载进来呢？

在`resolve`时(`addModule 26line`)，`enhanced-resolve`就会在`node_module`目录寻找`json-loader`依赖，并得到

`/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/json-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/src/test/loader/package.json`格式的`request`。

再借助`execLoaders`，读取文件并添加好`module.exports = `，就得到了源码。

### json-loader

```js
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(source) {
	this.cacheable && this.cacheable();
	var value = JSON.parse(source);
	this.values = [value];
	return "module.exports = " + JSON.stringify(value, undefined, "\t");
}
module.exports.seperable = true;
```


## css 文件处理

比如样式文件，首先从`index.js`中解析出了依赖`index.css`，那么`index.js`模块的`requests`字段，就有了`index.css`。于是继续`addModule`，在`resolve`文件名时，会拿到「正确的」的路径，比如这里就是

```js
/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/style-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/css-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/src/test/loader/index.css
```

于是在`buildModule`中，就会使用`loader`来处理这个文件，具体是在`execLoaders`中处理的。

### execLoaders

首先传入的是很长的路径，然后会先使用`css-loader`进行处理，即直接执行`loader`，于是返回了

```js
module.exports = "body { background : #ccc; }"
```

由于有两个`loader`，所以在`css-loader`处理完成后，还会继续使用`style-loader`处理，返回结果变成了

```js
require("/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/style-loader/addStyle")(require("/Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/css-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/src/test/loader/index.css"))
```

### buildModule

此时，在`buildModule`的最后面，就是用`parse`对源文件内容进行语法解析，这里就是对上面`style-loader`返回的内容做解析，可以解析出`index.css`依赖两个模块

- /Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/style-loader/addStyle
- /Users/ltaoo/Documents/nodejs/fake-webpack/node_modules/css-loader/index.js!/Users/ltaoo/Documents/nodejs/fake-webpack/src/test/loader/index.css 


于是继续`addModule`。