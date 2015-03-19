L.LatLngBounds.prototype.toOverpassBBoxString = function (){
	var a = this._southWest,
		b = this._northEast;
	return [Math.round(a.lat*1000)/1000+0.0001, Math.round(a.lng*1000)/1000+0.0001, Math.round(b.lat*1000)/1000-0.0001, Math.round(b.lng*1000)/1000-0.0001].join(",");
};

L.OverpassQueue = L.Class.extend({
	options: {
		url: "http://overpass-api.de/api/interpreter?data=",
		onLoadingStarted: function(){console.log("Started");},
		onLoadingFinished: function(){console.log("Finished");}
	},
    initialize: function (options) {
        L.Util.setOptions(this, options);
		this.overpass_queries = [];
		this.overpass_stop = true;
    },

    _queryRun: function () {
		this.overpass_stop = false;
		var query = this.overpass_queries.pop();
		console.log(query.url);
		var _this = this;
		$.ajax({
			url: this.options.url + query.url,
			crossDomain: true,
			dataType: "json",
			data: {},
		}).always(function( a, b ){
			if(_this.overpass_queries.length>0)
				_this._queryRun();
			else{
				_this.overpass_stop = true;
				_this.options.onLoadingFinished();
			}
			query.callback(a);
		});
    },
	downloadFromOverpass: function(url,callback){
		this.overpass_queries.push({"url": url, "callback":callback});
		//First query
		if(this.overpass_queries.length == 1 && this.overpass_stop == true){
			this.options.onLoadingStarted();
			this._queryRun();
		}
	}
});


