import * as fs from 'fs';
import * as path from 'path';

const fileExists = fs.exists;

/**
 * 递归创建文件夹
 * @param {string} dir
 * @param {Function} callback
 */
export function createDir(dir, callback) {
    fileExists(dir, function(exists) {
    if (exists) {
        callback();
    } else {
        fs.mkdir(dir, function(err) {
        if (err) {
            const parentDir = path.join(dir, '..');
            if (parentDir === dir) {
            return callback(err);
            }

            createDir(parentDir, function(err) {
            if (err) {
                return callback(err);
            }

            fs.mkdir(dir, function(err) {
                if (err) {
                return callback();
                }

                callback();
            });
            });
            return;
        }
        callback();
        });
    }
    });
} // end createDir func define