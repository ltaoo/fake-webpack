import addChunk from './addChunk';

export default function addModuleToChunk(depTree, context, chunkId, options) {
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
