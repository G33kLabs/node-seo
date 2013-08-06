////////////////////////////////////////////////////////////////////////// DECLARE GLOBALS
GLOBAL._ = require('underscore') ;
GLOBAL.Backbone = require('backbone') ;
GLOBAL.json = JSON.stringify ;
GLOBAL.async = require('async') ;
GLOBAL.path = require('path') ;
GLOBAL.fs = require('fs') ;
GLOBAL.foo = function() {};
GLOBAL.moment = require('moment') ;

// -- Short for json stringhify function
GLOBAL.json = JSON.stringify ;
exports.json = JSON.stringify ;

////////////////////////////////////////////////////////////////////////// LOAD LIBS
exports.crypto = require('crypto') ;
exports.sys = require('util') ;
exports.url = require('url') ;
exports.colors = require('./termcolors.js').colors ;

///////////////////////////////////////////////////////////////////////// CONSOLE LOGGING
// Log & error functions
var cluster = require('cluster') ;
exports.log = function(obj, color) { 
    color = color || 'green'; 

    // -- Trim and transform object to json
    obj = exports.trim((typeof obj == 'string' ) ? obj : json(obj, null, 4)) ;

    // -- Add log prefix if not yet present
    if ( ! /^(\ \[|\[)/.test(obj) ) obj = '[ ] '+obj; 

    // -- Prefix time
    if ( ! process.env.DEV ) {
      obj = moment().format('YYYY-MM-DD HH:mm:ss')+' '+obj;
    }

    // -- Add cluster informations
    if ( typeof cluster != 'undefined' ) {
        var cluster_id = cluster.worker ? cluster.worker.id : 'M' ;
        if ( ! (/\[(.*)\] \d/).test(obj) ) {
            obj = obj.replace(/\[(.*)\]/, '[$1] '+cluster_id+ ' |') ;
            //console.log(obj.replace(/^\[(.*)\]/, '[$1] '+cluster_id+ ' | '))
            //console.log(cluster_id) ;
        }
    }

    // -- Ouput it
    if ( typeof logger != 'object' ) {
        process.stdout.write(exports.colors[color](exports.trim(obj)+"\n", true)) ; 
    }
    else {
        logger.write(exports.colors[color](exports.trim(obj), true)+"\n");
    }
}
exports.debug = function(obj) { exports.log(obj, 'lgray') ; }
exports.error = function(obj) { exports.log(obj, 'red') ; }
exports.warning = function(obj) { exports.log(obj, 'brown') ; }

/*******************************************************************
 * JSON Heavy serializer/deserializer
 *******************************************************************/
exports.jsonStringify = function(obj, ident, pType) {
  var parts = [], 
    objectType = typeof obj,
    identSpaces = '',
    wrapper = ['',''];

  ident = ident || 0;
  for ( var i=0; i < ident+1; i++) identSpaces+="\t" ;

  if ( ! ident && _.isArray(obj) ) wrapper = ["[\n", "\n]"] ;
  else if ( ! ident && _.isObject(obj) ) wrapper = ["{\n", "\n}"] ;

  _.each(obj, function(val, key) {

    // Get current object type
    var type = _.isArray(val) ? 'array' : (_.isNull(val) || _.isUndefined(val)) ? null : _.isDate(val) ? 'date' : typeof val;

    // Don't add key if parent type is an array
    key = identSpaces+(pType=='array'?'':'"'+key+'"'+": ");

    // Debug
//    console.log(key, "Type: "+type, "Parent: "+pType, val, val.toJSON?val.toJSON():null)

    // Push output or go deep in object
    if ( type == 'array' ) {
      parts.push(key+"[\n"+exports.jsonStringify(val, ident+1, type)+"\n"+identSpaces+"]");
    }
    else if ( type == 'object' ) {
      parts.push(key+"{\n"+exports.jsonStringify(val, ident+1, type)+"\n"+identSpaces+"}");
    }
    else if ( type == 'function' ) {
      parts.push(key+val.toString());
    }
    else {
      if ( _.isFunction(val.toJSON) ) parts.push(key+'"'+val.toJSON()+'"');
      else parts.push(key+JSON.stringify(val));
    }

  })

  return wrapper[0]+parts.join(",\n")+wrapper[1];
}

exports.jsonParse = function(str) {
  var obj;
  try { eval("obj = "+str) } catch(e) { 
    exports.error("JSON Parse :: "+e)
  }
  return obj;
}

/*******************************************************************
 * Print array of columns and rows : excellent for fast reporting !
 *******************************************************************/
exports.printArray = function(lines, title) {

  // Get max length of each column
  var columnCount = lines[0].length; 
  var columnLength = []; 
  var out = "\n";
  for ( var i=0; i<lines.length; i++ ) {
    for ( var j=0; j<columnCount; j++ ) {
      columnLength[j] = columnLength[j] || 0 ;
      columnLength[j] = Math.max(columnLength[j], (lines[i][j]+'').length) ;
    }
  }

  // Draw a title
  if ( title ) out += title+"\n"+tools.str_pad('', title.length, '=')+"\n" ;

  // Draw well formatted device report state
  for ( var i=0; i<lines.length; i++ ) {
    
    // Write columns
    if ( i == 0 ) {
      out += '+ '
      for ( var j=0; j<columnCount; j++ ) { out += tools.str_pad("", columnLength[j], '-', 'STR_PAD_RIGHT') +' + ' }
      out += "\n"       
    }

    // Write datas
    out += '| ';
    for ( var j=0; j<columnCount; j++ ) {
      out += tools.str_pad(lines[i][j], columnLength[j], ' ', 'STR_PAD_RIGHT') +' | ' ;
    }
    out += "\n" 

    // Write table bottom
    if ( i == 0 || (i == lines.length-1) ) {
      out += '+ ';
      for ( var j=0; j<columnCount; j++ ) { out += tools.str_pad("", columnLength[j], '-', 'STR_PAD_RIGHT') +' + ' }
      if (!i) out += "\n"       
    }
  }

  // Print report
  console.log(out)

}

/*******************************************************************
 * Objects operations
 *******************************************************************/
exports.extend = function() {
    var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = false,
    toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    push = Array.prototype.push,
    slice = Array.prototype.slice,
    trim = String.prototype.trim,
    indexOf = Array.prototype.indexOf,
    class2type = {
      "[object Boolean]": "boolean",
      "[object Number]": "number",
      "[object String]": "string",
      "[object Function]": "function",
      "[object Array]": "array",
      "[object Date]": "date",
      "[object RegExp]": "regexp",
      "[object Object]": "object"
    },
    jQuery = {
      isFunction: function (obj) {
        return jQuery.type(obj) === "function"
      },
      isArray: Array.isArray ||
      function (obj) {
        return jQuery.type(obj) === "array"
      },
      isWindow: function (obj) {
        return obj != null && obj == obj.window
      },
      isNumeric: function (obj) {
        return !isNaN(parseFloat(obj)) && isFinite(obj)
      },
      type: function (obj) {
        return obj == null ? String(obj) : class2type[toString.call(obj)] || "object"
      },
      isPlainObject: function (obj) {
        if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
          return false
        }
        try {
          if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
            return false
          }
        } catch (e) {
          return false
        }
        var key;
        for (key in obj) {}
        return key === undefined || hasOwn.call(obj, key)
      }
    };
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }
  if (typeof target !== "object" && !jQuery.isFunction(target)) {
    target = {}
  }
  if (length === i) {
    target = this;
    --i;
  }
  for (i; i < length; i++) {
    if ((options = arguments[i]) != null) {
      for (name in options) {
        src = target[name];
        copy = options[name];
        if (target === copy) {
          continue
        }
        if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
          if (copyIsArray) {
            copyIsArray = false;
            clone = src && jQuery.isArray(src) ? src : []
          } else {
            clone = src && jQuery.isPlainObject(src) ? src : {};
          }
          // WARNING: RECURSION
          target[name] = exports.extend(deep, clone, copy);
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }
  return target;
}

//////////////////////////////////////////////////////////// Get client ip
exports.getClientIp = function(req) {
    var ipAddress;
    if ( ! req || ! req.header ) return null;

    // Amazon EC2 / Heroku workaround to get real client IP
    var forwardedIpsStr = req.header('x-forwarded-for');
    if (forwardedIpsStr) {
        // 'x-forwarded-for' header may return multiple IP addresses in
        // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
        // the first one
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }
    if (!ipAddress) {
        // Ensure getting client IP address still works in
        // development environment
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
};


//////////////////////////////////////////////////////////// Detect mobile devices
exports.isMobile = function(req) {
    var ua = req.headers['user-agent'],
        check = {} ;

    if (/mobile/i.test(ua))
        check.Mobile = true;

    if (/like Mac OS X/.test(ua)) {
        check.iOS = /CPU( iPhone)? OS ([0-9\._]+) like Mac OS X/.exec(ua)[2].replace(/_/g, '.');
        check.iPhone = /iPhone/.test(ua);
        check.iPad = /iPad/.test(ua);
    }

    if (/Android/.test(ua))
        check.Android = /Android ([0-9\.]+)[\);]/.exec(ua)[1];

    if (/webOS\//.test(ua))
        check.webOS = /webOS\/([0-9\.]+)[\);]/.exec(ua)[1];

    if (/(Intel|PPC) Mac OS X/.test(ua))
        check.Mac = /(Intel|PPC) Mac OS X ?([0-9\._]*)[\)\;]/.exec(ua)[2].replace(/_/g, '.') || true;

    if (/Windows NT/.test(ua))
        check.Windows = /Windows NT ([0-9\._]+)[\);]/.exec(ua)[1];   

    return (check.Mobile || check.iOS || check.iPhone || check.iPad || check.Android || check.webOS);     
}

