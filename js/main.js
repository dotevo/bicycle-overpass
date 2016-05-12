/* GLOBAL */
var box;
var map;

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + "; " + expires;
} 

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for(var i=0; i<ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1);
		if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
	}
	return "";
} 

$(document).bind("mobileinit", function() {
	// let PathJS handle navigation
	$.mobile.ajaxEnabled = false;
	$.mobile.hashListeningEnabled = false;
	$.mobile.pushStateEnabled = false;
});

function loadme(){
	i18n.init({resGetPath: 'locales/__ns__-__lng__.json', debug: true, fallbackLng: 'en', useDataAttrOptions:true },function(e){afterInit()});
}

function i18n_gen(){
	$.get( "locales/languages.txt", function( data ){ 
		var select = $('#languages');
		var lines = data.split(/\n/);
		for( var n=0 ; n < lines.length ; n++ ){
			if(lines[n].length > 0){
				var lang = lines[n].split(":");
				var option = '<option class="lang" id="' +lang[1]+ '" value="' +lang[1]+ '">'+lang[0]+'</option>';            
				select.append(option)
			}
		}
		console.log($.i18n.lng());
		var selected = select.find("#"+$.i18n.lng());
        selected.attr('selected', 'selected');
		select.selectmenu();
		select.selectmenu('refresh', true);
		$('.lang').click(function () {
			var lang = $(this).attr('value');
			i18n.init({
				lng: lang
			}, function (t) {
				$(document).i18n();
			});
		});
	});
}

$(document).on( "pagecontainershow", function(){
    ScaleContentToDevice();
    $(window).on("resize orientationchange", function(){
        ScaleContentToDevice();
    })
});

function ScaleContentToDevice(){
    scroll(0, 0);
    var content = $.mobile.getScreenHeight() - $(".ui-header").outerHeight() - 
			$(".ui-footer").outerHeight() - $(".ui-content").outerHeight() + 
			$(".ui-content").height();
    $(".ui-content").height(content);
}

function getLineWithStyle(color,dashArray){
	var d = "";
	if(dashArray!=undefined)
		d = ' stroke-dasharray: '+dashArray;
	return '<svg width="40" height="10">'+
			'<line x1="0" y1="5" x2="40" y2="5" style="stroke: '+color+'; stroke-width: 2px; '+d+'"  />'+
			'</svg>'
}

