
/**
 * 重命名模块 id
 * @param {*} depTree 
 * @param {*} options 
 */
export default function createRealIds(depTree: DepTree, options) {
    const sortedModules = [];
    for (let id in depTree.modulesById) {
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
