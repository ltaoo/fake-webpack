import { readdir } from 'fs';

/**
 * @file 将单个 js 文件的内容，提取并返回
 */
const path = require('path');

module.exports = function (module, options, toRealId, toRealChunkId) {
    let result;

    if (typeof module.source !== 'string') {
        // 如果没有源码，尝试其他后缀名
        if (module.requireMap) {
            const extensions = (
                (options.resolve && options.resolve.extensions)
                || ['', '.web.js', '.js']
            ).slice();

            const realRequireMap = {};
            const usedExtensions = [];
            Object.keys(module.requireMap).sort().forEach(function (file) {
                const realId = toRealId(module.requireMap[file]);
                if (!realId) {
                    realId = realId + '';
                }

                realRequireMap[file] = realId;
                for (let i = 0, l = extensions.length; i < l; i += 1) {
                    const ext = extensions[i];
                    const idx = file.lastIndexOf(ext);

                    if (idx >= 0 && (idx === (file.length - ext.length))) {
                        usedExtensions.push(ext);
                        extensions.splice(i, 1);
                        i -= 1;
                    }
                }
            });

            const extensionsAccess = [];
            usedExtensions.forEach(function (ext) {
                if (ext === '') {
                    extensionsAccess.push('map[name]');
                } else {
                    extensionsAccess.push('map[name+' + JSON.stringify(ext) + ']');
                }
            });
            // doing...
        }
    } else {
        // 正常情况
        const freeVars = {};
        // { from: 123, to: 125, value: '4' }
        const replaces = [];
        const modulePrepends = [];
        const moduleAppends = [];
        const shortenFilename = function (f) {
            return f;
        }

        if (module.dirname) {
        }
        if (module.filename) {

        }

        function genReplaceRequire(requireItem) {
            if (requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
                const prefix = '';
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
                replaces.push({
                    from: requireItem.expressionRange[0],
                    to: requireItem.expressionRange[1],
                    value: 'require',
                });
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
         * 
         * @param {*} contextItem 
         */
        function genContextReplaces(contextItem) {
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
                    ) + ')' + postfix;
                });

                if (contextItem.calleeRange) {
                    replaces({
                        from: contextItem.calleeRange[0],
                        to: contextItem.calleeRange[1],
                        value: 'require',
                    });
                }
            } // end expressionRange if
        } // end genContextReplaces func define

        if (module.requires) {
            module.requires.forEach(genReplaceRequire)
        }
        if (module.contexts) {
            module.contexts.forEach(genContextReplaces);
        }

        if (module.asyncs) {
            module.asyncs.forEach(function genReplaceAsync(asyncItem) {
                const oldFreeVars = freeVars;
                // reset freeVars
                freeVars = {};
            });
        } // end module.asyncs if

        function genReplacesFreeVars(blockRange, freeVars) {
            const keys = Object.keys(freeVars);
            const values = [];
            const removeKeys = [];
            keys.forEach(function (key, idx) {
                if (freeVars[key].id === module.id) {
                    removeKeys.push(idx);
                } else {
                    values.push(freeVars[key]);
                }
            });

            removeKeys.reverse().forEach(function (idx) {
                keys.splice(idx, 1);
            });

            if (keys.length === 0) {
                return;
            }

            values.forEach(function (requireItem, idx) {
                if (requireItem.id !== undefined && toRealId(requireItem.id) !== undefined) {
                    let prefix = '';
                    if (requireItem.name && options.includeFilenames) {
                        prefix += '/*! ' + prefix + toRealId(requireItem.id) + ')' + (requireItem.append || '');
                    }
                }
            });

            const start = '/* WEBPACK FREE VAR INJECTION */ (function(' + keys.join(',') + ') {';
            const end = '/* WEBPACK FREE VAR INJECTION */ }(' + values.join(',') + '))';

            if (blockRange) {
                replaces.push({
                    from: blockRange[0],
                    from: blockRange[0]-1,
                    value: start,
                });

                replaces.push({
                    from: blockRange[1],
                    from: blockRange[1]-1,
                    value: end,
                });
            } else {
                modulePrepends.unshift('/******/ ' + start + '\n');
                moduleAppends.push('\n/******/ ' + end);
            }
        } // end genReplacesFreeVars func define

        genReplacesFreeVars(null, freeVars);
        replaces.sort(function (a, b) {
            return b.from - a.from;
        });

        const source = module.source;
        result = [source];
        replaces.forEach(function (repl) {
            const remSource = result.pop();
            result.push(
                remSource.substr(repl.to + 1),
                repl.value,
                remSource.substr(0, repl.from),
            );
        });

        result = result.reverse().join('');
    } // end normal source case

    if (options.minimize) {

    } else {
        module.size = result.length;
    }

    const finalResult = [];
    finalResult.push.apply(finalResult, modulePrepends);
    finalResult.push(result);
    finalResult.push.apply(finalResult, moduleAppends);
    return finalResult.join('');
}