L.OverpassFetcher = L.LayerGroup.extend({
	options: {
			
			delta: 0.04,
			selector: "way[amenity=drinking_water](%BBOX%);out center;way[amenity=drinking_water](%BBOX%);out;",
			minZoom:15,
			debug: false,
			limit: -1,
	},
	initialize: function (options) {
		L.Util.setOptions(this, options);
		this._layers = {};
		this._tiles = {};

		this._ways = {};
		this._nodes = {};
		this._relations = {};
	},

	parseF: function(data){
		//Maybe multi thread safe solution is needed
		if(data.elements == undefined){
			console.log(data);return;
		}
		console.log(data);
		var nodes = {};
		var ways = {};
		var relations = {};
		for(var i = 0; i< data.elements.length; ++i){
			if(data.elements[i].type == "node"){
				if(this._nodes.hasOwnProperty(data.elements[i].id))
					continue;
				nodes[data.elements[i].id] = data.elements[i];
			}
			else if(data.elements[i].type == "way"){
				if(this._ways.hasOwnProperty(data.elements[i].id))
					continue;
				ways[data.elements[i].id] = data.elements[i];
			}
			else if(data.elements[i].type == "relation"){
				relations[data.elements[i].id] = data.elements[i];
			}
		}

		//Parse relations
		for(var i in relations){
			for(var j=0;j<relations[i].members.length;++j){
				var member = relations[i].members[j];
				if(member.type == "node"){
					if(nodes[member.ref] == undefined)
						continue;
					if(nodes[member.ref].relations == undefined)
						nodes[member.ref].relations = {};
					nodes[member.ref].relations[relations[i].id] = relations[i];
				}
				if(member.type == "way"){
					if(ways[member.ref] == undefined)
						continue;
					if(ways[member.ref].relations == undefined)
						ways[member.ref].relations = {};
					ways[member.ref].relations[relations[i].id] = relations[i];
				}
				//Relations not supported YET
			}
		}

		//Nodes as POI
		for (var key in nodes){
			this._nodes[nodes[key].id] = nodes[key];
			if(this.options.createMarker == undefined){
				var n = L.circleMarker( L.latLng(nodes[key].lat, nodes[key].lon));
				n.el = nodes[key];
				this.options.layer.addLayer(n);
			}else{
				var marker = this.options.createMarker(nodes[key]);
				this.options.layer.addLayer(marker);
			}
		}
		//Ways
		for (var key in ways){
			this._ways[ways[key].id] = ways[key];
			//As POI
			if(ways[key].center != undefined){
				ways[key].lat = ways[key].center.lat;
				ways[key].lon = ways[key].center.lon;
				if(this.options.createMarker == undefined){
					var n = L.circleMarker( L.latLng(ways[key].lat, ways[key].lon));
					n.el = ways[key];
					this.options.layer.addLayer(n);
				}else{
					var marker = this.options.createMarker(ways[key]);
					this.options.layer.addLayer(marker);
				}
			}
			//As polyline
			if(ways[key].geometry != undefined){
				var ll = [];
				for(var j =0;j<ways[key].geometry.length;++j){
					ll.push(L.latLng(ways[key].geometry[j].lat,ways[key].geometry[j].lon));
				}
				if(this.options.createPolyline != undefined){
					var n = this.options.createPolyline(ll,ways[key]);
					if( Object.prototype.toString.call( n ) === '[object Array]' ) {
						for(var z in n){
							this.options.layer.addLayer(n[z]);
						}
					}else
						this.options.layer.addLayer(n);
				}else{
					var n = L.polyline( ll);
					n.el = ways[key];
					if(this.options.setStyle != undefined){
						this.options.setStyle(n);
					}
					this.options.layer.addLayer(n);
				}
			}
		}
	},
	parseWays: function(data){
		if(data.elements == undefined){
			console.log(data);return;
		}
		if(data.elements.length==0)return;
		console.log(data);
		var nodes = {};
		//Parse nodes
		for(var i = 0; i< data.elements.length; ++i){
			if(data.elements[i].type == "node"){
				nodes[data.elements[i].id] = data.elements[i];
			}
		}
		//Parse ways
		for(var i = 0; i< data.elements.length; ++i){
			if(data.elements[i].type == "way"){
				if(this._ids_ways.hasOwnProperty(data.elements[i].id)){
					console.log("skip way");continue;}
				this._ids_ways[data.elements[i].id] = true;

				var ll =[];
				var nodesa = data.elements[i].nodes;
				for(var j=0;j<nodesa.length;j++){
					ll.push(L.latLng(nodes[nodesa[j]].lat,nodes[nodesa[j]].lon));
				}
				var n = L.polyline( ll);
				n.el = data.elements[i];
				if(this.options.setStyle != undefined)
					this.options.setStyle(n);	
				this.options.layer.addLayer(n);
			}
		}
	},
	_onDownload: function(bbox){
		var url = "[out:json];" + this.options.selector.replace(/%BBOX%/g,bbox.toOverpassBBoxString());
		var _this = this;
		this.options.overpassQueue.downloadFromOverpass(escape(url),
			function( a, b ){_this.parseF(a);});
	},
	_downloadMissingTiles: function(tarray){
		for(var i=0;i<tarray.length;i++){
			if(this._tiles.hasOwnProperty(tarray[i][0]+":"+tarray[i][1])){
				console.log("Skip");
				continue;
			}
			var b_s=tarray[i][0] * this.options.delta -90;
			var b_w=tarray[i][1] * this.options.delta -180;
			var bounds = [[b_s+this.options.delta,b_w+this.options.delta], [b_s, b_w]];
			this._tiles[tarray[i][0]+":"+tarray[i][1]]=1;
			if(this.options.debug==true)
				this.options.layer.addLayer(L.rectangle(bounds, {color: "#ff7800", weight: 1}));
			var p = this._onDownload( L.latLngBounds(bounds[0],bounds[1]));
		}
	},
	_getTiles: function(bounds){
		var t_n = Math.ceil ((bounds.getNorth()+90) /this.options.delta);
		var t_s = Math.floor((bounds.getSouth()+90) /this.options.delta);
		var t_e = Math.ceil ((bounds.getEast() +180)/this.options.delta);
		var t_w = Math.floor((bounds.getWest() +180)/this.options.delta);
		var ret_arr = [];
		for(var i=t_s;i<t_n;i++)
			for(var j=t_w;j<t_e;j++){
				ret_arr.push([i,j]);
			}
		return ret_arr;
	},
	onMoveEnd: function(map) {
		if(this._map == undefined) return;
		if(this._map.getZoom() < this.options.minZoom)
			return;
		var bounds=this._map.getBounds();
		this._downloadMissingTiles(this._getTiles(bounds));
	},
	onAdd: function (map) {
		this._map=map;
		map.on('moveend', this.onMoveEnd,this);
	},
	onRemove: function (map) {
		map.off('moveend',this.onMoveEnd,this);
	}
});

L.overpassFetcher = function (layers) {
	return new L.OverpassFetcher(layers);
};

