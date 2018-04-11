/**
 * @file 构建模块
 */
const fs = require('fs');

const resolve = require("enhanced-resolve");
const execLoaders = require("enhanced-require/lib/execLoaders");

const parse = require('./parse');

/**
 * 
 * @param {*} context 
 * @param {*} request 
 * @param {*} preLoaders 
 * @param {*} loaders 
 * @param {*} postLoaders 
 * @param {*} requestObj 
 * @param {*} options 
 * @param {*} callback 
 */
function buildModule(context, request, preLoaders, loaders, postLoaders, requestObj, options, callback) {
    const files = requestObj.resource && requestObj.resource.path && [requestObj.resource.path] || [];
    const dependencyInfo = {
        cacheable: true,
        files: files.slice(0),
    };

    const extraResults = {
        dependencyInfo: dependencyInfo,
        warnings: [],
        errors: [],
    };

    if (requestObj.resource && requestObj.resource.path) {
        fs.readFile(requestObj.resource.path, onFileRead);
    } else {
        onFileRead(null, null);
    }

    /**
     * 
     * @param {*} err 
     * @param {*} content 
     */
    function onFileRead(err, content) {
        if (err) {
            return callback(err, extraResults);
        }

        const loaderContext = {
            loaders: loaders.map(resolve.stringify.part),
            preLoaders: preLoaders.map(resolve.stringify.part),
            postLoaders: preLoaders.map(resolve.stringify.part),
            loaderType: null,
            web: true,
            emitWarning: function (warning) {
                extraResults.warnings.push(warning);
            },
            emitError: function (error) {
                extraResults.errors.push(error);
            },
        };

        if (requestObj.resource) {
            loaderContext.resourceQuery = requestObj.resource.query;
        }

        loaderContext.loaderType = 'preLoader';
        // 第一次调用 preLoaders
        execLoaders(context, request, preLoaders, files, [content], loaderContext, dependencyInfo, options, function (err, result) {
            if (err) {
                return callback(err, extraResults);
            }

            loaderContext.loaderType = 'loader';
            // 第二次是 loaders
            execLoaders(
                context, 
                request, 
                loaders, 
                files, 
                result, 
                loaderContext, 
                dependencyInfo, 
                options, 
                function (err, result) {
                    if (err) {
                        return callback(err, extraResults);
                    }

                    loaderContext.loaderType = 'postLoader';
                    // 第三次是 postLoaders
                    execLoaders(context, request, postLoaders, files, result, loaderContext, dependencyInfo, options, function (err, result) {
                        if (err) {
                            return callback(err, extraResults);
                        }
                        return processJs(result);
                    });
                },
            );
        });
    }

    /**
     * 
     * @param {Buffer} resultBuffers 
     */
    function processJs(resultBuffers) {
        const source = resultBuffers[0].toString('utf-8');
        let deps;
        console.log('before parse', options.parse);
        try {
            deps = parse(source, options.parse);
        } catch (e) {
            callback(new Error('File ' + request + 'parsing failed: ' + e), extraResults);
            return;
        }
        return callback(null, extraResults, source, deps);
    }
}

module.exports = buildModule;
