import * as fs from 'fs';
import * as path from 'path';

import * as resolve from 'enhanced-resolve';

import addModule from './addModule';

/**
 * 
 * @param {*} depTree 
 * @param {*} context 
 * @param {*} contextModuleName 
 * @param {*} options 
 * @param {*} reason 
 * @param {*} finalCallback 
 */
export default function addContextModule(depTree: DepTree, context, contextModuleName, options, reason: Reason, finalCallback: Function) {
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

                        let count = list.length + 1;
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
                                                if (file.substr(file.length - ext.length) === ext) {
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