/*******************************************************************
 * Format operations
 *******************************************************************/
// -- Return filesize
exports.formatSize = function(bytes, round) {
  round = round || 2
	var labels = new Array('TB', 'GB', 'MB', 'kB', 'b');
	var measurements = new Array(1099511627776, 1073741824, 1048576, 1024, 1);
	for(var i=0; i<measurements.length; i++) {
		var conv = bytes/measurements[i];
		if(conv > 1) {
			return exports.number_format((conv*10)/10, round, '.')+' '+labels[i];
		}
	}
}

// -- Format time
exports.formatTime = function(ms) {
    var secs = ms/1000 ;
    var hr = Math.floor(secs / 3600);
    var min = Math.floor((secs - (hr * 3600))/60);
    var sec = Math.floor(secs - (hr * 3600) - (min * 60));
    
    if (hr < 10) hr = "0" + hr;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;
    //if (hr) hr = "00";
    return (hr > 0 ? hr + ':' : '') + min + ':' + sec;
}

// -- Return seconds with duration like 00:00:00 or 00:00
exports.formatDuration = function(duration) {
    duration = (duration||'').split(':') ;
    var seconds = 0 ; 
    if ( duration.length == 3 ) seconds += parseInt(duration.shift())*3600;
    seconds += parseInt(duration.shift())*60;
    seconds += parseInt(duration.shift());
    return seconds;
}

