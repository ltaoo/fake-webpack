# 「抄代码」之 webpack

## 运行前

项目使用`ts`，为了简单，全局安装`ts-node`和`typescript`，使用`ts-node`替代`node`执行文件。

## 说明

### [v0.1.0](https://github.com/ltaoo/fake-webpack/tree/0.1.0)

完成了最简单的打包器，能够将`commonjs`规范的代码打包到一起。

### [v0.2.0](https://github.com/ltaoo/fake-webpack/tree/0.2.0)

支持`loader`，能够对样式文件进行打包。

### [v0.3.0](https://github.com/ltaoo/fake-webpack/tree/0.3.0)

doing - 代码分割。

### [v0.4.0](https://github.com/ltaoo/fake-webpack/tree/0.4.0)

doing - 代码懒加载。

### [v0.5.0](https://github.com/ltaoo/fake-webpack/tree/0.5.0)

doing - plugins

## chunks

即提取公共依赖到一个文件中，比如多页面应用。现在假设有`A`、`B`两个页面，代码分别为：

```js
// a page
const log = require('./log');
log('a page');
```

```js
// b page
const log = require('./log');
log('b page');
```

可以看到，两个页面都依赖`log.js`，所以可以将这个文件单独拿出来，而不是每个页面都打包进去。最终打包出来的文件，应该是

- a.bundle.js
- b.bundle.js
- common.bundle.js

懒加载和`chunks`有区别吗？

## 需要注意的点

`require.ensure`被替换为了`require.e`。

`require.ensure([], xxx)`被替换为了`require.e(1, xxx)`，这个 1，是实际`require`的模块`id`