function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

Object.size = function(obj) {
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
};

var arrows =   {'left':' \u2B0F',
				'right':' \u2B0E',
				'through':' \u2192',
				'reverse':' \u2190',
				'twoways':' \u27F7'}
var lanes_font = 'Arial Black';

L.FeatureGroup.prototype.hideAll = function (){
	if(this._hidden) return;
	this._hidden = true;
	this.eachLayer(function (layer) {
		if(layer._path)
    		layer._path.setAttribute('display', 'none');
	});
}

L.FeatureGroup.prototype.showAll = function (){
	if(!this._hidden) return;
	this._hidden = false;
	this.eachLayer(function (layer) {
		if(layer._path)
    		layer._path.setAttribute('display', '');
	});
}

L.FeatureGroup.prototype._old_addLayer = L.FeatureGroup.prototype.addLayer;

L.FeatureGroup.prototype.addLayer = function (layer){
	L.FeatureGroup.prototype._old_addLayer.call(this, layer);
	if(this._hidden && layer._path){
		layer._path.setAttribute('display', 'none');
	}
}

L.FeatureGroup.prototype.isShowed = function (){
	if(this._hidden == undefined || this._hidden == false){
		return true;
	}
	return false;
}

L.OwnLayersPack = L.Class.extend({
	options: {
		wayColors: {noneway:"yellow",opposite_lane:"orange",lane: "green", shared:"purple",cycleway:"red"}
	},

    initialize: function (options) {
		var _this = this;
        L.Util.setOptions(this, options);
		this._overpassQueue = new L.OverpassQueue({
			//onLoadingStarted: function(){$("#text-zbox-loading").css("display","inline");},
			//onLoadingFinished: function(){$("#text-zbox-loading").css("display","none");}
		});
		//POI
		this._poiLayer = L.markerClusterGroup({ 
					disableClusteringAtZoom: 14,
					iconCreateFunction: function(cluster) {
						var childCount = cluster.getChildCount();
						return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>',
								className: 'marker-cluster marker-cluster-poi',
								iconSize: new L.Point(40, 40) });
					}
				});
		this._addPOIPart();
		//Hazard
		
		this._hazardLayer = L.markerClusterGroup({
					disableClusteringAtZoom: 14,
					iconCreateFunction: function(cluster) {
						var childCount = cluster.getChildCount();
						return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>',
								className: 'marker-cluster marker-cluster-hazard',
								iconSize: new L.Point(40, 40) });
					}
					});
		this._addHazardPart();

		//Way
		this._wayLayer = L.featureGroup();
		this._addWayPart();
		this.wayzoomlevel = 18;

		this._waysZoomedLayer = L.extractLayer({onDraw: function(layer){_this._addLanes(layer);},layer:this._wayLayer,minZoom:this.wayzoomlevel});

		this._showLayer(this._wayLayer);
		this._showLayer(this._waysZoomedLayer);

		this.options.map.on("zoomend",function(){
				if(!_this.options.map.hasLayer(_this._wayfetcher)) return;
				if(_this.options.map.getZoom() < _this.wayzoomlevel ){
					_this._showAllOnLayer(_this._wayLayer);
				}else{
					_this._hideAllOnLayer(_this._wayLayer);
				}
			});
		//Trail
		this._trailLayer = L.featureGroup();
		this._addTrailPart();
	},

	_hideAllOnLayer: function(layer){
		if(layer.isShowed())
			layer.hideAll();
	},

	_showAllOnLayer: function(layer){
		if(!layer.isShowed())
			layer.showAll();
	},

	_hideLayer: function(layer){
		if(this.options.map.hasLayer(layer))
			this.options.map.removeLayer(layer);
	},

	_showLayer: function(layer){
		if(!this.options.map.hasLayer(layer))
			this.options.map.addLayer(layer);
	},

	hidePOILayer: function(){
		this._hideLayer(this._poiLayer);
		this._hideLayer(this._poifetcher);
	},

	showPOILayer: function(){
		this._showLayer(this._poiLayer);
		this._showLayer(this._poifetcher);
	},

	_addPOIPart: function (){
		var selector = "(node[amenity=bicycle_parking](%BBOX%);node[amenity=bicycle_rental](%BBOX%);node[amenity=bicycle_repair_station](%BBOX%);node[shop=bicycle](%BBOX%););out;"+
					"(way[amenity=bicycle_parking](%BBOX%);way[amenity=bicycle_rental](%BBOX%);way[amenity=bicycle_repair_station](%BBOX%);way[shop=bicycle](%BBOX%););out center;";

		this._poifetcher = new L.OverpassFetcher({
					minZoom:13,
					selector: selector,
					layer: this._poiLayer,
					createMarker: 	function(e){
						var pos = new L.LatLng(e.lat, e.lon);
						marker = new L.MarkerPOI(pos, {element: e,riseOnHover: true});
						if(e.tags["name"] != undefined)
							marker.bindLabel(e.tags["name"]);
						return marker;
					},
					overpassQueue: this._overpassQueue});
	},

	hideHazardLayer: function(){
		this._hideLayer(this._hazardLayer);
		this._hideLayer(this._hazardfetcher);
	},

	showHazardLayer: function(){
		this._showLayer(this._hazardLayer);
		this._showLayer(this._hazardfetcher);
	},

	_addHazardPart: function(){
		var selector = "(node['hazard:bicycle'](%BBOX%););out;(way['hazard:bicycle'](%BBOX%););out center;";
		this._hazardfetcher = new L.OverpassFetcher({
					minZoom:13,
					selector: selector,
					layer: this._hazardLayer,
					createMarker: 	function(e){
						var pos = new L.LatLng(e.lat, e.lon);
						var marker=new L.MarkerPOI(pos, {element: e,riseOnHover: true});
						if(e.tags["description"] != undefined)
							marker.bindLabel(e.tags["description"]);
						return marker;
					},
					overpassQueue: this._overpassQueue});
	},

	hideWayLayer: function(){
		this._hideAllOnLayer(this._waysZoomedLayer);
		this._hideAllOnLayer(this._wayLayer);
		this._hideLayer(this._wayfetcher);
	},

	showWayLayer: function(){
		if(this.options.map.getZoom() >= this.wayzoomlevel)
			this._showAllOnLayer(this._waysZoomedLayer);
		else
			this._showAllOnLayer(this._wayLayer);
		this._showLayer(this._wayfetcher);
	},

	_addWayPart: function(){
		var selector =	//one way for cars no for bc
				'(way["oneway:bicycle"="no"]["oneway"="yes"](%BBOX%);'+
				'way["oneway:bicycle"="no"]["oneway"="-1"](%BBOX%);'+
				//opposite lane
				'way["cycleway:left"="opposite_lane"](%BBOX%);'+
				'way["cycleway:right"="opposite_lane"](%BBOX%);'+
				'way["cycleway"="opposite_lane"](%BBOX%);'+
				//lane
				'way["cycleway:left"="lane"](%BBOX%);'+
				'way["cycleway:right"="lane"](%BBOX%);'+
				'way["cycleway"="lane"](%BBOX%);'+
				'way["cycleway:lanes"~"designated"](%BBOX%);'+
				//cycleways
				'way["highway"="cycleway"](%BBOX%);'+
				'way["highway"="footway"]["bicycle"="yes"](%BBOX%);'+
				 ((getParameterByName('full')=='yes')?'way["highway"](%BBOX%);':'')+
				'way["bicycle"="designated"](%BBOX%););out geom;';

		var _this = this;
	 	this._wayfetcher = new L.OverpassFetcher({
			minZoom:13,
			selector: selector,
			createPolyline:function(ll,el){ return _this._createWay(ll,el);},
			layer: this._wayLayer,
			overpassQueue: this._overpassQueue});
	},

	hideTrailLayer: function(){
		this._hideLayer(this._trailLayer);
		this._hideLayer(this._trailfetcher);
	},

	showTrailLayer: function(){
		this._showLayer(this._trailLayer);
		this._showLayer(this._trailfetcher);
	},

	_addTrailPart: function(){
		var selector = 'relation["route"~"bicycle|mtb"](%BBOX%);out;'+
					'way(r)(%BBOX%);out ids tags geom;';
		var _this = this;
		this._trailfetcher = new L.OverpassFetcher({
			minZoom:13,
			selector: selector,
			createPolyline: function(nn,el){ return _this._createTrail(nn,el);},
			layer: this._trailLayer,
			overpassQueue: this._overpassQueue});
	},

	_checkTag: function (tags,key,value,type){
		if(tags.hasOwnProperty(key) && (type == '=' || type == '~')){
			if(tags[key] == value && type == '=')
				return true;
			if(tags[key].search(value) != -1 && type == '~')
				return true;
		}else if(!tags.hasOwnProperty(key) && type == '!='){
			return true;
		}else if(tags.hasOwnProperty(key) && tags[key] != value && type == '!='){
			return true;
		}
		return false;
	},

	_addLanes: function(layer){
		var el = layer.el;
		var size = (this.options.map.getZoom()-17);
		var ll = layer.getLatLngs();
		//TODO I CAN DO IT MUCH BETTER
		if(this._checkTag(el.tags,"bicycle:lanes","designated","~") || 
				((getParameterByName('full')=='yes')&&this._checkTag(el.tags,"turn:lanes","no","!=")) ){

			var i = 0;
			var pars = new Array();
			//BICYCLE
			if(el.tags["bicycle:lanes"]!= undefined){
				var lanes_tt = el.tags["bicycle:lanes"].split("|");
				i = 0;
				for(var lane in lanes_tt){
					if(pars[i] == undefined)
						pars.push({});
					pars[i]['bicycle'] = lanes_tt[lane];
					i++;	
				}
			}
			//TURN			
			if(el.tags["turn:lanes"]!= undefined){
			 	var lanes_tt = el.tags["turn:lanes"].split("|");
				i = 0;
				for(var lane in lanes_tt){
					if(pars[i] == undefined)
						pars.push({});
					pars[i]['turn'] = lanes_tt[lane];
					i++;	
				}
			}

			if(pars.length == 0){
				var n = L.polyline( ll);
				n.setStyle({'color': 'yellow','weight':8*size});
				this._waysZoomedLayer.addLayer(n);
			}

			for(i=0;i<pars.length;++i){
				var n = L.polyline( ll);
				var color;var opacity = 0.8;

				if(pars[i]['bicycle'] == undefined || pars[i]['bicycle'] == 'no')
					color = 'black';
				else if(pars[i]['bicycle'] == 'yes')
					color = 'blue';
				else if(pars[i]['bicycle'] == 'designated'){
					color = 'red';
					opacity = 1;
				}
				var text ='';
				if(pars[i]['turn'] == undefined || pars[i]['turn'] == 'no')
					text += '';
				else{
					if(pars[i]['turn'].search("right") > -1)
						text += arrows['right'];
					if(pars[i]['turn'].search("left") > -1)
						text += arrows['left'];
					if(pars[i]['turn'].search("through") > -1)
						text += arrows['through'];

					n.setText(text, {repeat: true,
                            offset: 3*size,
                            attributes: {fill: '#FFFFFF',
										'font-weight': 'bold',
										'font-family': lanes_font,
										'font-size': 10*size}});
					
				}
				console.log(pars[i]);
				n.setStyle({'color': color,'opacity':opacity,'weight':8*size});
				n.setOffset((i-pars.length/2+1)*10*size);

				this._waysZoomedLayer.addLayer(n);
			}
		}else{
			var lanesP = [];
			//Footway
			if(this._checkTag(el.tags,"highway","footway",'=') ){
				if( this._checkTag(el.tags,"bicycle","yes",'=') || this._checkTag(el.tags,"bicycle","designated",'=') ){
					var style="twoways";
					if(this._checkTag(el.tags,"highway","cycleway",'=')
							&& (this._checkTag(el.tags,"oneway","yes",'=')
								|| this._checkTag(el.tags,"oneway:bicycle","yes",'=') )) 
						style="through";
					if(this._checkTag(el.tags,"highway","cycleway",'=')
							&& (this._checkTag(el.tags,"oneway","-1",'=')
								|| this._checkTag(el.tags,"oneway:bicycle","-1",'=') ))
						style="through";

					if(this._checkTag(el.tags,"segregated","yes",'!=')){
						lanesP.push({type:'fb',symbol:style});
					}else{
						lanesP.push({type:'f'});
						lanesP.push({type:'b',symbol:style});
					}
				}
			}
			//Cycleways
			else if(this._checkTag(el.tags,"highway","cycleway",'=')  || this._checkTag(el.tags,"bicycle","designated",'=') ){
				var style="twoways";
				if(this._checkTag(el.tags,"highway","cycleway",'=')
						&& (this._checkTag(el.tags,"oneway","yes",'=')
							|| this._checkTag(el.tags,"oneway:bicycle","yes",'=') )) 
					style="through";
				if(this._checkTag(el.tags,"highway","cycleway",'=')
						&& (this._checkTag(el.tags,"oneway","-1",'=')
							|| this._checkTag(el.tags,"oneway:bicycle","-1",'=') )) 
					style="through";

				if(this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"segregated","yes",'!=') ){
					lanesP.push({type:'fb',symbol:style });
				}else if (this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"segregated","yes",'=')){
					lanesP.push({type:'b',symbol:style});
					lanesP.push({type:'f'});
				}else{
					lanesP.push({type:'b',symbol:style});
				}
			}
			//Other
			else{
				var lanes = el.tags["lanes"];
				var hasOP = false;
				if(lanes == undefined) lanes = 1;

				if(this._checkTag(el.tags,"cycleway","opposite_lane",'=') ){
					lanesP.push({type:'b',symbol:'reverse'});hasOP=true;
				}else if(this._checkTag(el.tags,"cycleway:left","opposite_lane",'=') ){
					lanesP.push({type:'b',symbol:'reverse'});hasOP=true;
				}

				if(this._checkTag(el.tags,"cycleway","lane",'=') && this._checkTag(el.tags,"oneway","-1",'=')){
					lanesP.push({type:'b'});
				}else if(this._checkTag(el.tags,"cycleway:left","lane",'=') ){
					lanesP.push({type:'b'});
				}

				for(var i=0;i<lanes;i++){
					lanesP.push({type:'c'});
				}

				if(!hasOP){
					if(this._checkTag(el.tags,"cycleway","opposite_lane",'=') && this._checkTag(el.tags,"oneway","-1",'=')){
						lanesP.push({type:'b',symbol:'through'});
					}else if(this._checkTag(el.tags,"cycleway:right","opposite_lane",'=') ){
						lanesP.push({type:'b',symbol:'through'});
					}
				}

				if(this._checkTag(el.tags,"cycleway","lane",'=') ){
					lanesP.push({type:'b'});
				}else if(this._checkTag(el.tags,"cycleway:right","lane",'=') ){
					lanesP.push({type:'b'});
				}
			}

			for(var i=0;i<lanesP.length;++i){
				var n = L.polyline(ll);
				var text ="  ";
				if(lanesP[i].symbol != undefined){
					if(lanesP[i].symbol.search("right") > -1){
							text += arrows['right'];
					} if(lanesP[i].symbol.search("left") > -1){
							text += arrows['left'];
					} if(lanesP[i].symbol.search("through") > -1){
							text += arrows['through'];
					} if(lanesP[i].symbol.search("reverse") > -1){
							text += arrows['reverse'];
					} if(lanesP[i].symbol.search("twoways") > -1){
							text += arrows['twoways'];
					}
				}
				n.setText(text, {repeat: true,
                            offset: 3*size,
                            attributes: {fill: '#FFFFFF',
										'font-weight': 'bold',
										'font-family': lanes_font,
										'font-size': 10*size}});
				var color = 'blue';var opacity = 0.8;
				if(lanesP[i].type == 'c') color = 'black';
				else if(lanesP[i].type == 'b') {color = 'red'; opacity:1;}
				else if(lanesP[i].type == 'f') color = 'yellow';
				n.setStyle({'color': color,'opacity':opacity,'weight':8*size});
				n.setOffset((i-lanesP.length/2+1)*10*size);
				this._waysZoomedLayer.addLayer(n);
			}
		}
	},

	_createWay: function(ll,el){
		var feature = L.polyline( ll);
		var color = "white";

		//Eq foot==bicycle
		if(this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"highway","cycleway",'=')
				&& this._checkTag(el.tags,"segregated","yes",'!=')){
			color = this.options.wayColors.shared;
		}else if(this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"bicycle","designated",'=')
				&& this._checkTag(el.tags,"segregated","yes",'!=')){
			color = this.options.wayColors.shared;
		}else if(this._checkTag(el.tags,"highway","footway",'=') && this._checkTag(el.tags,"bicycle","yes",'=') ){
			color = this.options.wayColors.shared;
		}
		//designated
		else if(this._checkTag(el.tags,"bicycle","designated",'=')
			|| this._checkTag(el.tags,"highway","cycleway",'=')){
			color = this.options.wayColors.cycleway;
		}
		//opposite_lanes
		else if(this._checkTag(el.tags,"cycleway:left","opposite_lane",'=')
			|| this._checkTag(el.tags,"cycleway:right","opposite_lane",'=')
			|| this._checkTag(el.tags,"cycleway","opposite_lane",'=')){
			color = this.options.wayColors.opposite_lane;
		}

		//lanes
		else if(this._checkTag(el.tags,"cycleway:left","lane",'=') || this._checkTag(el.tags,"cycleway:right","lane",'=')
			|| this._checkTag(el.tags,"cycleway","lane",'=') || this._checkTag(el.tags,"bicycle:lanes","designated",'~')){
			color = this.options.wayColors.lane;
		}

		else if(this._checkTag(el.tags,"oneway:bicycle","no",'=') && this._checkTag(el.tags,"oneway","yes",'=')
			|| this._checkTag(el.tags,"oneway:bicycle","no",'=') && this._checkTag(el.tags,"oneway","-1",'=')){
			color = this.options.wayColors.noneway;
		}

		var dasharray = "6, 5";

		if(this._checkTag(el.tags,"cycleway:surface","paving_stones",'=')
			|| this._checkTag(el.tags,"cycleway:left:surface","paving_stones",'=')
			|| this._checkTag(el.tags,"cycleway:right:surface","paving_stones",'=')){
				dasharray = "2, 3";
		}else if(this._checkTag(el.tags,"cycleway:surface","asphalt",'=')
			|| this._checkTag(el.tags,"cycleway:left:surface","asphalt",'=')
			|| this._checkTag(el.tags,"cycleway:right:surface","asphalt",'=')){
				dasharray = 1;
		}else if(this._checkTag(el.tags,"surface","paving_stones",'=')){
				dasharray = "2, 3";
		}else if(this._checkTag(el.tags,"surface","asphalt",'=')){
				dasharray = 1;
		}
		feature.el = el;

		feature.setStyle({'color':color, 'opacity':1,dashArray:dasharray, weight: 2});
		return feature;
	},
	_createTrail: function (ll,el){
		var array = [];
		var rlength = Object.size(el.relations);
		var i = 0;
		for(var rel in el.relations){
			var n = L.polyline( ll);
			var color = el.relations[rel].tags["colour"];
			if(el.relations[rel].tags["route"] == "mtb")
				n.setStyle({'color': color,'opacity':1,dashArray:'8 8'});
			else
				n.setStyle({'color': color,'opacity':1});
		
			n.setOffset((i-rlength+1)*6);
			array.push(n);
			++i;
		}
		return array;
	}

});
