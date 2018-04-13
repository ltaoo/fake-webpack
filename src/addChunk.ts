import addModuleToChunk from './addModuleToChunk';

/**
 * 
 * @param {*} depTree 
 * @param {*} chunkStartpoint 
 * @param {*} options 
 */
export default function addChunk(depTree: DepTree, chunkStartpoint: Module, options) {
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
