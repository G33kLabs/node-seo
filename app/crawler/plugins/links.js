var sanitize = require('validator').sanitize;
module.exports = function($el) {

	// Init datas and links container
	var datas = {};
	datas.links = datas.links || [];

	// Get all links
	$el.find('a').each(function() {

		// Prepapre link to add
		var link = {
			href: this.getAttribute("href"),
			title: this.getAttribute("title"),
			text: sanitize(this.textContent || this.innerText).trim(),
			html: sanitize(this.innerHTML).trim()
		}; 

		// If link has a nofollow reference
		if ( this.getAttribute("rel") == 'nofollow' ) {
			link.nofollow = true;
		}

		// If link is a javascript reference
		if ( /^(#|javascript)/.test(link.href) ) {
			link.empty = true;
		}

		// If link is an image
		else if ( /(jpg|png|gif)$/i.test(link.href) ) {
			link.asset = true;
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
		datas.links.push(link); 

	})

	// Return completed datas
	return datas; 

}