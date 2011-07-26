/*!
 * jQuery ColourLovers Wizard
 * (c) 2011, Christophe Desguez - EIDOLON LABS
 * Licensed under the MIT license.
 */
ColourLoversWizard = function(settings) {
	var wiz = this; // to reference it inside inner functions

	this.options = $.extend({
			loadingGif: "http://www.stylstav.eu/images/gallery/loading.gif" //"/images/3dots.gif"
		},
		settings
	);

	var defaultFormat = function(x) {
		return Number(x).toLocaleString();
	};

	// Helper function ; return the function that does the real job
	// for a given Stat : i.e. makes the Ajax call,
	// and updates the target element(s) (based on their css selector)
	var getStat = function(key, target, format) {
		var fmt = (format && $.isFunction(format)) ? format : defaultFormat;
		var url = "http://colourlovers.com/api/stats/" + key
					+ "?format=json&jsonCallback=?";
		return function() {
			$.getJSON(
				url, null, // params
				function(responseData) { // populate the result to display the image
					$(target).html(fmt(responseData.total));
				}
			);
		};
	};

	// Helper function :
	// Apply an array of colors to a mapping of elements defined
	// by ther css selector and attribute to modify : color, background or border
	var applyPalette = function(palette, colorMaps) {
		$.each(colorMaps, function(i, cMap) {
			var color = palette[i]; // allow the inner closure to see the colors
			$.each(cMap, function(j, mapping) {
				// mapping is an object of the form :
				// {[color|background|border] : "<css selector>"}
				if (mapping.color) {
					$(mapping.color).css({"color": color});
				}
				if (mapping.background) {
					$(mapping.background).css({"background-color": color});
				}
				if (mapping.border) {
					$(mapping.border).css({"border-color": color});
				}
			});
		});
	};

	// store the stats functions
	this.stats = [];

	/**
	 * Tells the wizard to update some zones with stats from the ColourLovers API
	 */
	this.displayStats = function(mapping) {

		$.each(["colors", "patterns", "palettes", "lovers"], function(i, stat) {
			if (mapping[stat]) {
				wiz.stats.push(getStat(stat, mapping[stat]));
			}
		});

		return wiz.refreshStats();
	};

	/**
	 * Cause all the defined stats to be retrieved again
	 */
	this.refreshStats = function() {

		for (var i=0, len=wiz.stats.length; i<len; i++) {
			setTimeout(wiz.stats[i], 10); // do not block the UI
		}
		return wiz;
	};

	/**
	 * Declare a new search form to use for patterns or palettes search
	 * Options may specify the target zone to render the search results
	 */
	this.searchForm = function(options) {

		var searchUrl  = "http://colourlovers.com/api/" + (options.type || "patterns");

		var $frm = $(options.input);
		if (!$frm.is("form")) {
			throw "You should choose an existing form for your search !";
		}
		var displayResult = $(options.display);

		// create a hidden 'numResults' field if the user hasn't
		var pageSize = $("input[name=numResults]", $frm).val();
		if (typeof pageSize == "undefined") {
			pageSize = $("<input>").attr("name", "numResults").attr("type", "hidden").attr("value", 20).appendTo($frm).val();
		}

		// store these extra data as a search context that we can retrieve later
		$frm.data("colourlovers.search", {
			"target": displayResult,
			"pageSize": pageSize,
			"page": 0,
		});

		// Define the search action
		$frm.submit(function(evt) {

			var $frm = $(this), context = $frm.data("colourlovers.search"), searchParams = $frm.serialize();
			if (context.loading) {
				return; // don't submit another search before the precedent is ended
			}
			if (context.lastSearch && searchParams != context.lastSearch) {
				context.page = 0
			} else if (context.page) { // > 0 : load another page
				searchParams += ("&resultOffset=" + (context.page*context.pageSize));
			}
			context.lastSearch = searchParams, context.loading = true;

			$.getJSON(
				searchUrl + "?format=json&jsonCallback=?",
				searchParams,
				function(responseData) { // populate the result to display the image patterns
					if (context.page == 0) {
						context.target.empty();
					}
					$.each(responseData, function(i, info) {
						// display a loading vignette
						var vignette = $("<img>")
							.attr("src", wiz.options.loadingGif)
							.attr("title", info.title)
							.appendTo(displayResult);

						if (info.colors) { // store the palette colors
							vignette.data("colourlovers.palette", info.colors);
						}

						// load the real image in background and replace vignette when its done
						var imgUrl = info.imageUrl, replaceVignette = function() {
							vignette.attr("src", imgUrl);
						}
						$("<img>").attr("src", imgUrl).load(replaceVignette);

					});
					context.results = $("img", $frm).length;
					context.loading = false;
				}
			);
			evt.preventDefault(); // don't submit the form : its an ajax request !
		});

		// Define the action when the user click on an image to apply
		if (options.applyOn) {
			displayResult.delegate("img", "click", function() {
				$(options.applyOn)
					.css({
						"background": "white url('" + $(this).attr("src") + "') repeat"
					});
			});
		}

		// Define the action when the user click on a palette to apply
		if (options.colorMap) {
			displayResult.delegate("img", "click", function() {
				applyPalette($(this).data("colourlovers.palette"), options.colorMap)
			});
		}

	}; // searchForm

	/**
	 * Fetch the next page
	 */
	this.getNextPage = function(form) {
		var $frm = $(form), searchContext = $frm.data("colourlovers.search");

		// determine if we have more data to fetch
		if (searchContext.results % searchContext.pageSize == 0) {
			// last page was full : we can expect more data to retrieve
			searchContext.page += 1;
			$frm.submit(); // launch the search for more results
		}
	};
};
