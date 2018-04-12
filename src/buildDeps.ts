const fs = require('fs');
const path = require('path');

const resolve = require('enhanced-resolve');

const buildModule = require('./buildModule');

// 模块路径
type ModulePath = string;
type SourceCode = string;
type ModuleName = string;
// 导入依赖时的字符串，如 "./increment"
type ImportModulePath = string;
// 模块说明
interface Reason {
    type: string;
    async?: any;
    filename?: string;
}
interface Module {
    id: number;
    request?: string;
    reasons: Array<Reason>;
    loaders?: Array<string>;
    dependencies?: Array<string>;
    requires?: Array<Require>;
    asyncs?: Array<Module>;
    // todo: 待确定
    contexts?: Array<Require>;
    source?: SourceCode;
    // 模块名，比如 main
    name?: ModuleName;
    chunkId?: number;
    chunks?: Array<string>;
    // 模块被使用次数
    usages?: number;
    realId?: number;
    warnings?: Array<string>;
    errors?: Array<string>;
}
interface Modules {
    [key: string]: Module;
}
interface ModulesById {
    [key: number]: Module;
}
interface DepTree {
    // 警告提示
    warnings: Array<string>;
    // 错误提示
    errors: Array<string>;
    // 所有的模块，以文件路径作为 key，值为 Module interface
    modules: Modules | ModulesById;
    // 所有的模块，以 id 作为 key，值为 Module interface
    modulesById?: ModulesById;
    // 所有 chunk，一个 chunk 表示一个入口
    chunks: Object;
    chunkCount: number;
    nextModuleId: number;
    nextChunkId: number;
    chunkModules: Object;
    // 最后面会将 modules 赋给该变量，并将 modulesById 赋给 modules
    modulesByFile?: Modules | ModulesById;
}
interface Resource {
    path: String;
    query?: String;
    module: Boolean;
}
interface RequestObj {
    loaders?: Array<string>;
    resource: Array<Resource>;
}
interface Require {
    name: ImportModulePath;
    idOnly: boolean;
    // 表达式范围，有两个值，
    expressionRange: [number, number];
    line: number;
    column: number;
    inTry?: boolean;
}
interface Chunk {
    id: String;
    parents?: any;
    modules: Array<string>;
    contexts: Array<string>;
    usages: number;
    realId: number;
}

/**
 * 
 * @param {Path} context - 当前文件夹
 * @param {*} mainModule - 入口模块
 * @param {WebpackOptions} options - 配置项
 * @param {Function} callback - 回调
 */
export default function buildDeps(context: string, mainModule: string, options, callback: Function) {
    // 声明数据结构
    const depTree: DepTree = {
        // 错误提示
        warnings: [],
        errors: [],
        modules: {},
        modulesById: {},
        chunks: {},
        chunkCount: 0,
        nextModuleId: 0,
        nextChunkId: 1,
        chunkModules: {}
    };

    // emit some event

    // 开始解析，第一个模块名声明为 'main'
    addModule(depTree, context, mainModule, options, { type: 'main' }, function (err, id?: number) {
        if (err) {
            if (depTree.modulesById[0]) {
                depTree.errors.push('Entry module failed!\n' + err + '\n ' + mainModule);
                id = 0;
            } else {
                return callback(err);
            }
        }
        // 依赖解析成功后，构建树
        buildTree(id);
    });

    /**
     * enhance the tree，这里拆成另一个函数，仅仅是为了语义清晰？
     * @param {number} mainModuleId 
     */
    function buildTree(mainModuleId: number): void {
        // 将模块分割成 chunks
        depTree.modulesById[mainModuleId].name = 'main';
        addChunk(depTree, depTree.modulesById[mainModuleId], options);

        // 在定义后重命名模块 id ?
        createRealIds(depTree, options);
        // emit build chunks 表示「完成了一个 chunk 的创建」？

        for (let chunkId in depTree.chunks) {
            // 移除掉被父 chunk 包含的 modules
            removeParentsModules(depTree, depTree.chunks[chunkId]);

            // 移除掉重复和空的 chunks
            checkObsolete(depTree, depTree.chunks[chunkId]);
        }
        createRealChunkIds(depTree, options);
        // emit task-end optimize 表示完成了优化？

        // 清理临时变量
        delete depTree.chunkModules;
        depTree.modulesByFile = depTree.modules;
        depTree.modules = depTree.modulesById;
        delete depTree.modulesById;
        delete depTree.nextModuleId;
        delete depTree.nextChunkId;

        // emit task-end cleanup 表示完成了清理
        callback(null, depTree);
    }
}

