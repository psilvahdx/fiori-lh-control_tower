/* eslint-disable no-undef, linebreak-style */
jQuery.sap.declare("sap.holcim.zctrl_tower.model.GoogleMaps");
sap.holcim.zctrl_tower.model.GoogleMaps = {
	/** 
	 * Inicializa a API do Google Maps e chama a inicialização do mapa definida no controller
	 * @param {function} fCallback Função de inicialização do mapa no controller
	 * @param {object} oContext Contexto da inicialização no controller (normalmente, this)
	 */
	init: function(fCallback, oContext) {
		if (jQuery.sap.byId("GoogleMapsAPI").length === 0) {
			jQuery.sap.includeScript({
				url: "https://maps.googleapis.com/maps/api/js?key=AIzaSyC-8q5YppfPxE7xeLgulPB0zcOpLZMsdTw", //eslint-disable-line sap-no-hardcoded-url
				id: "GoogleMapsAPI"
			}).then(function() {
				fCallback.call(oContext);
			}, function() {
				jQuery.sap.log.error("Error loading Google Maps API");
			});
		} else if (typeof window.google !== "undefined") {
			fCallback.call(oContext);
		}
	}
};