///////////////////////////////////////////////////////////// LOAD LIBS /////////////
var path = require('path'),
	colors = require('colors'),
	fs = require('fs');

///////////////////////////////////////////////////////////// CHANGE WORKING PATH /////////////
process.chdir(path.normalize(__dirname+'/../../')) ;
GLOBAL.root_path = process.cwd() ;

///////////////////////////////////////////////////////////// TOOLS KIT ///////////////
GLOBAL.tools = require(root_path+'/libs/tools.kit') ;
GLOBAL.logger = require('logger').createLogger();

///////////////////////////////////////////////////////////// ARGUMENTS ///////////////
var program = require('commander') ;
program
  .version('0.0.1')
  .option('-i, --config [config]', 'Config file in JSON', 'sample')
  .option('-u, --url [url]', 'Website url root')
  .option('-U, --user [user]', 'Auth username')
  .option('-P, --password [password]', 'Auth password')
  .option('-r, --reset [reset]', 'Reset seo_crawl table before starting ', Boolean, false)
  .option('-c, --clean [clean]', 'Clean not edited records in seo table before starting ', Boolean, false)
  .option('-p, --process [process]', 'Number of processes to use for crawling', require('os').cpus().length)
  .parse(process.argv);

///////////////////////////////////////////////////////////// LOAD CONFIG ///////////////
var opts = {};

// Get config file
if ( program.config ) opts = tools.jsonParse(fs.readFileSync(root_path+"/app/config/"+program.config+".json"));

// Complete options with args in command line
if ( program.process ) opts.num_process = program.process;
if ( program.url ) opts.url = program.url;
if ( ! opts.clean_db ) opts.clean_db = program.clean;
if ( ! opts.reset_db ) opts.reset_db = program.reset;

///////////////////////////////////////////////////////////// LAUNCHER CONFIG ///////////////
tools.log('------------------------------------', 'lcyan');
tools.log(' URL : '+opts.url, 'lcyan');
tools.log(' CLEAN SEO DB : '+(opts.clean_db?'yes':'no'), 'lcyan');
tools.log(' RESET CRAWL DB : '+(opts.reset_db?'yes':'no'), 'lcyan');
tools.log(' NB PROCESS : '+opts.num_process, 'lcyan');
tools.log('------------------------------------', 'lcyan');

///////////////////////////////////////////////////////////// PROCESS MANAGER ///////////////
var CrawlerManager = require(root_path+'/app/crawler/manager') ;
var manager = new CrawlerManager(opts); 
