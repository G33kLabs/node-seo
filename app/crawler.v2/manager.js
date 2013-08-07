///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	fs = require("fs"),
	url = require('url'),
	mysql = require("mysql"),
	fork = require('child_process').fork ;

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();

///////////////////////////////////////////////////////////// MANAGER ///////////////
///var Worker = require(root_path+'/app/crawler/worker') ;
module.exports = Backbone.Model.extend({

	// Set defaults
	defaults: {
		"crawl_path": root_path+"/tmp/crawls/"
	},

	// Init model vars
	runningProcess: 0,

	// Manage max hits per second
	hitsPerSecond: 0,
	maxHitsPerSecond: 3,

	// Req/min history
	history: [],

	// Initialize
	initialize: function() {
		var self = this;

		// Set max running processes
		self.maxProcess = self.get('num_process') ;

		// Start crawling
		self.start_time = moment() ;

		// Get site domain
		self.attributes.domain = url.parse(self.get('url')).hostname; 
		self.attributes.dir_site = self.get('crawl_path')+self.attributes.domain+'/';
		self.attributes.dir_queue = self.get('crawl_path')+self.attributes.domain+'/queue';
		self.attributes.dir_crawling = self.get('crawl_path')+self.attributes.domain+'/crawling';
		self.attributes.dir_done = self.get('crawl_path')+self.attributes.domain+'/done';

		// Create crawl folder working directory
		async.series({

			// Create working dirs
			create_dir: function(callback) {
				fs.mkdir(self.get('crawl_path'), function(err) {callback(null, err?false:true)});
			},
			create_dir_site: function(callback) {
				fs.mkdir(self.attributes.dir_site, function(err) {callback(null, err?false:true)});
			},
			create_dir_queue: function(callback) {
				fs.mkdir(self.attributes.dir_queue, function(err) {callback(null, err?false:true)});
			},
			create_dir_crawling: function(callback) {
				fs.mkdir(self.attributes.dir_crawling, function(err) {callback(null, err?false:true)});
			},
			create_dir_done: function(callback) {
				fs.mkdir(self.attributes.dir_done, function(err) {callback(null, err?false:false)});
			},

			// Move old crawling datas to queue dir
			copy_crawling: function(callback) {
				tools.walk(self.get('dir_crawling'), function(err, files) {
					if ( files && files.length ) {
						async.forEachSeries(files, function(file, callback) {
							fs.rename(file.path, self.get('dir_queue')+'/'+path.basename(file.path), callback)
						}, callback)
					}
					else callback() ;
				});
			},

			// Get queue count
			count_queue: function(callback) {
				tools.walk(self.attributes.dir_queue, function(err, files) {
					callback(null, files.length)
				})
			},

			// Get crawling count
			count_crawling: function(callback) {
				tools.walk(self.attributes.dir_crawling, function(err, files) {
					callback(null, files.length)
				})
			},

			// Get done count
			count_done: function(callback) {
				tools.walk(self.attributes.dir_done, function(err, files) {
					callback(null, files.length)
				})
			}
		}, 

		// Fork the first crawl url
		function(err, success) {
			//console.log(success);
			if ( success ) self.attributes = _.extend(self.attributes, success);
			self.fork(); 
		});

		// Echo stats
		setInterval(function() {
			self.stats() ;
		}, 3000); 

	},

	// Fork a new crawling process
	fork: function() {
		var self = this;

		// Quit if all done
		if ( self.current > 0 && self.current == self.total ) {
			tools.log('Pages crawl is complete ! Bye...') ;
			process.exit(0);
			return;
		}

		// Exit if max of processes are running
		if ( (self.runningProcess >= self.maxProcess) || (!self.queue && self.runningProcess) ) {
			return false;
		}

		// If hits exceeds limits
		if (self.hitsPerSecond > self.maxHitsPerSecond) {
			process.nextTick(function() {
				setTimeout(function() {
					self.fork() ;
				}, 500); 
			}) ;
			return false;			
		}

		// Increment running processes
		self.runningProcess++;

		// Log
		//tools.debug("Fork :: "+__dirname+'/worker/ -> '+JSON.stringify(self.attributes));

		// Prepare a new worker
		var currentWorker = fork(__dirname+'/worker', [], {
			env: _.extend({}, process.env, {config: JSON.stringify(self.attributes)})
		}); 

		// Get message from worker
		currentWorker.on('message', function(msg) {

		}); 

		// Get exit from worker
		currentWorker.on('exit', function() {
			self.runningProcess--;
			self.history.push(moment()); 
			process.nextTick(function() {
				self.fork() ;
			}) ;
			process.nextTick(function() {
				self.fork() ;
			}) ;
		});

	},

	// Stats
	stats: function() {
		var self = this;

		// Create crawl folder working directory
		async.series({

			// Get queue count
			count_queue: function(callback) {
				tools.walk(self.attributes.dir_queue, function(err, files) {
					callback(null, files && files.length)
				})
			},

			// Get crawling count
			count_crawling: function(callback) {
				tools.walk(self.attributes.dir_crawling, function(err, files) {
					callback(null, files && files.length)
				})
			},

			// Get done count
			count_done: function(callback) {
				tools.walk(self.attributes.dir_done, function(err, files) {
					callback(null, files && files.length)
				})
			}
		}, 

		// Fork the first crawl url
		function(err, success) {

			// Get num of requests per minutes
			self.history = _.reject(self.history , function(hit){ 
				return ( hit < moment().add("minutes", -2) );
			});
			var time_range = moment() - _.first(self.history); 

			// Update hits
			if ( self.history.length && time_range > 0 ) {
				self.hitsPerSecond = self.history.length*1000/time_range;
			}

			// Get current counts
			self.queue = success.count_queue;
			self.current = success.count_done;
			self.total = (success.count_queue+success.count_crawling+success.count_done);
			self.progress = self.current*100/self.total;

			// Calculate ETA
			var passed_time = moment() - self.start_time; 
			var total_time = passed_time*100/self.progress;
			var eta = (self.total-self.current)*1000/self.hitsPerSecond;

			// Log
			tools.log("Running :: "+self.runningProcess+" :: Progress :: "+self.current+'/'+self.total+' ('+tools.number_format(self.progress, 1)+'%) :: HITS/s :: '+tools.number_format(self.hitsPerSecond, 2)+' :: ETA :: '+tools.formatTime(eta), 'brown');			
		});



	}

}); 