// -- Return ms with duration like 00:00:00 or 00:00
exports.formatDuration_ms = function(duration) {
    return exports.formatDuration(duration)*1000;
}

// -- Number Format
exports.number_format = function(number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

// -- Check email
exports.validateEmail = function(email){
    return /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(email);
}

// -- Reduce a string
exports.reduce_string = function(str, max, ratio) {
    str = (str || '')+'' ;
    max = max || 25;
    ratio = ratio || 0.5; 

    if ( str.length > max ) {
        var start_cut = Math.floor(max*ratio);
        var end_cut = Math.floor(max*(1-ratio));
        str = str.slice(0, start_cut)+'...'+str.slice(-1*end_cut); 
    }

    return str;
}

/*******************************************************************
 * Camelize/Uncamelize a string (border-bottom <-> borderBottom)
 *******************************************************************/

exports.camelize = function(str) {
    return (str + "").replace(/-\D/g, function(match) {
        return match.charAt(1).toUpperCase();
    });
}

exports.hyphenate = function(str) {
    return (str + "").replace(/[A-Z]/g, function(match) {
        return "-" + match.toLowerCase();
    });
}


/*******************************************************************
 * Path walking
 *******************************************************************/

// -- Walk directory
exports.walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          exports.walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push({path: file, mtime: stat.mtime, size: stat.size});
          next();
        }
      });
    })();
  });
};

