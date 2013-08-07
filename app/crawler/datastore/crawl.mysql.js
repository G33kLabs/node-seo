///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	cluster = require('cluster'),
	mysql = require("mysql") ;

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();

///////////////////////////////////////////////////////////// MYSQL DATASTORE ///////////////
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

	// Initialize
	initialize: function(opts, callback) {
		var self = this;

		// Start crawling
		self.start_time = moment() ;

		// Open database Link
		async.series({
			mysql: function(callback) {
				self.open_mysql(callback); 
			}	
		},

		// All dependencies are loaded
		function(err, res) {

			// If mysl error
			if ( err ) {
				tools.error(err);
			}

			// Returns callback
			if ( _.isFunction(callback) ) callback(err);

		})
	},


	// OPen mysql link
	open_mysql: function(callback) {
		var Config = this.get('db') ;
		this.db = mysql.createConnection('mysql://'+Config.user+':'+Config.password+'@'+Config.host+'/'+Config.database+'?debug=false&charset=UTF8_GENERAL_CI&timezone=0000');
		this.db.connect(callback) ;
	},

	// Add an url to parse
	add_queue: function(links, callback) {
		var self = this;

		// Build link if only one url
		if ( _.isString(links) ) links = [{url: links}];		

		// Prepare links to insert
		var check_links = {}; 
		_.each(links, function(link) {
			var relative_url = (link.url||'').replace(self.get('url'), '');
			if ( tools.trim(relative_url) != '' ) {
				check_links[relative_url] = link; 
			}
		}); 

		// Exit if no links to create
		if ( ! _.keys(check_links).length ) {
			return callback(); 
		}

		// Prepare test request
		var sql = "SELECT url FROM seo_crawl WHERE ";
		sql += _.map(check_links, function(link, url) {
			return "url = '"+link.url+"'";
		}).join(' OR '); 
		//console.log(sql);

		// Check
		var insert_sql = [] ;
		self.db.query(sql, function(err, replies) {

			// Mysql error
			if ( err && err.code ) tools.error("MYSQL error :: "+JSON.stringify(err)); 

			// Prepare rows to create
			_.each(check_links, function(link, url) {
				var found = _.findWhere(replies, {url: link.url});
				if ( !found ) {
					insert_sql.push("INSERT DELAYED INTO seo_crawl SET url = '"+link.url+"', status_code = 'Crawling', referer = '"+(link.referer?link.referer:'')+"', created_at = NOW() "); 
				}
			}); 

			// Insert each row
			if ( insert_sql.length ) {
				async.forEachSeries(insert_sql, function(sql, callback) {
					self.db.query(sql, function(err, res) {
						if ( err && err.code ) tools.error("MYSQL error :: "+JSON.stringify(err)); 
						//if ( !err ) tools.log("Add an URL to the queue :: "+link.url) ;
						callback(null, res) ;
					}) ;
				}, callback)
			}

			// Else exit
			else {
				return callback(); 
			}

		}); 

		/*
		return false;

		// Add url to queue if not yet in DB
		async.series({

			// Check if not yet exists
			check: function(callback) {
				var sql = "SELECT url FROM seo_crawl WHERE url = '"+link.url+"' LIMIT 1";
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
				//tools.warning(sql); 
				self.db.query(sql, function(err, res) {
					//if ( !err ) tools.log("Add an URL to the queue :: "+link.url) ;
					callback(err, res) ;
				}) ;
			}

		}, 

		// Queue is managed : go next
		function(err) {
			if ( err && err.code ) tools.error("MYSQL error :: "+JSON.stringify(err)); 
			callback(); 
		});
*/

	},

	// Returns a record to crawl
	getRecord: function(callback) {
		var self = this;

		// Try to find a record in DB to parse
		var sql = "SELECT * FROM seo_crawl WHERE crawled_at IS NULL ORDER BY RAND() LIMIT 1" ;
		self.db.query(sql, function(err, replies) {

			// Something to parse
			if ( replies.length && (replies = _.first(replies)) ) {

				// Set as crawling
				var sql = 'UPDATE seo_crawl SET crawled_at = NOW() WHERE url = "'+replies.url+'" LIMIT 1';
				self.db.query(sql, function() {
					callback(err, replies.url?replies:null);
				}); 

			}

			// Callback
			else {
				callback(err, replies.url?replies:null);
			}

		}); 
	}

});