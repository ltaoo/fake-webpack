module.exports = function webpack(context, moduleName, options, callback) {
    const startTime = new Date();

    buildDeps(context, moduleName, options, function (err, depTree) {
        if (err) {
            callback(err);
            return;
        }

        const buffer = [];

        let chunksCount = 0;

        const chunkIds = Object.keys(depTree.chunks);
        // 排序
        chunkIds.sort(function (a, b) {
            if (typeof depTree.chunks[b].realId !== 'number') {
                return 1;
            }
            if (typeof depTree.chunks[a].realId !== 'number') {
                return -1;
            }

            return depTree.chunks[b].realId - depTree.chunks[a].realId;
        });

        const templateOptions = {
            chunks: chunkIds.length > 1,
        };
        const template = getTemplate(options, templateOptions);

        let hash;
        try {
            hash = new (require('crypto').Hash)('md5');
            hash.update(JSON.stringify(options.library || ''));
            hash.update(JSON.stringify(options.outputPostfix || ''));
            hash.update(JSON.stringify(options.outputJsonpFunction || ''));
            hash.update(JSON.stringify(options.publicPrefix || ''));

            try {
                hash.update(JSON.stringify(options));
            } catch () {}

            hash.update(template);
            hash.update('1');
        } catch (err) {
            hash = null;
        }

        // 遍历 chunk
        for (let i = 0, l = chunkIds.length; i < l; i += 1) {
            const chunkId = chunkIds[i];
            const chunk = depTree.chunks[chunkId];
        }
    });
}