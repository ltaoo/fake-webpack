/**
 * @file 将 chunk 写入文件
 */
const writeSource = require('./writeSource');

module.exports = function (depTree, chunk, options) {
    if (!options) {
        options = chunk;
        chunk = null;
    }

    const buffer = [];
    const modules = chunk ? chunk.modules : depTree.modules;
    const includeModules = [];

    for (let moduleId in modules) {
        if (chunk) {
            if (chunk.modules[moduleId] !== 'include') {
                continue;
            }
        }

        const module = depTree.modules[moduleId];
        includeModules.push(module);
    }

    if (options.includeFilenames) {
        const shortenFilename = require('./createFilenameShortener')(options.context);
    }

    includeModules.sort(function (a, b) {
        return a.realId - b.realId;
    });

    includeModules.forEach(function (module, idx) {
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