var adBox;
function closeAd(){
	map.removeControl(adBox);
}
function afterInit(){
	i18n_gen();
	console.log(getParameterByName("zoom"));
	var lat  = (( getParameterByName("lat") != "" ) ? getParameterByName("lat") :
					( getCookie("lat" ) ? getCookie("lat" ) : 51.5 )
				);
	var lon  = (( getParameterByName("lon") != "" ) ? getParameterByName("lon") :
					( getCookie("lon" ) ? getCookie("lon" ) : 16 )
				);
	var zoom = (( getParameterByName("zoom") != "" )?getParameterByName("zoom") :
					( getCookie("zoom") ? getCookie("zoom") : 5 )
				);
	map = L.map('map').setView([lat,lon], zoom);
	L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {
		attribution: $.i18n.t('Map data &copy; %s contributors',"<a href='http://openstreetmap.org'>OSM</a>")+" "+
				$.i18n.t('Uses %s',"<a href'http://www.overpass-api.de/'>OverpassAPI</a>"),
		maxZoom: 21,
    	maxNativeZoom: 18
	}).addTo(map);

	var Box =  L.Control.extend({options: { position: 'bottomleft'},
		setText: function(html){
			this.controlDiv.innerHTML=html;
		},
		onAdd: function (map) {
			this.controlDiv = L.DomUtil.create('div', 'leaflet-control-own leaflet-control-message');
			return this.controlDiv;
		}
	});
	box = new Box();
	var zbox = new Box();
	zbox.setPosition( 'topright' ) 
	map.addControl(box);
	map.addControl(zbox);
	zbox.setText('<i id="#text-zbox-zoomin" data-i18n="Please, zoom in"></i><br/>'+
		'<i id="#text-zbox-loading" data-i18n="Loading"></i>...');
	map.on("zoomend",function(){
		if(map.getZoom() < 15)
			$("#text-zbox-zoomin").css("display","inline");
		else
			$("#text-zbox-zoomin").css("display","none");
	});
	box.setText('<i id="#text-leg" data-i18n="Hover over the button"></i>');

	var permalinkBox = new Box();
	permalinkBox.setPosition('bottomleft');
	map.addControl(permalinkBox);
	permalinkBox.setText("");

	adBox = new Box();
	adBox.setPosition('bottomright');
	map.addControl(adBox);
	var adString ='<a onClick="closeAd();">X</a><br/><iframe scrolling="no" style="border: 0; width: 120px; height: 240px;" src="http://coinurl.com/get.php?id=33833&search=bicycle,sport"></iframe>';
	adBox.setText(adString);
	setInterval(function () {adBox.setText(adString);}, 60000*5);

	var colors = {noneway:"blue",opposite_lane:"purple",lane: "yellow", shared:"orange",cycleway:"red"};
	var ownLayers = new L.OwnLayersPack({map:map,wayColors:colors});

	//POI
	$("#nav-pois").on("mouseenter",function(){
		box.setText('<div class="pois-sprite pois-sprite-shop-bicycle"></div><i id="#text-leg" class="legend-text" data-i18n="Shop"></i><br/>'+
			'<div class="pois-sprite pois-sprite-amenity-bicycle_repair_station"></div><i id="#text-leg" class="legend-text" data-i18n="Repair station"></i><br/>'+
			'<div class="pois-sprite pois-sprite-amenity-bicycle_rental"></div><i id="#text-leg" class="legend-text" data-i18n="Rental"></i><br/>'+
			'<div class="pois-sprite pois-sprite-amenity-bicycle_parking"></div><i id="#text-leg" class="legend-text" data-i18n="Parking"></i><br/>'
			);
		$(".legend-text").i18n();
	});
	$("#nav-pois").on("s_change",function(){
		if($(this).hasClass("ui-btn-active"))ownLayers.showPOILayer();
		else ownLayers.hidePOILayer();
	});

	//HAZARD
	$("#nav-hazards").on("mouseenter",function(){
		box.setText('<div class="pois-sprite pois-sprite-hazard__bicycle"></div><i id="#text-leg" class="legend-text" data-i18n="Hazard"></i>');
		$(".legend-text").i18n();
	});
	$("#nav-hazards").on("s_change",function(){
		if($(this).hasClass("ui-btn-active"))ownLayers.showHazardLayer();
		else ownLayers.hideHazardLayer();
	});

	//WAYS
	$("#nav-cycleways").on("mouseenter",function(){
		box.setText('<p style="line-height: 100%;size:10px;">'+getLineWithStyle(colors.noneway)+'</td><td><i id="#text-leg" class="legend-text" data-i18n="Not a one-way road for bicycles"></i><br/>'+
			getLineWithStyle(colors.opposite_lane)+'<i id="#text-leg" class="legend-text" data-i18n="Opposite lane"></i><br/>'+
			getLineWithStyle(colors.lane)+'<i id="#text-leg" class="legend-text" data-i18n="Lane"></i><br/>'+
			getLineWithStyle(colors.shared)+'<i id="#text-leg" class="legend-text" data-i18n="Shared cycle way"></i><br/>'+
			getLineWithStyle(colors.cycleway)+'<i id="#text-leg" class="legend-text" data-i18n="Cycleway"></i><br/>'+
			getLineWithStyle("#000000")+'<i id="#text-leg" class="legend-text" data-i18n="Asphalt"></i><br/>'+
			getLineWithStyle("#000000",'2 3')+'<i id="#text-leg" class="legend-text" data-i18n="Paving stones"></i><br/>'+
			getLineWithStyle("#000000",'6 5')+'<i id="#text-leg" class="legend-text" data-i18n="No data"></i></p>'
			);
		$(".legend-text").i18n();
	});
	$("#nav-cycleways").on("s_change",function(){
		if($(this).hasClass("ui-btn-active"))ownLayers.showWayLayer();
		else ownLayers.hideWayLayer();
	});

	//TRAIL
	$("#nav-trails").on("mouseenter",function(){
		box.setText('<i id="#text-leg" class="legend-text" data-i18n="Colour on the map means trail colour"></i>'
			);
		$(".legend-text").i18n();
	});
	$("#nav-trails").on("s_change",function(){
		if($(this).hasClass("ui-btn-active"))ownLayers.showTrailLayer();
		else ownLayers.hideTrailLayer();
	});

	$(".toogle-button.ui-btn-active").trigger("s_change");

	$(".toogle-button").on('click', function() {
		var a = $(this).data("toogle-group");
		var b = $(this).hasClass("ui-btn-active");
		if(a != undefined){
			$("[data-toogle-group="+a+"].ui-btn-active").removeClass("ui-btn-active").trigger("s_change");
		}
		if(b){
			$(this).removeClass("ui-btn-active");
		}else{
			$(this).addClass("ui-btn-active");
		}
		$(this).trigger("s_change");
		map.fire("moveend");
	});

	map.on("moveend", function(){
		setCookie("lat", map.getCenter().lat,64);
		setCookie("lon", map.getCenter().lng,64);
		setCookie("zoom",map.getZoom(),     64);
		permalinkBox.setText("<a rel='external' data-ajax='false' href='index.html?lat="+map.getCenter().lat+
							"&lon="+map.getCenter().lng+"&zoom="+map.getZoom()+"'>Permalink</a>");
	} );

	map.fire("moveend");
	i18n.init();
	$("[data-i18n]").i18n();	
}

