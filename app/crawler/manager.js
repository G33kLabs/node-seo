///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	cluster = require('cluster'),
	mysql = require("mysql") ;

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();

///////////////////////////////////////////////////////////// MANAGER ///////////////
var worker = require(root_path+'/app/crawler/worker') ;
module.exports = Backbone.Model.extend({

	// Set defaults
	defaults: {
		db: {
			type: 'mysql',
			host: '127.0.0.1',
			user: 'root',
			password: '',
			database: ''
		}
	},

	// Init model vars
	queue: [],
	runningProcess: 0,

	// Initialize
	initialize: function() {
		var self = this;

		// Setup cluster
		cluster.setupMaster({
			exec : "app/crawler/worker.js"
		});

		// Set max running processes
		self.maxProcess = self.get('num_process') ;

		// Open database Link
		async.series({
			mysql: function(callback) {
				self.open_mysql(callback); 
			},
			reset: function(callback) {
				if ( ! self.get('reset_db') ) return callback();
				var sql = "DELETE FROM seo_crawl WHERE url LIKE '"+self.get('url')+"%'";
				tools.warning('RESET SEO_CRAWL DB :: '+sql);
				self.db.query(sql, callback);
			},
			clean: function(callback) {
				if ( ! self.get('clean_db') ) return callback();
				var sql = "DELETE FROM seo WHERE edited_at IS NULL";
				tools.warning('CLEAN SEO DB :: '+sql);
				self.db.query(sql, callback);
			},
			initQueue: function(callback) {
				self.add_queue(self.get('url')+'/', callback); 
			}
		}, 

		// All dependencies are loaded
		function(err, res) {

			// If mysl error
			if ( err ) {
				tools.error(err);
			}

			// Fork first worker on root
			self.fork(); 		

			// Output ready message
			tools.log('CrawlerManager is ready !') ;

		})
		

	},

	// OPen mysql link
	open_mysql: function(callback) {
		var Config = this.get('db') ;
		this.db = mysql.createConnection('mysql://'+Config.user+':'+Config.password+'@'+Config.host+'/'+Config.database+'?debug=false&charset=UTF8_GENERAL_CI&timezone=0000');
		this.db.connect(callback) ;
	},

	// Add an url to parse
	add_queue: function(link, callback) {
		var self = this;

		// Parse link
		if ( _.isString(link) ) link = {url: link};

		// Some logs
		//tools.log("Add an URL to the queue :: "+link.url) ;		

		// Get relative url
		var relative_url = link.url.replace(self.get('url'), '');

		// Exclude some paths
		if ( /^\/forum/.test(relative_url) ) {
			return callback(); 
		}

		if ( tools.trim(relative_url) == '' ) {
			return callback(); 
		}

		// Add url to queue if not yet in DB
		async.series({

			// Check if not yet exists
			check: function(callback) {
				var sql = "SELECT * FROM seo_crawl WHERE url LIKE '"+link.url+"' LIMIT 1";
				//tools.debug(sql);
				self.db.query(sql, function(err, replies) {
					if ( err ) callback(err); 
					else if ( replies.length ) callback('URL already exists'); 
					else callback(); 
				})
			},

			// Insert new record into DB
			insert: function(callback) {
				var sql = "INSERT INTO seo_crawl SET url = '"+link.url+"', status_code = 'Crawling', referer = '"+(link.referer?link.referer:'')+"', created_at = NOW() ";
				//tools.debug(sql); 
				self.db.query(sql, function(err, res) {
					if ( !err ) tools.log("Add an URL to the queue :: "+link.url) ;
					callback(err, res) ;
				}) ;
			}

		}, 

		// Queue is managed : go next
		function(err) {
			if ( err && err.code ) tools.error("MYSQL error :: "+JSON.stringify(err)); 
			callback(); 
		});

	},

	// Fork a process
	fork: function() {
		var self = this;

		// Exit if max of processes are running
		if ( self.runningProcess >= self.maxProcess) {
			return false;
		}

		// Try to find a record in DB to parse
		var sql = "SELECT * FROM seo_crawl WHERE crawled_at IS NULL ORDER BY RAND() LIMIT 1" ;
		self.db.query(sql, function(err, replies) {

			// Something to parse
			if ( replies.length && (replies = _.first(replies)) ) {

				// Create the worker
				self.runningProcess++;
				var currentWorker = cluster.fork({
					url: replies.url,
					referer: replies.referer,
					auth: JSON.stringify(self.get('auth')),
					baseUrl: self.get('url')
				}); 

				// Restart a new worker if this one ended
				currentWorker.on('exit', function(code, signal) {
					//tools.log('Good job worker '+ this.process.pid +' ! ', 'yellow');
					//console.log('worker ' + this.process.pid + ' died');
					self.runningProcess--;
					self.fork() ;					
				}); 

				// Get message from worker
				currentWorker.on('message', function(msg) {

					// Get relative url
					//if ( msg.meta_canonical ) msg.meta_canonical = msg.meta_canonical.replace(self.get('url'), '');
					//if ( msg.meta_thumb ) msg.meta_thumb = msg.meta_thumb.replace(self.get('url'), '');

					// Insert and add links
					async.series({

						// Update current URL
						update: function(callback) {
							var sql = 'UPDATE IGNORE seo_crawl SET status_code = '+self.db.escape(msg.statusCode)+', load_time = '+self.db.escape(msg.time)+', meta_canonical = '+self.db.escape(msg.meta_canonical)+', meta_title = '+self.db.escape(msg.meta_title)+', meta_desc = '+self.db.escape(msg.meta_desc)+', meta_keywords = '+self.db.escape(msg.meta_keywords)+', meta_thumb = '+self.db.escape(msg.meta_thumb)+', crawled_at = NOW() WHERE url LIKE "'+msg.url+'" LIMIT 1';
							//var sql = 'UPDATE IGNORE seo SET status_code = '+self.db.escape(msg.statusCode)+', load_time = '+self.db.escape(msg.time)+', crawled_at = NOW() WHERE url LIKE "'+msg.url+'" LIMIT 1';
							//console.log(sql);
							//tools.debug(sql);
							self.db.query(sql, callback); 		
						},

						// Add links to queue
						links: function(callback) {

							// If no links to add, go next
							if ( ! msg.links || ! msg.links.length ) {
								callback(); 
								return;
							}

							// Else add all crawlable links
							async.forEachSeries(msg.links, function(link, callback) {
								if ( link && link.crawl ) {
									self.add_queue({
										referer: msg.url,
										url: link.href
									}, callback) ;
								}
								else {
									callback() ;
								}
							}, callback); 

						},

						// Count crawls in queue
						count_queue: function(callback) {
							var sql = "SELECT COUNT(url) as current FROM seo_crawl WHERE crawled_at IS NULL";
							self.db.query(sql, callback); 	
						},

						// Count total crawls
						count_total: function(callback) {
							var sql = "SELECT COUNT(url) as total FROM seo_crawl";
							self.db.query(sql, callback); 	
						}
					},

					// CLose this process and open another one
					function(err, results) {
						if ( err ) tools.error('Worker response :: '+JSON.stringify(err)) ;
						var current = _.first(_.first(results.count_queue)).current;
						var total = _.first(_.first(results.count_total)).total;
						tools.debug('Progress :: '+(total-current)+'/'+total+' ('+tools.number_format((total-current)*100/total, 1)+'%)');
						currentWorker.process.kill(); 
					}) ;
					
					//console.log(msg) ;
				}); 

				// Start another one if possible
				self.fork() ;			

			}

			// All is complete
			else if ( ! self.runningProcess ) {
				tools.warning('All pages are now crawled ! ') ;
				process.exit(0);
			}

		});

	}



}); 