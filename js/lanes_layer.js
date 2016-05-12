L.ExtractLayer = L.FeatureGroup.extend({
	options: {
	},

    initialize: function (options) {
		L.FeatureGroup.prototype.initialize.call(this,options);
        L.Util.setOptions(this, options);
    },

	onMoveEnd: function(map) {
		if(this._map == undefined || this.options.layer == undefined || this.options.onDraw == undefined) return;

		this.clearLayers();

		if(this._map.getZoom() < this.options.minZoom)
			return;

		var _this = this;
		this.options.layer.eachLayer(function(layer){
			if(_this._map.getBounds().intersects(layer.getBounds())){
				_this.options.onDraw(layer);
			}
		});		
	},

	onAdd: function (map) {
		this._map=map;
		map.on('moveend', this.onMoveEnd,this);
	},

	onRemove: function (map) {
		map.off('moveend',this.onMoveEnd,this);
	}
});

L.extractLayer = function (options) {
	return new L.ExtractLayer(options);
};