// -- Recursive mkdir -p
exports.createFullPath = function(fullPath, callback) {
    var parts = path.dirname(path.normalize(fullPath)).split("/"),
        working = '/',
        pathList = [];
    
    for(var i = 0, max = parts.length; i < max; i++) {
        working = path.join(working, parts[i]);
        pathList.push(working);
    }

    //console.log('---------------------------------------')
    //console.log(pathList)
    //console.log('---------------------------------------')

    var recursePathList = function recursePathList(paths) {
        if(0 === paths.length) { callback(null, 'complete'); return ; }
        var working = paths.shift();
        try {
           // console.log('--> '+working)
            fs.exists(working, function(exists) {
                if(!exists) {
                    try {
                        fs.mkdir(working, 0755, function(err, success) {
                            if ( err ) console.log(err)
                            //console.log(success)
                            recursePathList(paths);
                        });
                    } catch(e) {
                        callback(new Error("Failed to create path: " + working + " with " + e.toString()));
                    }
                } else { recursePathList(paths); }
            });
        } catch(e) { callback(new Error("Invalid path specified: " + working)); }
    }
    
    if(0 === pathList.length) callback(new Error("Path list was empty"));
    else recursePathList(pathList);
}

/////////////////////////////////////////////////////////////////// STRING FUNCTIONS

// -- Return an integer random value
exports.rand = function() {
	var r = Math.random() ;
	var args = [] ;
	for ( i in arguments ) args.push(arguments[i]) ;

	if ( args.length == 0 ) return Math.floor(r*10000000000000000) ;
	else if ( args.length == 1 ) return Math.floor(r*args[0]) ;
	else if ( args.length == 2 ) return parseFloat(args[0]) + Math.floor(r*(args[1]-args[0])) ;
}

// -- Return now timestamp
exports.now = function() {
	return (new Date().getTime()) ;
}

// -- Trim a string
exports.trim = function(str) {
	return (str||'').replace(/^\s+|\s+$/g,"").toString();
}

// -- UpperCase words
exports.ucwords = function(str) {
    return (str + '').replace(/^([a-z])|\s+([a-z])/g, function ($1) {
        return $1.toUpperCase();
    });
} ;

// -- Upper case first char
exports.ucfirst = function (str) {
    str += '';
    var f = str.charAt(0).toUpperCase();
    return f + str.substr(1);
}

// -- Return filename extension
exports.extension = function(fileName) {
  fileName = fileName||'';
  return fileName.substr(fileName.lastIndexOf('.') + 1);
} ;

