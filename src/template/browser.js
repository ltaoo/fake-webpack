module.exports = function(options, templateOptions) {
    // 如果多个，就异步模板？
  if (templateOptions.chunks) {
    return require('fs').readFileSync(
      require('path').join(__dirname, 'browserAsync.js'),
    );
  } else {
      // 简单情况下是这个
    return require('fs').readFileSync(
      require('path').join(__dirname, 'browserSingle.js'),
    );
  }
};
