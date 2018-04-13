/**
 * @file 构建模块
 */
import * as fs from 'fs';

import * as resolve from 'enhanced-resolve';

const parse = require('./parse');

/**
 * 创建模块
 * @param {*} context 
 * @param {*} request 
 * @param {*} requestObj 
 * @param {*} options 
 * @param {*} callback 
 */
export default function buildModule(context, request, requestObj: RequestObj, options, callback: Function) {
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
     * 
     * @param {*} err 
     * @param {*} content 
     */
    function onFileRead(err: Error, content: Buffer) {
        if (err) {
            return callback(err, extraResults);
        }
        processJs([content.toString()]);
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