// -- Sripslashes
exports.stripslashes = function(str) {
	str=(str||'').replace(/\\'/g,'\'');
	str=str.replace(/\\"/g,'"');
	str=str.replace(/\\0/g,'\0');
	str=str.replace(/\\\\/g,'\\');
	return str;
}

// -- Striptags (phpjs) 
exports.strip_tags = function (input, allowed, replacement) {
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

// -- Return md5
exports.md5 = function(str) {
	return exports.crypto.createHash('md5').update(str).digest("hex");
}

// -- Clean a string from json
exports.cleanStr = function(str) {
	return (str||'').replace(/^\s+|\s+$/g,"").replace(/^\"(.*)\"$/, "$1");
}

// -- Return a clean html string
exports.cleanHtml = function(html) {
	html = html || '' ;
	
	// -- Replace unused tabs and retuns
	html = html.replace(/\n/g, '') ;
	html = html.replace(/\r/g, '') ;
	html = html.replace(/\t/g, '') ;
	
	// -- Remove xml header for dom parsing
	html = html.replace('<?xml version="1.0" encoding="ISO-8859-1"?>', '') ;
	//html = '<html'+html.split('<html')[1] ;
	
	// -- Trim html
	html = exports.trim(html) ;
	
	// -- Return formated html
	return html ;
	
}

// -- Return a clean number from string
exports.cleanNumber = function(str) {
	return parseFloat((str||'').replace(/ /g, '')) ;
}

/////////////////////////////////////////////////////////////////// CACHE

// -- Latinise strings
var Latinise={};Latinise.latin_map={"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"};
String.prototype.latinise=function(){return this.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return Latinise.latin_map[a]||a})};
String.prototype.latinize=String.prototype.latinise;
String.prototype.isLatin=function(){return this==this.latinise()}

// -- Return a permalink
exports.permalink = function(str) {
    return str.latinize().replace(/[^a-z0-9]+/gi, '-').replace(/^-*|-*$/g, '').toLowerCase();
}

// -- Return teaser
exports.teaser = function (input, maxChars) {
    // token matches a word, tag, or special character
    var token = /\w+|[^\w<]|<(\/)?(\w+)[^>]*(\/)?>|</g,
        selfClosingTag = /^(?:[hb]r|img)$/i,
        output = "",
        charCount = 0,
        openTags = [],
        match;

    // Set the default for the max number of characters
    // (only counts characters outside of HTML tags)
    maxChars = maxChars || 250;

    while ((charCount < maxChars) && (match = token.exec(input))) {
        // If this is an HTML tag
        if (match[2]) {
            output += match[0];
            // If this is not a self-closing tag
            if (!(match[3] || selfClosingTag.test(match[2]))) {
                // If this is a closing tag
                if (match[1]) openTags.pop();
                else openTags.push(match[2]);
            }
        } else {
            charCount += match[0].length;
            if (charCount <= maxChars) output += match[0];
        }
    }

    // Close any tags which were left open
    var i = openTags.length;
    while (i--) output += "</" + openTags[i] + ">";
    
    return output;
};
	
// -- Return a formated process mem usage in Mb -------------
// tools.getMemUsage(mem, function (data) {
//	    console.log(data) ; 	// 115.62
//	}) ;
// ----------------------------------------------------------
exports.getMemUsage = function(mem) {
	if ( ! mem || ! mem.heapTotal ) return false;
	return (mem.rss/1024/1024).toFixed(2) ;
}

// -- Return public ip address ------------------------------
exports.getServerIp = function() {
	var os=require('os'),
		ifaces=os.networkInterfaces(),
		ips = [];

	for (var dev in ifaces) {
		ifaces[dev].forEach(function(details){
			if (details.family=='IPv4' && details.address != '127.0.0.1') {
				ips.push(details.address) ;
			}
		});
	}
	return ips ;
}


exports.str_pad = function (input, pad_length, pad_string, pad_type) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // + namespaced by: Michael White (http://getsprink.com)
    // +      input by: Marco van Oort
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: str_pad('Kevin van Zonneveld', 30, '-=', 'STR_PAD_LEFT');
    // *     returns 1: '-=-=-=-=-=-Kevin van Zonneveld'
    // *     example 2: str_pad('Kevin van Zonneveld', 30, '-', 'STR_PAD_BOTH');
    // *     returns 2: '------Kevin van Zonneveld-----'
    var half = '',
        pad_to_go;

    var str_pad_repeater = function (s, len) {
        var collect = '',
            i;

        while (collect.length < len) {
            collect += s;
        }
        collect = collect.substr(0, len);

        return collect;
    };

    input += '';
    pad_string = pad_string !== undefined ? pad_string : ' ';

    if (pad_type != 'STR_PAD_LEFT' && pad_type != 'STR_PAD_RIGHT' && pad_type != 'STR_PAD_BOTH') {
        pad_type = 'STR_PAD_RIGHT';
    }
    if ((pad_to_go = pad_length - input.length) > 0) {
        if (pad_type == 'STR_PAD_LEFT') {
            input = str_pad_repeater(pad_string, pad_to_go) + input;
        } else if (pad_type == 'STR_PAD_RIGHT') {
            input = input + str_pad_repeater(pad_string, pad_to_go);
        } else if (pad_type == 'STR_PAD_BOTH') {
            half = str_pad_repeater(pad_string, Math.ceil(pad_to_go / 2));
            input = half + input + half;
            input = input.substr(0, pad_length);
        }
    }

    return input;
}


