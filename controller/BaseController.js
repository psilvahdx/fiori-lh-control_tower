/* eslint-disable no-undef, linebreak-style */
/*global location */
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
	"use strict";
	return Controller.extend("sap.holcim.zctrl_tower.controller.BaseController", {

		initWebSocket: function() {
			var sWSURL = "wss://" + window.location.host + "/sap/bc/apc/sap/zapc_ws_ctrl_twr";
			$.sap._wsIncidents = new WebSocket(sWSURL);
		},
		geti18NResourceBundle: function() {
			if (this.getView()) {
				return this.getView().getModel("i18n").getResourceBundle();
			} else {
				return null;
			}
		},
		geti18NText: function(k, a) {
			if (this.geti18NResourceBundle()) {
				if (a) {
					return this.geti18NResourceBundle().getText(k, [a]);
				} else {
					return this.geti18NResourceBundle().getText(k);
				}
			} else {
				return null;
			}
		}

	});

});