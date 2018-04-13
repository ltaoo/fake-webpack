/**
 * @file 将单个 js 文件的内容，提取并返回
 */
import * as path from 'path';

/** 
 * interface RequireItem {
 *  idOnly: Boolean;
 *  expressionRange?: Array<Number>;
 *  valueRange?: Array<Number>;
 *  line: Number;
 *  column: Number;
 *  inTry: Undefined;
 *  id: Number;
 *  brackets?: String;
 *  variable?: Boolean;
 *  requireFunction?: Function;
 *  moduleExports?: String;
 *  amdNameRange?: Array<Number>;
 * }
 */

/**
 * @param {Module} module 
 * @param {Object} options 
 * @param {Function} toRealId 
 * @param {Function} toRealChunkId 
 */
export default function writeSource (module: Module, options, toRealId: Function, toRealChunkId: Function) {
    let result;

    const modulePrepends = [];
    const moduleAppends = [];

    if (typeof module.source !== 'string') {
        // 如果源码不为字符串，尝试其他后缀名
        // if (module.requireMap) {
        //     const extensions = (
        //         (options.resolve && options.resolve.extensions)
        //         || ['', '.web.js', '.js']
        //     ).slice();

        //     const realRequireMap = {};
        //     const usedExtensions = [];
        //     Object.keys(module.requireMap).sort().forEach(function (file) {
        //         const realId = toRealId(module.requireMap[file]);
        //         if (!realId) {
        //             realId = realId + '';
        //         }

        //         realRequireMap[file] = realId;
        //         for (let i = 0, l = extensions.length; i < l; i += 1) {
        //             const ext = extensions[i];
        //             const idx = file.lastIndexOf(ext);

        //             if (idx >= 0 && (idx === (file.length - ext.length))) {
        //                 usedExtensions.push(ext);
        //                 extensions.splice(i, 1);
        //                 i -= 1;
        //             }
        //         }
        //     });

        //     const extensionsAccess = [];
        //     usedExtensions.forEach(function (ext) {
        //         if (ext === '') {
        //             extensionsAccess.push('map[name]');
        //         } else {
        //             extensionsAccess.push('map[name+' + JSON.stringify(ext) + ']');
        //         }
        //     });
        // }
    } else {
        // 正常情况
        let freeVars = {};
        // { from: 123, to: 125, value: '4' }
        const replaces = [];
        const shortenFilename = function (f) {
            return f;
        }

        if (module.dirname) {
        }
        if (module.filename) {
        }

        /**
         * 将模块名替换为 id
         * example: const add = require('./math');
         * 将会得到 { from: xx, to: xx, value: id } 这么一个对象，存入 replaces 数组
         * @param {*} requireItem 
         */
        function genReplaceRequire(requireItem: Require) {
            if (requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
                let prefix = '';
                if (requireItem.name && options.includeFilenames) {
                    prefix += '/*! ' + shortenFilename(requireItem.name) + '*/';
                }
                if (requireItem.expressionRange) {
                    replaces.push({
                        from: requireItem.expressionRange[0],
                        to: requireItem.expressionRange[1],
                        value: (
                            (
                                !requireItem.idOnly 
                                ? 'require(' 
                                : (requireItem.brackets ? '(' : '')
                            ) +
                            prefix +
                            toRealId(requireItem.id) +
                            (requireItem.idOnly && (!requireItem.brackets ? '' : ')')) +
                            (requireItem.append || '')
                        ),
                    });
                } else if (requireItem.valueRange) {
                    replaces.push({
                        from: requireItem.valueRange[0],
                        to: requireItem.valueRange[1],
                        value: prefix + toRealId(requireItem.id),
                    });

                    if (requireItem.deleteRange) {
                        replaces.push({
                            from: requireItem.deleteRange[0],
                            to: requireItem.deleteRange[1],
                            value: '',
                        });
                    }
                } else if (requireItem.variable) {
                    if (!freeVars[requireItem.variable]) {
                        freeVars[requireItem.variable] = requireItem;
                    }
                }
            } else if (requireItem.requireFunction) {
                // replaces.push({
                //     from: requireItem.expressionRange[0],
                //     to: requireItem.expressionRange[1],
                //     value: 'requiree',
                // });
            } else if (requireItem.moduleExports) {
                replaces.push({
                    from: requireItem.expressionRange[0],
                    to: requireItem.expressionRange[1],
                    value: 'module.exports',
                });
            }

            if (requireItem.amdNameRange) {

            }
        }

        /**
         * 生成上下文替换
         * example: 在源码中写 const add = require('./math');
         * 就会被替换为  const add = require(1);
         * @param {*} contextItem 
         */
        function genContextReplaces(contextItem: Require) {
            let postfix = '';
            let prefix = '';

            if (contextItem.name && options.includeFilenames) {
                prefix = '/*! ' + contextItem.name + ' */';
            }

            if (contextItem.require) {
                replaces.push({
                    from: contextItem.calleeRange[0],
                    to: contextItem.calleeRange[1],
                    value: 'require(' + prefix +
                    (
                        (
                            (contextItem.id && toRealId(contextItem.id))
                            || JSON.stringify('context: ' + contextItem.name || 'context failed')
                        ) +
                        ''
                    ) +
                    ')'
                });

                if (contextItem.replace) {
                    replaces.push({
                        from: contextItem.replace[0][0],
                        to: contextItem.replace[0][1],
                        value: JSON.stringify(contextItem.replace[1]),
                    });
                }
            // end contextItem.require if
            } else if (contextItem.valueRange) {
                replaces.push({
                    from: contextItem.valueRange[1] + 1,
                    to: contextItem.valueRange[1],
                    value: ')',
                });

                if (
                    contextItem.replace
                    && contextItem.valueRange[0] === contextItem.replace[0][0]
                ) {
                    replaces.push({
                        from: contextItem.replace[0][0],
                        to: contextItem.replace[0][1],
                        value: 'require(' + prefix +
                        (
                            (
                                (contextItem.id && toRealId(contextItem.id))
                                || JSON.stringify('context: ' + contextItem.name || 'context failed')
                            ) +
                            ''
                        ) +
                        ')(' +
                        JSON.stringify(contextItem.replace[1])
                    });
                } else {
                    replaces.push({
                        from: contextItem.replace[0][0],
                        // ???? -1
                        to: contextItem.replace[0]-1,
                        value: 'require(' + prefix +
                        (
                            (
                                (contextItem.id && toRealId(contextItem.id))
                                || JSON.stringify('context: ' + contextItem.name || 'context failed')
                            ) +
                            ''
                        ) +
                        ')('
                    });

                    if (contextItem.replace) {
                        replaces.push({
                            from: contextItem.replace[0][0],
                            to: contextItem.replace[0][1],
                            value: JSON.stringify(contextItem.replace[1]),
                        });
                    }
                }
            // end valueRange if
            } else if (contextItem.expressionRange) {
                replaces.push({
                    from: contextItem.expressionRange[0],
                    to: contextItem.expressionRange[1],
                    value: '(' + prefix +
                    (
                        (
                            (contextItem.id && toRealId(contextItem.id))
                            || JSON.stringify('context: ' + contextItem.name || 'context failed')
                        ) +
                        ''
                    ) + ')' + postfix,
                });

                if (contextItem.calleeRange) {
                    replaces.push({
                        from: contextItem.calleeRange[0],
                        to: contextItem.calleeRange[1],
                        value: 'require',
                    });
                }
            } // end expressionRange if
        } // end genContextReplaces func define
        // console.log('module', module);
        if (module.requires) {
            module.requires.forEach(genReplaceRequire)
        }
        if (module.contexts) {
            module.contexts.forEach(genContextReplaces);
        }

        // if (module.asyncs) {
        //     module.asyncs.forEach(function genReplaceAsync(asyncItem) {
        //         const oldFreeVars = freeVars;
        //         freeVars = {};
        //     });
        // }

        /**
         * 处理变量
         * @param blockRange 
         * @param freeVars 
         */
        // function genReplacesFreeVars(blockRange, freeVars) {
        //     const keys = Object.keys(freeVars);
        //     const values = [];
        //     const removeKeys = [];
        //     keys.forEach(function (key, idx) {
        //         if (freeVars[key].id === module.id) {
        //             removeKeys.push(idx);
        //         } else {
        //             values.push(freeVars[key]);
        //         }
        //     });

        //     removeKeys.reverse().forEach(function (idx) {
        //         keys.splice(idx, 1);
        //     });

        //     if (keys.length === 0) {
        //         return;
        //     }

        //     values.forEach(function (requireItem, idx) {
        //         if (requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
        //             let prefix = '';
        //             if (requireItem.name && options.includeFilenames) {
        //                 prefix += '/*! ' + prefix + toRealId(requireItem.id) + ')' + (requireItem.append || '');
        //             }
        //         }
        //     });

        //     const start = '/* WEBPACK FREE VAR INJECTION */ (function(' + keys.join(',') + ') {';
        //     const end = '/* WEBPACK FREE VAR INJECTION */ }(' + values.join(',') + '))';

        //     if (blockRange) {
        //         replaces.push({
        //             from: blockRange[0],
        //             to: blockRange[0]-1,
        //             value: start,
        //         });

        //         replaces.push({
        //             from: blockRange[1],
        //             to: blockRange[1]-1,
        //             value: end,
        //         });
        //     } else {
        //         modulePrepends.unshift('/******/ ' + start + '\n');
        //         moduleAppends.push('\n/******/ ' + end);
        //     }
        // }

        // genReplacesFreeVars(null, freeVars);
        replaces.sort(function (a, b) {
            return b.from - a.from;
        });
        const source = module.source;
        result = [source];
        replaces.forEach(function (repl) {
            // 把源码拿出来，根据 to 和 from 做切割，把 id 放进去
            const remSource = result.pop();
            result.push(
                remSource.substr(repl.to),
                repl.value,
                remSource.substr(0, repl.from),
            );
        });
        result = result.reverse().join('');
    } // end normal source case

    if (options.minimize) {

    } else {
        module.size = result ? result.length : 0;
    }

    const finalResult = [];
    finalResult.push.apply(finalResult, modulePrepends);
    finalResult.push(result);
    finalResult.push.apply(finalResult, moduleAppends);
    return finalResult.join('');
}