// -- PHPJS : base64 encode & decode
exports.base64_encode = function(data){var b64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var o1,o2,o3,h1,h2,h3,h4,bits,i=0,ac=0,enc="",tmp_arr=[];if(!data){return data;}
data=exports.utf8_encode(data+'');do{o1=data.charCodeAt(i++);o2=data.charCodeAt(i++);o3=data.charCodeAt(i++);bits=o1<<16|o2<<8|o3;h1=bits>>18&0x3f;h2=bits>>12&0x3f;h3=bits>>6&0x3f;h4=bits&0x3f;tmp_arr[ac++]=b64.charAt(h1)+b64.charAt(h2)+b64.charAt(h3)+b64.charAt(h4);}while(i<data.length);enc=tmp_arr.join('');switch(data.length%3){case 1:enc=enc.slice(0,-2)+'==';break;case 2:enc=enc.slice(0,-1)+'=';break;}
return enc;}

exports.base64_decode = function(data){var b64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var o1,o2,o3,h1,h2,h3,h4,bits,i=0,ac=0,dec="",tmp_arr=[];if(!data){return data;}
data+='';do{h1=b64.indexOf(data.charAt(i++));h2=b64.indexOf(data.charAt(i++));h3=b64.indexOf(data.charAt(i++));h4=b64.indexOf(data.charAt(i++));bits=h1<<18|h2<<12|h3<<6|h4;o1=bits>>16&0xff;o2=bits>>8&0xff;o3=bits&0xff;if(h3==64){tmp_arr[ac++]=String.fromCharCode(o1);}else if(h4==64){tmp_arr[ac++]=String.fromCharCode(o1,o2);}else{tmp_arr[ac++]=String.fromCharCode(o1,o2,o3);}}while(i<data.length);dec=tmp_arr.join('');dec=exports.utf8_decode(dec);return dec;}

exports.utf8_decode = function(str_data){var tmp_arr=[],i=0,ac=0,c1=0,c2=0,c3=0;str_data+='';while(i<str_data.length){c1=str_data.charCodeAt(i);if(c1<128){tmp_arr[ac++]=String.fromCharCode(c1);i++;}else if((c1>191)&&(c1<224)){c2=str_data.charCodeAt(i+1);tmp_arr[ac++]=String.fromCharCode(((c1&31)<<6)|(c2&63));i+=2;}else{c2=str_data.charCodeAt(i+1);c3=str_data.charCodeAt(i+2);tmp_arr[ac++]=String.fromCharCode(((c1&15)<<12)|((c2&63)<<6)|(c3&63));i+=3;}}
return tmp_arr.join('');}
exports.utf8_encode = function(string){string=(string+'').replace(/\r\n/g,"\n").replace(/\r/g,"\n");var utftext="";var start,end;var stringl=0;start=end=0;stringl=string.length;for(var n=0;n<stringl;n++){var c1=string.charCodeAt(n);var enc=null;if(c1<128){end++;}else if((c1>127)&&(c1<2048)){enc=String.fromCharCode((c1>>6)|192)+String.fromCharCode((c1&63)|128);}else{enc=String.fromCharCode((c1>>12)|224)+String.fromCharCode(((c1>>6)&63)|128)+String.fromCharCode((c1&63)|128);}
if(enc!=null){if(end>start){utftext+=string.substring(start,end);}
utftext+=enc;start=end=n+1;}}
if(end>start){utftext+=string.substring(start,string.length);}
return utftext;}

/*Accepts a Javascript Date object as the parameter;
  outputs an RFC822-formatted datetime string. */
exports.GetRFC822Date = function (oDate) {
    var aMonths = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    
    var aDays = new Array( "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
    var dtm = new String();
            
    dtm = aDays[oDate.getDay()] + ", ";
    dtm += padWithZero(oDate.getDate()) + " ";
    dtm += aMonths[oDate.getMonth()] + " ";
    dtm += oDate.getFullYear() + " ";
    dtm += padWithZero(oDate.getHours()) + ":";
    dtm += padWithZero(oDate.getMinutes()) + ":";
    dtm += padWithZero(oDate.getSeconds()) + " " ;
    dtm += getTZOString(oDate.getTimezoneOffset());
    return dtm;
}

// Pads numbers with a preceding 0 if the number is less than 10.
function padWithZero(val) {
    if (parseInt(val) < 10) return "0" + val;
    return val;
  }

// Declare as a global var : tools
GLOBAL.tools = exports ;
