/**
 * @file 构建模块
 */
import * as fs from 'fs';

import * as resolve from 'enhanced-resolve';
import execLoaders from './lib/execLoaders';

const parse = require('./parse');

/**
 * 创建模块
 * @param {*} context 
 * @param {*} request 
 * @param {*} preLoaders 
 * @param {*} loaders 
 * @param {*} postLoaders 
 * @param {*} requestObj 
 * @param {*} options 
 * @param {*} callback 
 */
export default function buildModule(context, request, preLoaders, loaders, postLoaders, requestObj: RequestObj, options, callback: Function) {
    const files = requestObj.resource && requestObj.resource.path && [requestObj.resource.path] || [];
    const dependencyInfo: DependencyInfo = {
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
     * 读取模块后，使用 loader 进行处理
     * @param {*} err 
     * @param {*} content 
     */
    function onFileRead(err: Error, content: Buffer) {
        if (err) {
            return callback(err, extraResults);
        }

        const loaderContext: LoaderContext = {
            loaders: loaders.map(resolve.stringify.part),
            preLoaders: preLoaders.map(resolve.stringify.part),
            postLoaders: postLoaders.map(resolve.stringify.part),
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
        console.log(context, request, loaders, files);
        // 第一次调用 preLoaders
        execLoaders(
            context,
            request,
            preLoaders,
            files,
            [content],
            loaderContext,
            dependencyInfo,
            options,
            function (err: Error, result: Array<SourceCode>) {
                if (err) {
                    return callback(err, extraResults);
                }

                loaderContext.loaderType = 'loader';
                // 第二次是 loaders
                console.log(context, request, loaders, files);
                execLoaders(
                    context,
                    request,
                    loaders,
                    files,
                    result,
                    loaderContext,
                    dependencyInfo,
                    options,
                    function (err: Error, result: Array<SourceCode>) {
                        if (err) {
                            return callback(err, extraResults);
                        }

                        loaderContext.loaderType = 'postLoader';
                        // 第三次是 postLoaders
                        execLoaders(
                            context,
                            request,
                            postLoaders,
                            files,
                            result,
                            loaderContext,
                            dependencyInfo,
                            options,
                            function (err, result) {
                                if (err) {
                                    return callback(err, extraResults);
                                }
                                return processJs(result);
                            }
                        );
                    },
                );
            }
        );
    }

    /**
     * 
     * @param {Buffer} resultBuffers 
     */
    function processJs(resultBuffers: Array<SourceCode>) {
        const source: SourceCode = resultBuffers[0].toString();
        let deps;
        try {
            deps = parse(source, options.parse);
        } catch (e) {
            callback(new Error('File ' + request + 'parsing failed: ' + e), extraResults);
            return;
        }
        return callback(null, extraResults, source, deps);
    }
}
