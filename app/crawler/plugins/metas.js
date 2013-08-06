module.exports = function($el) {

	var datas = {};

	// Get basic meta tags
	datas.title = $el.find('title').html(); 
	datas.desc = $el.find('meta[name="description"]').attr('content') ;
	datas.keywords = $el.find('meta[name="keywords"]').attr('content') ;

	// Get thumb
	datas.thumb = $el.find('meta[property="og:image"]').attr('content'); 

	// Get canonical
	datas.canonical = $el.find('link[rel="canonical"]').attr('href'); 

	// Get robots metas
	var meta_robots = $el.find('meta[name="robots"]').attr('content'); 
	if ( /nofollow/.test(meta_robots) ) datas.nofollow = true;
	if ( /noindex/.test(meta_robots) ) datas.noindex = true;

	// Meta Tags debug
	// tools.warning('---- METAS ----') ;
	// tools.warning('URL :: '+$el.url);
	// tools.warning(' TITLE :: '+datas.title);
	// tools.warning(' DESC :: '+datas.desc);
	// tools.warning(' CANONICAL :: '+datas.canonical);
	// if ( datas.thumb ) tools.warning(' THUMB :: '+datas.thumb);

	// Return completed datas
	return datas; 

}