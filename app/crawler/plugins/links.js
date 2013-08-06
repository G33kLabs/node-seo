var sanitize = require('validator').sanitize;
module.exports = function($el) {

	// Init datas and links container
	var datas = [];

	// Get robots metas
	var meta_robots = $el.find('meta[name="robots"]').attr('content'); 
	var robots_nofollow = /nofollow/.test(meta_robots) ? true : false;

	// Get all links
	$el.find('a,link[rel="prev"],link[rel="next"]').each(function() {

		// Prepapre link to add
		var link = {
			href: this.getAttribute("href"),
			title: this.getAttribute("title"),
			text: sanitize(this.textContent || this.innerText).trim(),
			html: sanitize(this.innerHTML).trim()
		}; 

		// Get relative url if internal
		link.href = link.href.replace($el.baseUrl, '');

		// If link has a nofollow reference
		if ( this.getAttribute("rel") == 'nofollow' || robots_nofollow ) {
			link.nofollow = true;
		}

		// If link is a javascript reference
		if ( /^(#|javascript)/.test(link.href) ) {
			link.empty = true;
		}

		// If link is an image
		else if ( /(jpg|png|gif|pdf|zip|tar|gz|swf|flv|mp3|wav|mp4)$/i.test(link.href) ) {
			link.asset = true;
		}

		// If link is an image
		else if ( /^\/forum/i.test(link.href) ) {
			link.ignore = true;
		}

		// Prepend site url if internal link
		else if ( !/^(http|https|mailto)\:/.test(link.href) ) {
			link.href = ($el.baseUrl+link.href);
			link.crawl = true;
		}

		// External link
		else {
			link.external = true;
		}

		// Add link to returned links
		datas.push(link); 

	})

	// Return completed datas
	return datas; 

}