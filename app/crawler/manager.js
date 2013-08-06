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
///var Worker = require(root_path+'/app/crawler/worker') ;
var Datastore = require(root_path+'/app/crawler/datastore/crawl.mysql') ;
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

		// Start crawling
		self.start_time = moment() ;

		// Open database Link
		async.series({
			datastore: function(callback) {
				self.datastore = new Datastore(self.attributes, callback); 
			},
			reset: function(callback) {
				if ( ! self.get('reset_db') ) return callback();
				var sql = "DELETE FROM seo_crawl WHERE url LIKE '"+self.get('url')+"%'";
				tools.warning('RESET SEO_CRAWL DB :: '+sql);
				self.datastore.db.query(sql, callback);
			},
			purge: function(callback) {
				if ( self.get('reset_db') ) return callback();
				var sql = "UPDATE seo_crawl SET crawled_at = NULL WHERE url LIKE '"+self.get('url')+"%' AND status_code = 'Crawling' AND crawled_at IS NOT NULL";
				tools.warning('PURGE SEO_CRAWL DB :: '+sql);
				self.datastore.db.query(sql, callback);
			},
			clean: function(callback) {
				if ( ! self.get('clean_db') ) return callback();
				var sql = "DELETE FROM seo WHERE edited_at IS NULL";
				tools.warning('CLEAN SEO DB :: '+sql);
				self.datastore.db.query(sql, callback);
			},
			initQueue: function(callback) {
				self.datastore.add_queue(self.get('url')+'/', callback); 
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

	// Fork a process
	fork: function() {
		var self = this;

		self.db = self.datastore.db;

		// Exit if max of processes are running
		if ( self.runningProcess >= self.maxProcess) {
			return false;
		}

		// Try to find a record in DB to parse
		self.datastore.getRecord(function(err, replies) {

			// Something to parse
			if ( replies ) {

				// Create the worker
				self.runningProcess++;
				var currentWorker = cluster.fork({
					url: replies.url,
					referer: replies.referer,
					auth: JSON.stringify(self.get('auth')),
					baseUrl: self.get('url'),
					attributes: JSON.stringify(self.attributes)
				}); 

				// Restart a new worker if this one ended
				currentWorker.on('exit', function(code, signal) {
					//tools.log('Good job worker '+ this.process.pid +' ! ', 'yellow');
					self.runningProcess--;
					self.fork() ;					
				}); 

				// Get message from worker
				currentWorker.on('message', function(msg) {

					// Calculate ETA
					var passed_time = moment() - self.start_time; 
					var total_time = passed_time*100/msg.progress;
					var eta = total_time - passed_time; 

					// Log message
					tools.debug('Running :: '+self.runningProcess+' :: Progress :: '+msg.current+'/'+msg.total+' ('+tools.number_format(msg.progress, 1)+'%) :: ETA :: '+tools.formatTime(eta));

					// Kill the worker to launch a new one on another url
					currentWorker.process.kill(); 

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