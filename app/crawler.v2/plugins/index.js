var finder = require('findit'),
	path = require('path');

// Prepare exports
module.exports = {};

// Load all plugins in the plugin directory
var files = require('findit').sync(__dirname);
_.each(files, function(file) {
	var key = path.basename(file, path.extname(file));
	if ( key != 'index' ) {
		module.exports[key] = require('./'+key) ;
	}
});