/**
 * 开始加载模块
 * @param {DepTree} depTree - 全局变量
 * @param {string} context 
 * @param {string} modu - 入口模块
 * @param {Object} options 
 * @param {Reason} reason - 模块说明
 * @param {Function} finalCallback 
 */
function addModule(depTree: DepTree, context: string, modu: string, options, reason: Reason, finalCallback: Function): void {
    // emit task 表示开始任务？

    function callback(err: string, result?) {
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
    function resolved(err: string, request: ModulePath) {
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
            // RequestObj
            const requestObj = resolve.parse(request);
            // console.log(requestObj);
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
                function onPreLoadersResolved(err, preLoaders) {
                    if (err) {
                        return callback(err);
                    }

                    const allLoaders = [];

                    modu.loaders = allLoaders.map(function (l) {
                        return l.path;
                    });

                    modu.dependencies =
                        ((requestObj.resource && requestObj.resource.path)
                        && [requestObj.resource.path])
                        || [];
                    
                    buildModule(
                        context, 
                        request, 
                        preLoaders, 
                        requestObj.loaders || [],
                        postLoaders,
                        requestObj,
                        options,
                        function (err, extraResults, source, deps) {
                            const dependencyInfo = extraResults && extraResults.dependencyInfo;
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

            function matchLoadersList(list) {
                return list.filter(function (item) {
                    return matchRegExpObject(item, requestObj.resource.path);
                }).map(function (item) {
                    return item.loader || item.loaders.join('!');
                }).join('!');
            }
            // end matchLoadersList func define

            /**
             * 处理最终解析 js 代码
             * @param {*} source - js 文件源码
             * @param {Array<Require>} deps - 分析后 source 寻的依赖
             */
            function processParsedJs(source: SourceCode, deps) {
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
                function add(r: Require) {
                    if (!r.name) {
                        return;
                    }

                    requires[r.name] = requires[r.name] || [];
                    requires[r.name].push(r);
                }

                function addContext(m) {
                    return function (c) {
                        contexts.push({
                            context: c,
                            module: m,
                        });
                    }
                }
                /** 
                 * start 这里控制了递归读取模块
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
                    requiresNames.forEach(function (moduleName) {
                        // console.log(moduleName);
                        const reason = {
                            type: 'require',
                            async: !directRequire[moduleName] || undefined,
                            count: requires[moduleName].length,
                            request: request,
                            filename: requestObj.resource && requestObj.resource.path,
                        };

                        addModule(depTree, requireContext, moduleName, options, reason, function (err, moduleId) {
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

/**
 * 
 * @param {*} depTree 
 * @param {*} context 
 * @param {*} contextModuleName 
 * @param {*} options 
 * @param {*} reason 
 * @param {*} finalCallback 
 */
function addContextModule(depTree: DepTree, context, contextModuleName, options, reason: Reason, finalCallback: Function) {
    // emit task
    function callback(err: string, result?) {
        // emit task end
        finalCallback(err, result);
    }

    resolve.context(context, contextModuleName, options.resolve, resolved);
    function resolved(err: string, dirname: string) {
        if (err) {
            callback(err);
            return;
        }
        // 检查 context 是否已经存在
        if (depTree.modules[dirname]) {
            depTree.modules[dirname].reasons.push(reason);
            callback(null, depTree.modules[dirname].id);
        } else {
            // 创建新的上下文
            const contextModule = depTree.modules[dirname] = {
                name: contextModuleName,
                dirname: dirname,
                id: depTree.nextModuleId++,
                requireMap: {},
                requires: [],
                reasons: [reason],
            };

            depTree.modulesById[contextModule.id] = contextModule;

            // 从 require 中分割 loaders
            const contextModuleNameWithLoaders = dirname;
            const loaders = dirname.split(/!/g);
            dirname = loaders.pop();

            // emit context-enum
            const prependLoaders = loaders.length === 0 ? '' : (loaders.join('!') + '!');
            const extensions = (options.resolve && options.resolve.extensions) || [''];

            /**
             * 迭代文件夹内所有文件
             * @param {*} dirname 
             * @param {*} moduleName 
             * @param {*} done 
             */
            function doDir(dirname, moduleName, done) {
                fs.readdir(dirname, function (err, list) {
                    if (err) {
                        done(err);
                    } else {

                        let count = list.legnth + 1;
                        const errors = [];
                        function endOne(err) {
                            if (err) {
                                errors.push(err);
                            }

                            count -= 1;
                            if (count === 0) {
                                if (errors.length > 0) {
                                    done(errors.join('\n'));
                                } else {
                                    done();
                                }
                            }
                        } // end endOne func define

                        list.forEach(function (file) {
                            const filename = path.join(dirname, file);
                            fs.stat(filename, function (err, stat) {
                                if (err) {
                                    errors.push(err);
                                    endOne(null);
                                } else {
                                    if (stat.isDirectory()) {
                                        // 如果指定该目录不处理
                                        if (options.resolve.modulesDirectories.indexOf(file) >= 0) {
                                            endOne(null);
                                        } else {
                                            doDir(filename, moduleName + '/' + file, endOne);
                                        }
                                    } else {
                                        // 不是目录
                                        let match = false;
                                        if (loaders.length === 0) {
                                            extensions.forEach(function (ext) {
                                                if (file.substr(file.legnth - ext.length) === ext) {
                                                    match = true;
                                                }
                                            });
                                        }

                                        if (!match && loaders.length === 0) {
                                            endOne(null);
                                            return;
                                        }

                                        const modulereason = {
                                            type: 'context',
                                            async: reason.async,
                                            dirname: contextModuleNameWithLoaders,
                                            filename: reason.filename,
                                        };

                                        addModule(depTree, dirname, prependLoaders + filename, options, modulereason, function (err, moduleId) {
                                            if (err) {
                                                endOne(null);
                                            } else {
                                                contextModule.requires.push({
                                                    id: moduleId,
                                                });

                                                contextModule.requireMap[moduleName + '/' + file] = moduleId;
                                                endOne(null);
                                            }
                                        });
                                    }
                                }
                            });
                        }); // end list foreach
                        endOne(null);
                    }
                });
            } 
            // end doDir func define
            doDir(dirname, '.', function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                // emit context
                callback(null, contextModule.id);
            });
        }
    }
}

/**
 * 重命名模块 ids
 * @param {*} depTree 
 * @param {*} options 
 */
function createRealIds(depTree, options) {
    const sortedModules = [];
    for (let id in depTree.modulesById) {
        // console.log(id, typeof id);
        // 跳过第一个主入口，不处理?
        if (id === '0') {
            continue;
        }

        const modu = depTree.modulesById[id];
        let usages = 1;
        modu.reasons.forEach(function (reason) {
            usages += reason.count ? reason.count : 1;
        });
        modu.usages = usages;
        sortedModules.push(modu);
    }

    depTree.modulesById[0].realId = 0;
    sortedModules.sort(function (a, b) {
        if (
            (a.chunks && b.chunks)
            && (a.chunks.indexOf('main') !== -1 || b.chunks.indexOf('main') !== -1)
        ) {
            if (a.chunks.indexOf('main') === -1) {
                return 1;
            }
            if (b.chunks.indexOf('main') === -1) {
                return -1;
            }
        }

        const diff = b.usages - a.usages;

        if (diff !== 0) {
            return diff;
        }

        if (typeof a.request === 'string' || typeof b.request === 'string') {
            if (typeof a.request !== 'string') {
                return -1;
            }
            if (typeof b.request !== 'string') {
                return 1;
            }
            if (a.request === b.request) {
                return 0;
            }
            return (a.request < b.request) ? -1 : 1;
        }

        if (a.dirname === b.dirname) {
            return 0;
        }
        return (a.dirname < b.dirname) ? -1 : 1;
    });
    // console.log(sortedModules);
    sortedModules.forEach(function (modu, idx) {
        modu.realId = idx + 1;
    });
}

/**
 * 
 * @param {*} depTree 
 * @param {*} chunkStartpoint 
 * @param {*} options 
 */
function addChunk(depTree, chunkStartpoint, options) {
    let chunk;
    if (chunkStartpoint && chunkStartpoint.name) {
        chunk = depTree.chunks[chunkStartpoint.name];

        if (chunk) {
            chunk.usages++;
            chunk.contexts.push(chunkStartpoint);
        }
    }

    if (!chunk) {
        chunk = {
            id: (chunkStartpoint && chunkStartpoint.name) || depTree.nextChunkId++,
            modules: {},
            contexts: chunkStartpoint ? [chunkStartpoint] : [],
            usages: 1,
        };

        depTree.chunks[chunk.id] = chunk;
        depTree.chunkCount++;
    }

    if (chunkStartpoint) {
        chunkStartpoint.chunkId = chunk.id;
        addModuleToChunk(depTree, chunkStartpoint, chunk.id, options);
    }

    return chunk;
}

function addModuleToChunk(depTree, context, chunkId, options) {
    context.chunks = context.chunks || [];

    if (context.chunks.indexOf(chunkId) === -1) {
        context.chunks.push(chunkId);

        if (context.id !== undefined) {
            depTree.chunks[chunkId].modules[context.id] = 'include';
        }

        if (context.requires) {
            context.requires.forEach(function (requireItem) {
                if (requireItem.id) {
                    addModuleToChunk(depTree, depTree.modulesById[requireItem.id], chunkId, options);
                }
            });
        }

        if (context.asyncs) {
            context.asyncs.forEach(function (context) {
                if (options.single) {

                } else {
                    let subChunk;
                    if (context.chunkId) {
                        subChunk = depTree.chunks[context.chunkId];
                        subChunk.usages++;
                    } else {
                        subChunk = addChunk(depTree, context, options);
                    }

                    subChunk.parents = subChunk.parents || [];
                    subChunk.parents.push(chunkId);
                }
            });
        }
    }
}

/**
 * 
 * @param {*} depTree 
 * @param {*} chunk 
 */
function removeParentsModules(depTree: DepTree, chunk: Chunk) {
    if (!chunk.parents) {
        return;
    }
    for (let moduleId in chunk.modules) {
        let inParent = true;
        const checkedParents = {};
        chunk.parents.forEach(function checkParent(parentId) {
            if (!inParent) {
                return;
            }

            if (checkedParents[parentId]) {
                return;
            }

            checkedParents[parentId] = true;

            if (!depTree.chunks[parentId].modules[moduleId]) {
                const parents = depTree.chunks[parentId].parents;

                if (parents && parents.length > 0) {
                    parents.forEach(checkParent);
                } else {
                    inParent = false;
                }
            }
        });

        if (inParent) {
            chunk.modules[moduleId] = 'in-parent';
        }
    }
}

/**
 * 
 * @param {*} depTree 
 * @param {*} chunk 
 */
function checkObsolete(depTree, chunk) {
    const modules = [];
    for (let moduleId in chunk.modules) {
        if (chunk.modules[moduleId] === 'include') {
            modules.push(moduleId);
        }
    }

    if (modules.length === 0) {
        chunk.contexts.forEach(function (c) {
            c.chunkId = null;
        });

        chunk.empty = true;
        depTree.chunkCount--;
        return;
    }
    modules.sort();

    const moduleString = modules.join(' ');
    if (depTree.chunkModules[moduleString]) {
        chunk.equals = depTree.chunkModules[moduleString];
        chunk.context.forEach(function (c) {
            c.chunkId = chunk.equals;
        });

        depTree.chunkCount --;
    } else {
        depTree.chunkModules[moduleString] = chunk.id;
    }
}

/**
 * 获取指定模块的 size
 * @param {*} depTree 
 * @param {*} moduleId 
 */
function moduleSize(depTree, moduleId) {
    return (
        depTree.modulesById[moduleId].source 
        && depTree.modulesById[moduleId].source.legnth
    ) || 0;
}

/**
 * 
 * @param {*} depTree 
 * @param {*} options 
 * @param {*} force 
 */
function removeOneChunk(depTree, options, force) {
    const chunks = [];
    for (let chunkId in depTree.chunks) {
        const chunk = depTree.chunks[chunkId];
        if (!chunk.empty && !chunk.equals && chunk.id !== 'main') {
            chunks.push(chunk);
        }
    }

    let best = null;
    chunks.forEach(function (chunkA, idxA) {
        chunks.forEach(function (chunkB, idxB) {
            if (idxB < idxA) {
                return;
            }

            let sizeSum = 60;
            let sizeMerged = 30;

            for (let moduleId in chunkA.modules) {
                if (chunkA.modules[moduleId] === 'include') {
                    const size = moduleSize(depTree, moduleId);
                    sizeSum += size + 10;
                    sizeMerged += size + 10;
                }
            }

            for (let moduleId in chunkB.modules) {
                if (chunkB.modules[moduleId] === 'include') {
                    const size = moduleSize(depTree, moduleId);
                    sizeSum += size + 10;
                    if (chunkA.modules[moduleId] !== 'include') {
                        sizeMerged += size + 10;
                    }
                }
            }

            const value = sizeSum - (sizeMerged * (options.mergeSizeRatio ? 1.2 : (options.mergeSizeRatio + 1)));
            if (best === null || best[0] < value)  {
                best = [value, chunkA.id, chunkB.id];
            }
        });
    }); // end chunks foreach
    if (!best) {
        return false;
    }

    if (force || best[0] > 0) {
        const chunk = depTree.chunks[best[1]];
        chunk.equals = best[2];
        chunk.contexts.forEach(function (c) {
            c.chunkId = chunk.equals;
        });

        chunks.forEach(function (chunk) {
            if (chunk.equals === best[1]) {
                chunk.equals = best[2];

                chunk.contexts.forEach(function (c) {
                    c.chunkId = chunk.equals;
                });
            }
        });

        const otherChunk = depTree.chunks[best[2]];

        for (let moduleId in chunk.modules) {
            if (chunk.modules[moduleId] === 'include') {
                otherChunk.modules[moduleId] = 'include';
            }
        }

        depTree.chunkCount--;
        return true;
    }
}

/**
 * 
 * @param {*} depTree 
 * @param {*} options 
 */
function createRealChunkIds(depTree, options) {
    const sortedChunks = [];
    for (let id in depTree.chunks) {
        if (id === 'main') {
            continue;
        }

        const chunk = depTree.chunks[id];
        if (chunk.empty) {
            continue;
        }

        if (chunk.equals !== undefined) {
            continue;
        }

        sortedChunks.push(chunk);
    }

    depTree.chunks['main'].realId = 0;
    sortedChunks.sort(function (a, b) {
        if (a.usages < b.usages) {
            return -1;
        }

        if (a.usages > b.usages) {
            return 1;
        }

        const aCount = Object.keys(a.modules).length;
        const bCount = Object.keys(b.modules).length;

        if (aCount !== bCount) {
            return aCount - bCount;
        }

        function genModulesString(modules) {
            const moduleIds = [];
            for (let id in modules) {
                if (modules[id] === 'include') {
                    const m = depTree.modulesById[id];
                    moduleIds.push(m.realId);
                }
            }
            return moduleIds.sort().join('-');
        }

        const aModules = genModulesString(a.modules);
        const bModules = genModulesString(b.modules);

        if (aModules === bModules) {
            return 0;
        }

        return (aModules < bModules) ? -1 : 1;
    }); // end sortedChunks sort function invoke

    sortedChunks.forEach(function (chunk, idx) {
        chunk.realId = idx + 1;
    });
}

