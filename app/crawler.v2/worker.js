///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	fs = require('fs'),
	path = require('path'),
	request = require('request') ;

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();
GLOBAL.$ = require('jquery').create();

// Load plugins
var plugins = require('./plugins'); 

///////////////////////////////////////////////////////////// CRAWLER ///////////////
var crawler = Backbone.Model.extend({

	// Initialize
	initialize: function() {
		var self = this;

		// Set env vars as attributes
		self.attributes = _.extend({}, self.attributes, JSON.parse(process.env.config));

		// Search for something to do
		self.searchCrawlQueue(); 

	},

	// Add an url in queue if not already in queue or crawling or done
	addQueue: function(link, callback) {
		var self = this;
		var md5 = tools.md5(link.url)+'.json'; 

		// Create queue if not yet in paths
		async.series({
			queue: function(callback) {
				fs.exists(self.get('dir_queue')+'/'+md5, function(exists) {
					callback(null, exists)
				})
			},
			crawling: function(callback) {
				fs.exists(self.get('dir_crawling')+'/'+md5, function(exists) {
					callback(null, exists)
				})
			},
			done: function(callback) {
				fs.exists(self.get('dir_done')+'/'+md5, function(exists) {
					callback(null, exists)
				})
			}
		},

		// Analyse response
		function(err, files) {
			//console.log(link, files);
			if ( !files.queue && !files.crawling && !files.done && link && link.url ) {
				var queueFile = self.get('dir_queue')+'/'+md5; 
				fs.exists(queueFile, function(exists) {
					if ( ! exists ) {
						tools.debug('Add link :: '+JSON.stringify(link)+' :: '+md5);
						fs.writeFile(queueFile, JSON.stringify(link), 'utf8', function() {
							callback([{path: queueFile}]); 
						});		
					}
					else {
						callback([{path: queueFile}]); 
					}			
				})

			}
			else callback() ;
		})
	},

	// Search an url to crawl
	searchCrawlQueue: function() {
		var self = this;

		// Search for something to do
		async.series({
			queue: function(callback) {
				tools.walk(self.get('dir_queue'), function(err, files) {
					if ( files && files.length ) callback(files);
					else callback() ;
				});
			},
			add: function(callback) {
				self.addQueue({url: self.get('url')+'/'}, callback); 
			}
		},

		// Must received a list of files else nothinf to crawl
		function(files){

			// If files to crawl
			if ( files && files.length ) {
				//tools.log('Crawl :: '+files[0].path);
				self.crawl(files[Math.floor(Math.random()*files.length)]) ;	
			}

			// Else exit
			else {
				process.exit(0);
			}

		}) ;

	},

	// Crawl an url
	crawl: function(file) {
		var self = this;

		// Start timer
		var timer_start = new Date(); 

		// Read file to get config and work on it
		async.waterfall([

			// Read file to parse
			function(callback) {
				fs.readFile(file.path, 'utf8', callback)
			},

			// Delete queue file
			function(link, callback) {
				fs.unlink(file.path, function() {
					callback(null, link);
				}); 
			},

			// Move it to crawling dir
			function(link, callback) {
				
				// Parse json link
				if ( link ) link = JSON.parse(link);

				// If link is invalid, stop here
				if ( ! link ) {
					return callback("link invalid :: "+file.path); 
				}

				// Move file to crawling dir
				//tools.log('Move :: '+file.path+" -> "+self.get('dir_crawling')+'/'+path.basename(file.path), 'yellow'); 
				fs.writeFile(self.get('dir_crawling')+'/'+path.basename(file.path), JSON.stringify(link), 'utf8', function(err) {
					file.path = self.get('dir_crawling')+'/'+path.basename(file.path);
					if ( err ) tools.error(err);
					callback(null, link);	
				})
			},

			// Request link url
			function(link, callback) {

				// Prepare request opts
				var req_opts = {
					uri: link.url,
					timeout: 60000,
					headers: {
						"User-Agent": 'Mozilla/5.0 (compatible; node-seo; http://js2node.com)',
						"Referer": link.referer
					}
				}

				// Get HTTP Auth
				if ( self.get('auth') && self.get('auth').user) {
					req_opts['auth'] = tools.extend(true, self.get('auth'), {'sendImmediately': false});
				}	

				// Debug message
				tools.log('Open :: '+req_opts.uri, 'purple');

				// Get HTML
				request(req_opts, function(err, response, body) {

					// Prepare datas to send to manager
					var crawl = {
						url: req_opts.uri,
						time: new Date()-timer_start,
						datas: {}
					} ;

					// Manager errors
					if ( err ) {
						crawl.error = err; 
						tools.error(" >> "+req_opts.uri) ;
						tools.error(err);
						tools.warning(body);
					}

					// Parse body
					else {
						
						// Get jQuery element from body
						var document = $(response.body) ;

						// Store url into document
						document.url = crawl.url ;
						document.baseUrl = self.get('url') ; 

						// Execute plugins
						_.each(plugins, function(plugin, name) {
							crawl.datas[name] = plugin(document);
						}); 

						// Get status Code
						crawl.statusCode = response.statusCode; 

						// Store body
						crawl.body = body;

					}

					// Return crawled object
					callback(err, crawl);

				}); 

			},

			// Delete crawling file
			function(crawl, callback) {
				fs.unlink(file.path, function() {
					callback(null, crawl);
				}); 
			},

			// Move to done
			function(crawl, callback) {
				fs.writeFile(self.get('dir_done')+'/'+path.basename(file.path), JSON.stringify(crawl), 'utf8', function(err) {
					callback(err, crawl);
				}) ;
			},

			// Add links to queue
			function(crawl, callback) {
				if ( crawl.datas.links ) {
					async.forEach(crawl.datas.links, function(link, callback) {
						if ( link.crawl ) {
							self.addQueue({
								url: link.href,
								referer: crawl.url
							}, callback)
						}
						else {
							callback() ;
						}
					}, function() {
						callback(null, crawl);
					})
				}
				else {
					callback(null, crawl);
				}
			}

		], 

		// Request complete
		function(err, crawl) {
			if ( err || ! crawl ) {
				tools.error("Craw error :: "+JSON.stringify(err)) ;
			}
			process.exit(0);
		}); 
	}

}); 

///////////////////////////////////////////////////////////// CREATE CRAWLER INSTANCE ///////////////
new crawler(); 
