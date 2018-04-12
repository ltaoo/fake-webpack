const fs = require('fs');
const path = require('path');

const resolve = require('enhanced-resolve');

import addModule from './addModule';

/**
 * 构建依赖树
 * @param {Path} context - 当前文件夹
 * @param {*} mainModule - 入口模块
 * @param {WebpackOptions} options - 配置项
 * @param {Function} callback - 回调
 */
export default function buildDeps(context: string, mainModule: string, options, callback: Function): void {
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
            // 如果已经存在
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

