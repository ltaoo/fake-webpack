///<reference path="../typings/index.d.ts" />
import * as fs from 'fs';
import * as path from 'path';

import buildDeps from './buildDeps';
import writeChunk from './writeChunk';
import getTemplate, { getChunkTemplate } from './getTemplate';
import {
  createDir,
} from './utils';

const HASH_REGEXP = /\[hash\]/i;

function webpack(context: ContextPath, moduleName: ModulePath, options, callback: Function) {

  /** 
   * 会处理代码中的特定变量
   */
  options.parse = options.parse || {};
  options.parse.overwrites = options.parse.overwrites || {};
  options.parse.overwrites.process = options.parse.overwrites.process || '__webpack_process';
  options.parse.overwrites.module = options.parse.overwrites.module || '__webpack_module+(module)';
  // options.parse.overwrites.console = options.parse.overwrites.console || '__webpack_console';
  options.parse.overwrites.global = options.parse.overwrites.global || '__webpack_global';
  options.parse.overwrites.Buffer = options.parse.overwrites.Buffer || 'buffer+.Buffer';
  options.parse.overwrites['__dirname'] = options.parse.overwrites['__dirname'] || '__webpack_dirname';
  options.parse.overwrites['__filename'] = options.parse.overwrites['__filename'] || '__webpack_filename';

  options.resolve = options.resolve || {};

  const fileWrites = [];

  options.emitFile = function(filename: string, content: string, toFront: boolean) {
    fileWrites[toFront ? 'unshift' : 'push']([
      path.join(options.outputDirectory, filename),
      content,
    ]);
  };

  buildDeps(context, moduleName, options, function(err: Error, depTree: DepTree) {
    if (err) {
      callback(err);
      return;
    }
    console.log('最终构建出的依赖树', JSON.stringify(depTree));
    let buffer = [];

    let chunksCount = 0;

    const chunkIds: string[] = Object.keys(depTree.chunks);
    // 排序
    chunkIds.sort(function(a, b) {
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
    const template: TemplateCode = getTemplate(options, templateOptions);

    let hash;
    try {
      hash = new (require('crypto')).Hash('md5');
      hash.update(JSON.stringify(options.library || ''));
      hash.update(JSON.stringify(options.outputPostfix || ''));
      hash.update(JSON.stringify(options.outputJsonpFunction || ''));
      hash.update(JSON.stringify(options.publicPrefix || ''));

      try {
        hash.update(JSON.stringify(options));
      } catch (e) {}

      hash.update(template);
      hash.update('1');
    } catch (err) {
      hash = null;
    }

    // 遍历 chunk
    for (let i = 0, l = chunkIds.length; i < l; i += 1) {
      const chunkId = chunkIds[i];
      const chunk = depTree.chunks[chunkId];

      // 如果重复或者为空就跳过
      if (chunk.empty) {
        continue;
      }
      if (chunk.equals !== undefined) {
        continue;
      }

      chunksCount += 1;

      // const filename = chunk.filename = chunk.realId === 0 ? options.output : chunk.realId + options.outputPostfix;
      const filename = options.output;
      const content = writeChunk(depTree, chunk, options);
      if (hash) {
        hash.update(content);
      }

      buffer = [];
      const chunkTemplate = getChunkTemplate(chunk, options, templateOptions);
      // 第一个 chunk
      if (chunk.realId === 0) {
        if (hash) {
          hash = hash.digest('hex');
        } else {
          hash = '';
        }
        // 如果要打成依赖包，就用提供的变量名
        if (options.library) {
          buffer.push('/******/var ');
          buffer.push(options.library);
          buffer.push('=\n');
        }

        buffer.push(template);
        buffer.push('/******/({');
        if (chunkIds.length > 1) {
          buffer.push('a:');
          buffer.push(
            JSON.stringify(options.outputPostfix.replace(HASH_REGEXP, hash)),
          );
          buffer.push(',b:');
          buffer.push(JSON.stringify(options.outputJsonpFunction));
          buffer.push(',');
        }

        buffer.push('c:');
        buffer.push(
          JSON.stringify(options.publicPrefix.replace(HASH_REGEXP, hash)),
        );
        buffer.push(',\n');
      } else {
        // 懒加载的 chunk
        buffer.push(chunkTemplate[0]);
        buffer.push('{\n');
      }

      // 真正写入内容
      buffer.push(content);

      // 关闭模块
      buffer.push('/******/}');
      if (chunk.realId === 0) {
        buffer.push(')');
      } else {
        buffer.push(chunkTemplate[1]);
      }

      const bufferStr = buffer.join('');

      // 向 wirteFiles 数组 push，才能在最终生成文件时生成
      options.emitFile(filename, bufferStr, true);
    }

    // emit task-end prepare chunks


    const outDir = options.outputDirectory.replace(HASH_REGEXP, hash);
    createDir(outDir, function(err) {
      // emit task-end create output directory
      if (err) {
        return callback(err);
      }
      // 生成文件
      writeFiles();
    });

    const fileSizeMap = {};

    /**
     * 真正写入文件
     */
    function writeFiles() {
      // 剩余的文件
      let remFiles = fileWrites.length;
      // console.log(fileWrites);
      fileWrites.forEach(function(writeAction) {
        const writeActionFileName = writeAction[0].replace(HASH_REGEXP, hash);
        fileSizeMap[path.basename(writeActionFileName)] = writeAction[1].length;
        fs.writeFile(writeActionFileName, writeAction[1], 'utf-8', function(
          err,
        ) {
          if (err) {
            throw err;
          }

          remFiles -= 1;
          if (remFiles === 0) {
            writingFinished();
          }
        });
      });

      if (fileWrites.length === 0) {
        writingFinished();
      }
    }
    function writingFinished() {
      // const bufferObj = {
      //   hash: hash,
      //   chunkCount: chunksCount,
      //   modulesCount: Object.keys(depTree.modules).length,
      // };
      let sum = 0;
      const fileModulesMap = {};
      const chunkNameMap = {};

      chunkIds.reverse().forEach(function(chunkId) {
        const chunk = depTree.chunks[chunkId];
        if (chunk.filename) {
          const modulesArray = [];
          for (let moduleId in chunk.modules) {
            if (chunk.modules[moduleId] === 'include') {
              const modu = depTree.modules[moduleId];

              modulesArray.push({
                id: modu.realId,
                ...modu,
              });

              sum += 1;
            }
          }

          modulesArray.sort(function(a, b) {
            return a.id - b.id;
          });

          fileModulesMap[path.basename(chunk.filename)] = modulesArray;
        }
      });
    }
  });
}

webpack(
  __dirname,
  './test/example.js',
  {
    output: 'bundle.js',
    publicPrefix: '',
    outputDirectory: './dist',
  },
  function(err, res) {
    if (err) {
      // console.log(err);
      return;
    }
    // console.log(res);
  },
);
