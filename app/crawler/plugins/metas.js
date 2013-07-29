module.exports = function($el) {

	var datas = {};

	// Get basic meta tags
	datas.meta_title = $el.find('title').html(); 
	datas.meta_desc = $el.find('meta[name="description"]').attr('content') ;
	datas.meta_keywords = $el.find('meta[name="keywords"]').attr('content') ;

	// Get thumb
	datas.meta_thumb = $el.find('meta[property="og:image"]').attr('content'); 

	// Get canonical
	datas.meta_canonical = $el.find('link[rel="canonical"]').attr('href'); 

	// Meta Tags debug
	tools.warning('---- METAS ----') ;
	tools.warning('URL :: '+$el.url);
	tools.warning(' TITLE :: '+datas.meta_title);
	tools.warning(' DESC :: '+datas.meta_desc);
	tools.warning(' CANONICAL :: '+datas.meta_canonical);
	if ( datas.meta_thumb ) tools.warning(' THUMB :: '+datas.meta_thumb);

	// Return completed datas
	return datas; 

}