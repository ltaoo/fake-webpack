
require.ensure([], function(require) {
    // a named chuck
    const log = require('./common');
    log('a page');
});
