///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	cluster = require('cluster'),
	request = require('request') ;

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();
GLOBAL.$ = require('jquery').create();

///////////////////////////////////////////////////////////// DECLARE WORKER ///////////////
if (cluster.isWorker) {

	// Load plugins
	var plugins = require('./plugins'); 

	// Start timer
	var timer_start = new Date(); 

	// Debug message
	tools.log('Open :: '+process.env.url, 'purple');

	// Prepare request opts
	var req_opts = {
		uri: process.env.url,
		timeout: 60000,
		headers: {
			"User-Agent": 'Mozilla/5.0 (compatible; node-seo; http://js2node.com)',
			"Referer": process.env.referer
		}
	}
	// Get HTTP Auth
	var HTTP_AUTH = JSON.parse(process.env.auth);
	if ( HTTP_AUTH && HTTP_AUTH.user) {
		req_opts['auth'] = tools.extend(true, HTTP_AUTH, {'sendImmediately': false});
	}

	// Get HTML
	request(req_opts, function(err, response, body) {

		// Prepare datas to send to manager
		var datas = {
			url: process.env.url,
			time: new Date()-timer_start
		} ;

		// Manager errors
		if ( err ) {
			datas.error = err; 
			console.log(" >> "+process.env.url) ;
			tools.error(err);
			tools.log(body);
		}

		// Parse body
		else {
			
			// Get jQuery element from body
			var document = $(response.body) ;

			// Store url into document
			document.url = datas.url ;
			document.baseUrl = process.env.baseUrl ; 

			// Execute plugins
			_.each(plugins, function(plugin, name) {
				tools.extend(true, datas, plugin(document)); 
			}); 

			// Get status Code
			datas.statusCode = response.statusCode; 

			//console.log(datas);
			// Debug
			//console.log(response.statusCode, response.body, document.find('a').length) ;
			//console.log(datas);
		}

		// Log message
		tools.log('Complete :: '+process.env.url, 'lcyan'); 

		// Send parsing results to manager and exit
		process.send(datas);
		//process.exit(); 

	}); 

}