//Get all styles from icons-sprite.css
var poisicons = [];
var sSheetList = document.styleSheets;
var classname = ".pois-sprite"
for (var sSheet = 0; sSheet < sSheetList.length; sSheet++){
	if(document.styleSheets[sSheet].href.indexOf("pois-sprite.css") > -1){
		var ruleList = document.styleSheets[sSheet].cssRules;
		var stringT = "";
		var n = 0;
		if(ruleList != undefined){
			for (var rule = 0; rule < ruleList.length; rule ++){
				stringT = ruleList[rule].selectorText.substr(classname.length+1);
				stringT = stringT.replace("__",":");
				n = stringT.indexOf("-");
				if(n > -1){
					var key = stringT.substr(0,n);
					var value = stringT.substr(n+1);
					if(!poisicons.hasOwnProperty(key))
						poisicons[key]=[];
					poisicons[key].push(value);
				}else{
					if(!poisicons.hasOwnProperty(stringT))
						poisicons[stringT]=[];
					poisicons[stringT].push("*");
				}
			}
		}
	}
}

L.MarkerPOI = L.Marker.extend({
	options: {
		element: 0,
	},

	initialize: function (latlng, options) {
		var _this = this;
		L.Util.setOptions(this, options);
		this.options.icon = this._getIcon();
		L.Marker.prototype.initialize.call(this, latlng);
	},

	_getIconSource: function(){
		var icon_name = "other";
		for(var key in poisicons){
			if(this.options.element.tags.hasOwnProperty(key)){
				if(poisicons[key].indexOf(this.options.element.tags[key]) > -1){
					icon_name = key+"-"+this.options.element.tags[key];
					icon_name = icon_name.replace(":","__");
					break;
				}else if(poisicons[key].indexOf("*") >-1){
					icon_name = key;
					icon_name = icon_name.replace(":","__");
					break;
				}
			}
		}
		return icon_name;
	},

	_getIcon: function(){
		var icon_name = this._getIconSource();
		return L.divIcon({
			html:"<div class='pois-sprite pois-sprite-"+icon_name+"'></div>",

			iconSize: [22, 22],
			iconAnchor: [11, 11],
			});
	}
});
