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
if (!cluster.isWorker) return false;

// Load datastore
var Datastore = require('./datastore/crawl.mysql') ;

// Load plugins
var plugins = require('./plugins'); 

// Start timer
var timer_start = new Date(); 

// Get the config
var Config = JSON.parse(process.env.attributes);

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
if ( Config.auth && Config.auth.user) {
	req_opts['auth'] = tools.extend(true, Config.auth, {'sendImmediately': false});
}

// Open datastore and start to request
var datastore = new Datastore(Config, function(err, res) {

	// Debug message
	tools.log('Open :: '+process.env.url, 'purple');

	// Get HTML
	request(req_opts, function(err, response, body) {

		// Prepare datas to send to manager
		var crawl = {
			url: process.env.url,
			time: new Date()-timer_start,
			datas: {}
		} ;

		// Manager errors
		if ( err ) {
			crawl.error = err; 
			tools.error(" >> "+process.env.url) ;
			tools.error(err);
			tools.warning(body);
		}

		// Parse body
		else {
			
			// Get jQuery element from body
			var document = $(response.body) ;

			// Store url into document
			document.url = crawl.url ;
			document.baseUrl = process.env.baseUrl ; 

			// Execute plugins
			_.each(plugins, function(plugin, name) {
				crawl.datas[name] = plugin(document);
			}); 

			// Get status Code
			crawl.statusCode = response.statusCode; 

		}

		// Insert and add links
		async.series({

			// Update current URL
			update: function(callback) {
				var sql = 'UPDATE seo_crawl SET ';
				var setters = ['status_code = '+datastore.db.escape(crawl.statusCode), 'load_time = '+datastore.db.escape(crawl.time), 'crawled_at = NOW()'];

				// Integrate basic meta tags if exists
				var metas = crawl.datas.metas; 
				if ( metas ) {
					setters.push('meta_title = '+datastore.db.escape(metas.title)); 
					setters.push('meta_desc = '+datastore.db.escape(metas.desc)); 
					setters.push('meta_canonical = '+datastore.db.escape(metas.canonical));
					setters.push('meta_keywords = '+datastore.db.escape(metas.keywords));
					setters.push('meta_noindex = '+datastore.db.escape(metas.noindex?1:0));
					setters.push('meta_nofollow = '+datastore.db.escape(metas.nofollow?1:0));
				}

				// Add plugins datas
				setters.push('plugins = '+datastore.db.escape(JSON.stringify(crawl.datas)));

				// Add setters for sql request
				sql += setters.join(', ');

				// Complete sql request
				sql += ' WHERE url = "'+crawl.url+'" LIMIT 1';

				// Debug and execute query
				//tools.debug(sql);
				datastore.db.query(sql, callback); 		
			},

			// Add links to queue
			links: function(callback) {

				// If no links to add, go next
				if ( ! crawl.datas.links || ! crawl.datas.links.length ) {
					callback(); 
					return;
				}

				// Else add all crawlable links
				var links = [] ;
				_.each(crawl.datas.links, function(link) {
					if ( link && link.crawl ) {
						links.push({
							referer: crawl.url,
							url: link.href
						}) ;
					}
				});

				// Add links
				datastore.add_queue(links, callback); 

			},

			// Count crawls in queue
			count_queue: function(callback) {
				var sql = "SELECT COUNT(url) as current FROM seo_crawl WHERE crawled_at IS NULL";
				datastore.db.query(sql, callback); 	
			},

			// Count total crawls
			count_total: function(callback) {
				var sql = "SELECT COUNT(url) as total FROM seo_crawl";
				datastore.db.query(sql, callback); 	
			}
		},

		// CLose this process and open another one
		function(err, results) {
			if ( err ) tools.error('Worker response :: '+JSON.stringify(err)) ;

			// Get progress
			var current = _.first(_.first(results.count_queue)).current;
			var total = _.first(_.first(results.count_total)).total;
			var progress = (total-current)*100/total; 

			// Log message
			tools.log('Complete :: '+crawl.url, 'lcyan'); 

			// Send stats
			process.send({
				current: (total-current),
				total: total,
				progress: progress,
				url: crawl.url
			})

		}) ;

		// Send parsing results to manager and exit
		//process.kill();

	}); 

}); 


