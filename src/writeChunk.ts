/**
 * @file 将 chunk 写入文件
 */
import writeSource from './writeSource';

export default function writeChunk (depTree: DepTree, chunk: Chunk, options): string {
    if (!options) {
        options = chunk;
        chunk = null;
    }

    const buffer = [];
    const modules = chunk ? chunk.modules : depTree.modules;
    const includeModules: Array<Module> = [];

    for (let moduleId in modules) {
        if (chunk) {
            // 只处理 include 标志的模块
            if (chunk.modules[moduleId] !== 'include') {
                continue;
            }
        }

        const module = depTree.modules[moduleId];
        includeModules.push(module);
    }

    // if (options.includeFilenames) {
    //     const shortenFilename = require('./createFilenameShortener')(options.context);
    // }

    includeModules.sort(function (a: Module, b: Module) {
        return a.realId - b.realId;
    });

    includeModules.forEach(function (module: Module, idx: number) {
        buffer.push('/******/');
        buffer.push(module.realId);
        buffer.push(': function (module, exports, require) {\n\n');

        buffer.push(writeSource(module, options, function (id) {
            return depTree.modules[id].realId;
        }, function (id) {
            return depTree.chunks[id].realId;
        }));

        if (idx === includeModules.length - 1) {
            buffer.push('\n\n/******/}\n');
        } else {
            buffer.push('\n\n/******/}, \n/******/\n');
        }
    });

    return buffer.join('');
}



