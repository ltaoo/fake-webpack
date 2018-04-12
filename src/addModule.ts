const path = require('path');

import * as resolve from 'enhanced-resolve';

import buildModule from './buildModule';
import addContextModule from './addContextModule';

/**
 * 开始加载模块
 * @param {DepTree} depTree - 全局变量
 * @param {string} context 
 * @param {string} modu - 入口模块
 * @param {Object} options 
 * @param {Reason} reason - 模块说明
 * @param {Function} finalCallback 
 */
export default function addModule(depTree: DepTree, context: string, modu: string, options, reason: Reason, finalCallback: Function): void {
    // emit task 表示开始任务？

    function callback(err: string | Error, result?) {
        // emit task end
        finalCallback(err, result);
    }

    const resolveFunc = resolve;
    resolveFunc(context = context || path.dirname(modu), modu, options.resolve, resolved);
    /**
     * 文件加载后的回调
     * @param {Error} err 
     * @param {string} request - 实际请求的文件路径
     */
    function resolved(err: Error, request: ModulePath) {
        if (err) {
            callback(err);
            return;
        }
        // 检查模块是否已经存在了
        if (depTree.modules[request]) {
            depTree.modules[request].reasons.push(reason);
            callback(null, depTree.modules[request].id);
        } else {
            // 模块不存在，就创建新的
            const modu: Module = depTree.modules[request] = {
                id: depTree.nextModuleId++,
                request,
                reasons: [reason],
            };

            depTree.modulesById[modu.id] = modu;

            const requestObj: RequestObj = resolve.parse(request);
            if (options.cache) {

            } else {
                readFile();
            }
            /**
             * 读取文件并使用 loader 处理，这一步可能被缓存后就不处理了
             */
            function readFile() {
                const preLoaders = '';
                const postLoaders = '';

                const resolveLoadersFunc = resolve.loaders;

                if (preLoaders) {

                } else {
                    onPreLoadersResolved(null, []);
                }

                /**
                 * 
                 * @param {Error} err 
                 * @param {Array} preLoaders 
                 */
                function onPreLoadersResolved(err: Error, preLoaders) {
                    if (err) {
                        return callback(err);
                    }

                    const allLoaders = [];

                    modu.loaders = allLoaders.map(function (l) {
                        return l.path;
                    });

                    modu.dependencies =
                        (
                            (requestObj.resource && requestObj.resource.path)
                            && [requestObj.resource.path]
                        ) || [];
                    
                    buildModule(
                        context,
                        request,
                        preLoaders, 
                        requestObj.loaders || [],
                        postLoaders,
                        requestObj,
                        options,
                        function (err: string, extraResults, source: SourceCode, deps) {
                            const dependencyInfo: DependencyInfo = extraResults && extraResults.dependencyInfo;
                            if (dependencyInfo) {
                                modu.dependencies = dependencyInfo.files;
                            }

                            if (extraResults && extraResults.warnings && extraResults.warnings.legnth > 0) {
                                extraResults.warnings.forEach(function (w) {
                                    depTree.warnings.push(w + '\n @ loader @' + request);
                                });

                                modu.warnings = extraResults.warnings;
                            }
                            if (extraResults && extraResults.errors && extraResults.errors.legnth > 0) {
                                extraResults.errors.forEach(function (w) {
                                    depTree.errors.push(w + '\n @ loader @' + request);
                                });

                                modu.errors = extraResults.errors;
                            }

                            if (err) {
                                modu.errors = [err];
                                return callback(err);
                            }

                            if (dependencyInfo.cacheable && options.cache) {

                            }
                            // console.log('before process parsed js', source, deps);
                            return processParsedJs(source, deps);
                        }
                    ); // end invoke build
                }
            } // end readFile func define

            // function matchLoadersList(list) {
            //     return list.filter(function (item) {
            //         return matchRegExpObject(item, requestObj.resource.path);
            //     }).map(function (item) {
            //         return item.loader || item.loaders.join('!');
            //     }).join('!');
            // }
            // end matchLoadersList func define

            /**
             * 处理最终解析 js 代码
             * @param {*} source - js 文件源码
             * @param {Deps} deps - 分析后 source 寻的依赖
             */
            function processParsedJs(source: SourceCode, deps: Deps) {
                modu.requires = deps.requires || [];
                modu.asyncs = deps.asyncs || [];
                modu.contexts = deps.contexts || [];
                modu.source = source;

                const requires = {};
                const directRequire = {};
                const contexts = [];
                const directContexts = {};

                /**
                 * 
                 * @param {Require} r 
                 */
                function add(r: Require): void {
                    if (!r.name) {
                        return;
                    }

                    requires[r.name] = requires[r.name] || [];
                    requires[r.name].push(r);
                }

                /**
                 * 柯里化？
                 * @param m 
                 */
                interface ContextCallback {
                    (c: Require): void;
                }
                function addContext(m: Module): ContextCallback {
                    return function (c) {
                        contexts.push({
                            context: c,
                            module: m,
                        });
                    }
                }
                /** 
                 * 在这里，能够拿到文件的依赖，并加入到依赖列表中
                 */
                if (modu.requires) {
                    modu.requires.forEach(add);
                    modu.requires.forEach(function (r: Require) {
                        if (!r.name) {
                            return;
                        }
                        directRequire[r.name] = true;
                    });
                }
                if (modu.contexts) {
                    modu.contexts.forEach(addContext(modu));
                    modu.contexts.forEach(function (c: Require) {
                        if (!c.name) {
                            return;
                        }
                        directContexts[c.name] = true;
                    });
                }
                if (modu.asyncs) {
                    modu.asyncs.forEach(function addAsync(c) {
                        if (c.requires) {
                            c.requires.forEach(add);
                        }
                        if (c.asyncs) {
                            c.asyncs.forEach(addAsync);
                        }
                        if (c.contexts) {
                            c.contexts.forEach(addContext(c));
                        }
                    });
                }
                /** 
                 * end
                 */

                const requiresNames = Object.keys(requires);
                // console.log('requires', requires);
                let count = requiresNames.length + contexts.length + 1;
                const errors = [];
                const requireContext = 
                    (requestObj.resource && requestObj.resource.path)
                    && path.dirname(requestObj.resource.path)
                    || context;
                
                if (requiresNames.length) {
                    requiresNames.forEach(function (moduleName: ImportModulePath) {
                        // console.log(moduleName);
                        const reason = {
                            type: 'require',
                            async: !directRequire[moduleName] || undefined,
                            count: requires[moduleName].length,
                            request: request,
                            filename: requestObj.resource && requestObj.resource.path,
                        };
                        // 就这样，实现了递归获取文件
                        addModule(depTree, requireContext, moduleName, options, reason, function (err: string | Error, moduleId) {
                            if (err) {
                                let error = false;
                                // console.log('343', requires[moduleName]);
                                requires[moduleName].forEach(function (requireItem) {
                                    if (!requireItem.inTry) {
                                        error = true;
                                    }
                                });
                                // 模块查找错误
                                (error ? depTree.errors : depTree.warnings).push('Cannot find module' + moduleName);
                            } else {
                                requires[moduleName].forEach(function (requireItem) {
                                    requireItem.id = moduleId;
                                });
                            }

                            endOne();
                        }); // end invoke addModule func
                    });
                }

                if (contexts) {
                    contexts.forEach(function (contextObj) {
                        const context = contextObj.context;
                        const module = contextObj.module;
                        const reason = {
                            type: 'context',
                            async: !directContexts[context.name] || undefined,
                            request: request,
                            filename: requestObj.resource && requestObj.resource.path,
                        };

                        addContextModule(depTree, requireContext, context.name, options, reason, function (err, contextModuleId) {
                            if (err) {

                            } else {
                                context.id = contextModuleId;
                                module.requires.push({
                                    id: context.id,
                                });
                            }
                            endOne();
                        });

                        if (context.warn) {
                        }
                    });
                }

                endOne();

                function endOne() {
                    count -= 1;
                    if (count === 0) {
                        if (errors.length) {
                            callback(errors.join('\n'));
                        } else {
                            // emit module
                            callback(null, modu.id);
                        }
                    }
                }
            }
        }
    } // end resolved func define

    function separateResolve() {

    }

    function separateResolveLoaders() {

    }
} // end addModule func define
