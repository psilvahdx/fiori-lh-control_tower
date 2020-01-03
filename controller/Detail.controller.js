/* eslint-disable no-undef, linebreak-style */
sap.ui.define([
	"sap/holcim/zctrl_tower/controller/BaseController",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"jquery.sap.global",
	"sap/ui/core/routing/History",
	"sap/holcim/zctrl_tower/model/GoogleMaps",
	"sap/holcim/zctrl_tower/model/Formatter"
], function(BaseController, MessageToast, JSONModel, jQuery, History, GoogleMaps, Formatter) {
	"use strict";

	return BaseController.extend("sap.holcim.zctrl_tower.controller.Detail", {

		formatter: Formatter,
		motivoObrigatorio: false,

		onInit: function() {

			this.directionsDisplay = null;
			this.directionsService = null;
			this.oMap = null;
			this.myLocation = null;
			this.oMarker = null;

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
		},
		_onObjectMatched: function(oEvent) {
			var oView = this.getView();
			this.getView().bindElement({
				path: "/Incident/" + oEvent.getParameter("arguments").key,
				model: "Incident",
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function(oEvent) {
						oView.setBusy(true);
					},
					dataReceived: function(oEvent) {
						oView.setBusy(false);
					}
				}
			});

		},
		_onBindingChange: function(oEvent) {
			// No data for the binding
			if (!this.getView().getBindingContext("Incident")) {
				window.location.replace("/sap/bc/ui5_ui5/sap/zctrl_tower/index.html");
			} else {

				var oUserDetailModel = this.getView().getModel("userDetail");
				var oContext = this.getView().getBindingContext("Incident");
				var oIncident = oContext.getObject();
				GoogleMaps.init(this._initMap, this);
				this.filterReasonList();

			}
		},
		onAfterRendering: function() {
			GoogleMaps.init(this._initMap, this);
		},
		_initMap: function() {

			var that = this,
				oCanvas = this.getView().byId("map_canvas").getDomRef();
			oCanvas.innerHTML = "";
			this.directionsService = new google.maps.DirectionsService();
			this.directionsDisplay = new google.maps.DirectionsRenderer();

			var oContext = this.getView().getBindingContext("Incident");
			var oIncident = oContext.getObject();
			var oLocalIncident = new google.maps.LatLng(parseFloat(oIncident.lat), parseFloat(oIncident.lng));
			var oOrig = new google.maps.LatLng(parseFloat(oIncident.latOri), parseFloat(oIncident.lngOri));

			if (oIncident.lat) {
				var mapOptions = {
					zoom: 12,
					mapTypeId: google.maps.MapTypeId.ROADMAP//,
					//center: oLocalIncident
				};

				var features = [];
				
				var featureOrig = {
					position: oOrig,
					type: 'info',
					title: this.geti18NText("LBL_TITLE_ORIGEM"),
					content: oIncident.descOri,
					icon: {
						url: "./imgs/icon-industry.png", // url
						size: new google.maps.Size(50, 50),
						origin: new google.maps.Point(0, 0),
						anchor: new google.maps.Point(17, 34),
						scaledSize: new google.maps.Size(37, 53)
					}
				};
				
				features.push(featureOrig); //Origem do Transporte
				
				var oFeatureLocalIncident = {
				//this.geti18NText("LBL_TITLE_LOCAL_INCIDENT")
					position: oLocalIncident,
					type: 'info',
					title: oIncident.nomeCurto,
					content: oIncident.infraEnd,
					icon: {
						url: "./imgs/WarningPinMarker.png", // url
						size: new google.maps.Size(50, 50),
						origin: new google.maps.Point(0, 0),
						anchor: new google.maps.Point(17, 34),
						scaledSize: new google.maps.Size(37, 53)
					}
				}
				
				features.push(oFeatureLocalIncident); //Local do incidente atual (Em Exibição)
				

				var aRelation = oIncident.relation;

				for (var i = 0; i < aRelation.length; i++) {
					
					if(aRelation[i].lng !== "" ){

					var sTitle = aRelation[i].nomeCurto; //this.geti18NText("LBL_TITLE_LOCAL_INCIDENT");
					var oPosition = new google.maps.LatLng(parseFloat(aRelation[i].lat), parseFloat(aRelation[i].lng));
					var sUrl = "./imgs/Warning2PinMarker.png";

					var ofeature = {
						position: oPosition,
						type: 'info',
						title: sTitle,
						content: aRelation[i].infraEnd, //endereço
						icon: {
							url: sUrl, // url
							size: new google.maps.Size(50, 50),
							origin: new google.maps.Point(0, 0),
							anchor: new google.maps.Point(17, 34),
							scaledSize: new google.maps.Size(37, 53)
						}
					};
					features.push(ofeature);
					
					}
				}
				
				var aDestination = oIncident.destination;

				for (var x = 0; x < aDestination.length; x++) {
					
					if(aDestination[x].latDes !== "" ){

					var sTitleDes = this.geti18NText("LBL_TITLE_DESTINO");
					var oPositionDes = new google.maps.LatLng(parseFloat(aDestination[x].latDes), parseFloat(aDestination[x].lngDes));
					var sUrlDes = "./imgs/icon-store.png";

					var ofeatureDes = {
						position: oPositionDes,
						type: 'info',
						title: sTitleDes,
						content: aDestination[x].descDes,
						icon: {
							url: sUrlDes, // url
							size: new google.maps.Size(50, 50),
							origin: new google.maps.Point(0, 0),
							anchor: new google.maps.Point(17, 34),
							scaledSize: new google.maps.Size(37, 53)
						}
					};
					features.push(ofeatureDes); //Destinos do Transporte
					}
				}
			
				this.oMap = new google.maps.Map(oCanvas, mapOptions);
				this.directionsDisplay.setMap(this.oMap);

				var t = this;
				var bounds = new google.maps.LatLngBounds();
				// Create markers.
				features.forEach(function(feature) {
					var marker = new google.maps.Marker({
						position: feature.position,
						map: t.oMap,
						title: feature.title,
						animation: google.maps.Animation.DROP,
						icon: feature.icon
					});
					bounds.extend(marker.getPosition());
					
					var contentString = '<div id="content">'  +
					'<h1 id="firstHeading" class="firstHeading">' + feature.title + '</h1>' +
					'<div id="bodyContent">' +
					'<span class="sapMText sapMTextMaxWidth sapUiSelectable" style="text-align:left">'+ feature.content + '</span>' +
					'</div>' +
					'</div>';
					
					var infowindow = new google.maps.InfoWindow({
						content: contentString
					});
					marker.addListener('click', function() {
						infowindow.open(marker.get('map'), marker);
					});

				});

				this.oMap.fitBounds(bounds);

				var oInterval = setInterval(function() {
					that._setMapMarkers(bounds, oLocalIncident);
					clearInterval(oInterval);
				}, 500);

				this.oMap.setMapTypeId(google.maps.MapTypeId.TERRAIN);

				setTimeout(function() {
					that.oMap.setMapTypeId(google.maps.MapTypeId.ROADMAP);
				}, 1000);

			}

		},
		_setMapMarkers: function(oBounds, oLatLng) {
			google.maps.event.trigger(this.oMap, "resize");
			this.oMap.fitBounds(oBounds);
			//this.oMap.setCenter(oLatLng);
		},
		_setMapPosition: function(oLatLng) {
			google.maps.event.trigger(this.oMap, "resize");
			this.oMarker.setPosition(oLatLng);
			this.oMap.setCenter(oLatLng);
		},
		onNavBack: function() {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			var oUserDetailModel = this.getView().getModel("userDetail");
			var oIncident = this.getView().getBindingContext("Incident").getObject();
			var oLockIncident = {
				keyLock: []
			};

			if (oUserDetailModel.oData.userData.Uname === oIncident.userName) {

				var oKeyLock = {
					key: oIncident.key,
					isLocked: false,
					userName: oUserDetailModel.oData.userData.Uname,
					tknum: oIncident.tknum
				};

				oLockIncident.keyLock.push(oKeyLock);

				oIncident.isLocked = false;
				oIncident.userName = "";
				this.getView().getModel("Incident").refresh();

				$.sap._wsIncidents.send(JSON.stringify(oLockIncident));

			}

			//Clear Selections
			this.clearRelationSelected();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("app", {}, true);
			}
		},
		onNavHome: function() {
			var oUserDetailModel = this.getView().getModel("userDetail");
			var oIncident = this.getView().getBindingContext("Incident").getObject();
			var oLockIncident = {
				keyLock: []
			};

			if (oUserDetailModel.oData.userData.Uname === oIncident.userName) {

				var oKeyLock = {
					key: oIncident.key,
					isLocked: false,
					userName: oUserDetailModel.oData.userData.Uname,
					tknum: oIncident.tknum,
					unLockAll: true
				};

				oLockIncident.keyLock.push(oKeyLock);

				oIncident.isLocked = false;
				oIncident.userName = "";
				this.getView().getModel("Incident").refresh();

				$.sap._wsIncidents.send(JSON.stringify(oLockIncident));

			}

			//Clear Selections
			this.clearRelationSelected();

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("app", {}, true);

		},
		navToDetail: function(oEvent) {

			var oItem = oEvent.getSource();
			var oUserDetailModel = this.getView().getModel("userDetail");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oObj = oItem.getBindingContext("Incident").getObject();
			var oIncidentModel = this.getView().getModel("Incident");
			var aIncidentData = oIncidentModel.getData();
			var oIndx = 0;
			var oInc;
			var oLockIncident = {
				keyLock: []
			};

			for (var i = 0; i < aIncidentData.Incident.length; i++) {
				if (aIncidentData.Incident[i].key === oObj.key) {
					oIndx = i;
					oInc = aIncidentData.Incident[i];
					break;
				}

			}

			if (oInc) {

				if (oInc.isLocked === "" || oInc.isLocked === undefined || oInc.isLocked === false) {
					oInc.isLocked = true;
					oInc.userName = oUserDetailModel.oData.userData.Uname;

					var oKeyLock = {
						key: oInc.key,
						isLocked: true,
						userName: oUserDetailModel.oData.userData.Uname,
						tknum: oInc.tknum
					};
					oObj.isLocked = true;
					oObj.userName = oUserDetailModel.oData.userData.Uname;
					oLockIncident.keyLock.push(oKeyLock);
					//this._wsIncidents.send(JSON.stringify(oLockIncident));
					oItem.getModel("Incident").refresh();
					oIncidentModel.refresh();
					$.sap._wsIncidents.send(JSON.stringify(oLockIncident));
				}

				var onNavToDetail = function(oRouter, oPath) {

					var vRouter = oRouter;
					var vPath = oPath;

					var x = setInterval(function() {

						vRouter.navTo("detail", {
							key: vPath
						});

						clearInterval(x);
					}, 500);

				};

				//Clear Selections
				this.clearRelationSelected();

				onNavToDetail(oRouter, oIndx);

			} else {
				MessageToast.show(this.geti18NText("INCIDENT_FINISH_MSG"));
			}

		},
		onExit: function() {
			//this._wsIncidents.close();
		},
		onSelectionRelationChange: function(oEvent) {

			var oRelationItem = oEvent.getParameter("listItem");
			var bSelected = oEvent.getParameter("selected");
			var oObj = oRelationItem.getBindingContext("Incident").getObject();
			var oIncidentModel = this.getView().getModel("Incident");
			var oUserDetailModel = this.getView().getModel("userDetail");
			var aIncidentData = oIncidentModel.getData();
			var oInc;
			var oLockIncident = {
				keyLock: []
			};

			for (var i = 0; i < aIncidentData.Incident.length; i++) {
				if (aIncidentData.Incident[i].key === oObj.key) {
					oInc = aIncidentData.Incident[i];
					break;
				}
			}

			if (oInc) {

				var oKeyLock = {
					key: oObj.key,
					isLocked: bSelected,
					userName: oUserDetailModel.oData.userData.Uname,
					tknum: oInc.tknum
				};

				if (oInc.isLocked === false || oInc.isLocked === "" || oInc.isLocked === undefined) {

					oLockIncident.keyLock.push(oKeyLock);
					oObj.isLocked = bSelected;
					oObj.userName = oUserDetailModel.oData.userData.Uname;
					oRelationItem.getModel("Incident").refresh();
					//oRelationItem.setDescription(this.geti18NText("USER_LOCK", oUserDetailModel.oData.userData.Uname));
					//this._wsIncidents.send(JSON.stringify(oLockIncident));
					$.sap._wsIncidents.send(JSON.stringify(oLockIncident));

				} else {

					if (oUserDetailModel.oData.userData.Uname !== oInc.userName) {
						MessageToast.show(this.geti18NText("USER_LOCK", oInc.userName));
						//oRelationItem.setDescription(this.geti18NText("USER_LOCK", oInc.userName));
						oRelationItem.setSelected(false);
					} else {

						oLockIncident.keyLock.push(oKeyLock);
						//this._wsIncidents.send(JSON.stringify(oLockIncident));
						$.sap._wsIncidents.send(JSON.stringify(oLockIncident));

						if (!bSelected) {
							//oRelationItem.setDescription("");
							oObj.isLocked = bSelected;
							oObj.userName = "";
							oRelationItem.getModel("Incident").refresh();
						}
						/*else {
							oRelationItem.setDescription(this.geti18NText("USER_LOCK", oInc.userName));
						}*/

					}

				}
				this.filterReasonList();
			} else {
				MessageToast.show(this.geti18NText("INCIDENT_FINISH_MSG"));
				oRelationItem.setSelected(false);
			}

		},
		clearRelationSelected: function() {
			var oSelItems = this.getView().byId("lstRelationIncident").getItems();
			for (var idx = 0; idx < oSelItems.length; idx++) {
				oSelItems[idx].setSelected(false);
			}
		},
		onRbSelect: function(oEvent) {
			var oSelIndex = oEvent.getParameter("selectedIndex");
			var oSelReason = this.getView().byId("selReason");

			if (oSelIndex === 1) { //Inváldo
				this.motivoObrigatorio = true;
				oSelReason.setVisible(true);
			} else {
				this.motivoObrigatorio = false;
				oSelReason.setVisible(false);
			}
		},
		filterReasonList: function() {

			var aIncidents = [];
			var aSelContexts = this.getView().byId("lstRelationIncident").getSelectedContexts();
			var oSelReason = this.getView().byId("selReason");
			var oCurrentIncident = this.getView().getBindingContext("Incident").getObject();
			var aReasons = [];
			var aReasonsA = [];
			var oIntersection;
			var setB = new Set();
			var oReason = {
				land1: "",
				codigoCat: "",
				tpAlert: ""
			};

			for (var y = 0; y < aSelContexts.length; y++) {
				aIncidents.push(aSelContexts[y].getObject());
			}

			oReason.land1 = oCurrentIncident.land1;
			oReason.codigoCat = oCurrentIncident.codCatMot;
			oReason.tpAlert = oCurrentIncident.tpAlert;
			aReasonsA.push(oReason);

			var setA = new Set([JSON.stringify(oReason)]);

			for (var i = 0; i < aIncidents.length; i++) {

				var oR = {
					land1: "",
					codigoCat: "",
					tpAlert: ""
				};
				oR.land1 = aIncidents[i].key.substring(0, 2); //aIncidents[i].land1;
				oR.codigoCat = aIncidents[i].codCatMot;
				oR.tpAlert = aIncidents[i].tpAlert;
				aReasons.push(oR);
				//setB.add(JSON.stringify(oR));

				var setAux = new Set([JSON.stringify((oR))]);

				oIntersection = new Set([...setA].filter(x => setAux.has(x)));

				if (oIntersection.size === 0) {
					oReason.land1 = "XX";
					oReason.codigoCat = "XXX";
					oReason.tpAlert = "XX";
					break;
				}

			}

			if (aReasons.length > 0) {

				oIntersection.forEach(function(value) {
					var oJson = JSON.parse(value);
					oReason.land1 = oJson.land1;
					oReason.codigoCat = oJson.codigoCat;
					oReason.tpAlert = oJson.tpAlert;
				});

			}

			var oFiltroCountry = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oReason.land1);
			var oFiltroCodCat = new sap.ui.model.Filter("codCat", sap.ui.model.FilterOperator.EQ, oReason.codigoCat);
			var oFiltroTpAlert = new sap.ui.model.Filter("tpAlerta", sap.ui.model.FilterOperator.EQ, oReason.tpAlert);

			var aFilter = new sap.ui.model.Filter([oFiltroCountry, oFiltroCodCat, oFiltroTpAlert], true);
			var oBinding = oSelReason.getBinding("items");
			oBinding.filter(aFilter);
		},
		validateFields: function() {
			var bOk = true;

			if (this.motivoObrigatorio) {
				if (this.byId("selReason").getSelectedIndex() === -1) {
					bOk = false;
					MessageToast.show(this.geti18NText("REASON_BLANK_MSG"));
				}
			}

			return bOk;

		},
		onSave: function(oEvent) {

			if (this.validateFields()) {

				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext("Incident");
				var oObj = oContext.getObject();
				var bValid = this.getView().byId("RBValid").getSelected();
				var oReason = this.getView().byId("selReason").getSelectedKey();
				var aSelContexts = this.getView().byId("lstRelationIncident").getSelectedContexts();
				var aRelation = [];
				var oIncidentModel = this.getView().getModel("Incident");
				var aIncidentData = oIncidentModel.getData();

				for (var i = 0; i < aSelContexts.length; i++) {

					var oIncRel = aSelContexts[i].getObject();

					var result = aIncidentData.Incident.find(incident => {
						return incident.key === oIncRel.key
					});

					if (result) {

						var oRelation = {

							key: result.key,
							land1: result.land1,
							lifnr: result.lifnr,
							data: result.data,
							hora: result.hora,
							codigoCat: result.codigoCat,
							idFollowUp: "",
							erdat: result.dataCria,
							erzet: result.horaCria,
							ernam: ""
						};

						aRelation.push(oRelation);

					}

				}

				oObj.isCompleted = "X";

				var oFollowUp = {
					key: oObj.key,
					coments: oObj.coments,
					valid: bValid,
					reason: this.motivoObrigatorio ? oReason : "",
					land1: oObj.land1,
					lifnr: oObj.lifnr,
					data: oObj.data,
					hora: oObj.hora,
					codigoCat: oObj.codigoCat,
					idFollowUp: "",
					erdat: oObj.dataCria,
					erzet: oObj.horaCria,
					ernam: "",
					plataforma: "MON",
					relation: aRelation
				};

				$.sap._wsIncidents.send(JSON.stringify(oFollowUp));

				MessageToast.show(this.geti18NText("SUCCESS_SAVE_MSG"));
				this.onNavBack();

			}

		},
		_setWebSocket: function() {
			var sWSURL = "wss://" + window.location.host + "/sap/bc/apc/sap/zapc_ws_ctrl_twr";
			this._wsIncidents = new WebSocket(sWSURL);
		}
	});
});