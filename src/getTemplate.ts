/**
 * @file 获取 webpack 模板
 */

/**
 *
 * @param {*} options
 * @param {*} templateOptions
 */
export default function getTemplate(options, templateOptions) {
  return getTemplateFunction(options)(options, templateOptions);
}

export function getChunkTemplate(chunk, options, templateOptions) {
  function fallback(chunk, options) {
    return [
      '/******/' + options.outputJsonpFunction + '(' + chunk.realId + ',',
      ')',
    ];
  }

  let templateFunction = getTemplateFunction(options);
  templateFunction = (templateFunction && templateFunction.chunk) || fallback;
  return templateFunction(chunk, options, templateOptions);
};

function getTemplateFunction(options) {
  if (options.template) {
    if (typeof options.template === 'string') {
      return require(options.template);
    } else {
      return options.template;
    }
  } else {
    return require('./template/browser');
  }
}
