/* eslint-disable no-undef, linebreak-style */
/*global location */
sap.ui.define([
	"sap/holcim/zctrl_tower/controller/BaseController",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"jquery.sap.global",
	"sap/ui/core/Fragment",
	"sap/m/Token",
	"sap/holcim/zctrl_tower/model/Formatter",
	"sap/holcim/zctrl_tower/model/ChartsApi"
], function(BaseController, MessageToast, MessageBox, JSONModel, jQuery, Fragment, Token, Formatter, ChartsApi) {
	"use strict";
	return BaseController.extend("sap.holcim.zctrl_tower.controller.Incidents", {
		formatter: Formatter,
		onInit: function() {

			this.oIncidentODataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/zapp_ctrl_twr_srv/");
			var oModel = new JSONModel({
				Incident: []
			});
			this.getView().setModel(oModel, "Incident");
			sap.ui.getCore().setModel(oModel, "Incident");

			this.getView().setModel(new JSONModel({
				userData: []
			}), "userDetail");

			this.getView().setModel(new JSONModel({
				CustomizingCountry: []
			}), "vm");

			this.getView().setModel(new JSONModel({
				connectedUsers: []
			}), "user");

			this.getView().setModel(new JSONModel({
				Kpi: []
			}), "KpiSLA");

			this.getView().setModel(new JSONModel({
				Reasons: []
			}), "ReasonModel");

			this.initWebSocket();

			sap.ui.core.BusyIndicator.show();
			this._setCountryes();
			this._setUserData();
			this._setWebSocket();
			/*var that = this;
			oModel.attachRequestCompleted(null, function() {
				ChartsApi.init(that.loadChart, that);	
			});*/
			//this._getIncidents();

		},
		onAfterRendering: function(oEvent) {

			if (oEvent.getParameter("id") === "__xmlview1") {
				//inicia somente na primeira vez que a pagina é aberta
				//ChartsApi.init(this.loadChart, this);
			}
			//ChartsApi.init(this.loadChart, this);
		},
		onExit: function() {
			//this._wsIncidents.close();
			$.sap._wsIncidents.close();
		},
		geti18NResourceBundle: function() {
			if (this.getView()) {
				return this.getView().getModel("i18n").getResourceBundle();
			} else {
				return null;
			}
		},
		geti18NText: function(k) {
			if (this.geti18NResourceBundle()) {
				return this.geti18NResourceBundle().getText(k);
			} else {
				return null;
			}
		},
		loadChart: function() {

			var oKPI = this.getView().getModel("KpiSLA");
			var oKpiData = oKPI.getData();

			if (oKpiData) {

				var data = {
					datasets: [{
						data: [oKpiData.Kpi.nrMesOp, oKpiData.Kpi.nrMesTot],
						backgroundColor: [
							'rgba(234, 52, 20)', //Red
							'rgba(93, 197, 27)' //Green
						]
					}],

					// These labels appear in the legend and in the tooltips when hovering different arcs
					labels: [
						this.geti18NText("OUTSIDE_SLA_TXT"), //'Outside SLA',
						this.geti18NText("WITHIN_SLA_TXT"), //'Within of the SLA'
					]
				};
				var options = {
					legend: {
						display: false
					}
				}

				//var chart = this.getView().byId('donut_single').getDomRef();
				var chart = document.getElementById("__xmlview1--donut_single");
				chart.innerHTML = "<canvas id='myChart' style='display: block; width: 160px; height: 90px;'></canvas>";
				var oCtx = document.getElementById("myChart");
				Chart.defaults.global.defaultFontSize = 12; //Tamanho Fonte legenda
				var myDoughnutChart = new Chart(oCtx, {
					type: 'doughnut',
					data: data,
					options: options
				});
			}

		},
		kpiSlaPress: function(oEvent){
			
			if (!this._oKpiPopover) {
				this._oKpiPopover = sap.ui.xmlfragment("popoverNavCon", "sap.holcim.zctrl_tower.view.KpiPopover", this);
				this.getView().addDependent(this._oKpiPopover);
			}

			// delay because addDependent will do a async rerendering and the popover will immediately close without it
			var oButton = oEvent.getSource();
			jQuery.sap.delayedCall(0, this, function() {
				this._oKpiPopover.openBy(oButton);
			});
			
		},
		onCountryF4: function(oEvent) {
			this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes").open();
			this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes").getBinding("items").filter([]);
		},
		onCountryValueHelpSearch: function(oSrc) {

			var sFiltro = oSrc.getParameter("value");
			var oFiltro = new sap.ui.model.Filter("country", sap.ui.model.FilterOperator.Contains, sFiltro);
			var oFiltroID = new sap.ui.model.Filter("countryID", sap.ui.model.FilterOperator.Contains, sFiltro);
			var aFilter = new sap.ui.model.Filter([oFiltro, oFiltroID]);
			var oBinding = oSrc.getSource().getBinding("items");
			oBinding.filter(aFilter);
		},
		onCountryValueHelpClose: function(oEvent) {
			var that = this;
			var oView = this.getView();
			var aRVFilter = [];
			var aSVFilter = [];
			var aEFFilter = [];

			var oMultiInput1 = oView.byId("mInpCountryes");
			var oSelItems = oEvent.getParameter("selectedContexts");

			if (oSelItems.length > 0) {

				var aTokens = [];

				for (var i = 0; i < oSelItems.length; i++) {
					var sCounrtyID = oSelItems[i].getProperty("countryID");
					aTokens.push(new Token({
						text: sCounrtyID,
						key: sCounrtyID,
						delete: function(e) {
							that.onDeleteCountry(e);
						},
						select: function(s) {
							that.onSelectCountry(s);
						}
					}));
					var oFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, sCounrtyID);
					aRVFilter.push(oFilter);
					aSVFilter.push(oFilter);
					aEFFilter.push(oFilter);
				}
				oMultiInput1.setTokens(aTokens);
				var aRVFilters = new sap.ui.model.Filter(aRVFilter);
				var aSVFilters = new sap.ui.model.Filter(aSVFilter);
				var aEFFilters = new sap.ui.model.Filter(aEFFilter);

				this.filterList("roadSafetyList", aRVFilters); //RoadSafe
				this.filterList("eficiencyList", aSVFilters); //Eficicncy
				this.filterList("customSrvList", aEFFilters); //Customer Service

			} else {
				oMultiInput1.removeAllTokens();
				this.filterList("roadSafetyList", new sap.ui.model.Filter([])); //RoadSafe
				this.filterList("eficiencyList", new sap.ui.model.Filter([])); //Eficicncy
				this.filterList("customSrvList", new sap.ui.model.Filter([])); //Customer Service
			}

		},
		filterList: function(slistID, aFilter) {

			var oList = this.byId(slistID);
			var oBinding = oList.getBinding("items");
			var oFilter = null;
			if (slistID === "roadSafetyList") {
				oFilter = new sap.ui.model.Filter("tpAlert", sap.ui.model.FilterOperator.EQ, "RS");
			} else if (slistID === "eficiencyList") {
				oFilter = new sap.ui.model.Filter("tpAlert", sap.ui.model.FilterOperator.EQ, "EF");
			} else {
				oFilter = new sap.ui.model.Filter("tpAlert", sap.ui.model.FilterOperator.EQ, "SV");

			}
			aFilter.aFilters.push(oFilter);
			oBinding.filter(aFilter.aFilters);
		},
		onDeleteCountry: function(oEvent) {

			var aTokens = oEvent.getSource().getParent().getTokens();
			var aRVFilter = [];
			var aSVFilter = [];
			var aEFFilter = [];
			for (var i = 0; i < aTokens.length; i++) {

				var oDelCountry = oEvent.getSource().getProperty("key");
				var oCountry = aTokens[i].getKey();
				if (oDelCountry !== oCountry) {
					var oFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oCountry);
					aRVFilter.push(oFilter);
					aSVFilter.push(oFilter);
					aEFFilter.push(oFilter);
				}
			}

			if (aRVFilter.length === 0) {
				//this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes")._list.removeSelections();
				this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes")._resetSelection();
			}
			var oSelItems = this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes").getItems();
			for (var idx = 0; idx < oSelItems.length; idx++) {
				if (oSelItems[idx].getBindingContext("vm").getObject().countryID === oDelCountry) {
					oSelItems[idx].setSelected(false);
					break;
				}
			}

			var aRVFilters = new sap.ui.model.Filter(aRVFilter);
			var aSVFilters = new sap.ui.model.Filter(aSVFilter);
			var aEFFilters = new sap.ui.model.Filter(aEFFilter);

			this.filterList("roadSafetyList", aRVFilters); //RoadSafe
			this.filterList("eficiencyList", aSVFilters); //Eficicncy
			this.filterList("customSrvList", aEFFilters); //Customer Service

		},
		onSelectCountry: function(oEvent) {

			var aTokens = oEvent.getSource().getParent().getTokens();
			var aRVFilter = [];
			var aSVFilter = [];
			var aEFFilter = [];
			for (var i = 0; i < aTokens.length; i++) {

				var oCountry = aTokens[i].getKey();
				var oFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oCountry);
				aRVFilter.push(oFilter);
				aSVFilter.push(oFilter);
				aEFFilter.push(oFilter);
			}

			var aRVFilters = new sap.ui.model.Filter(aRVFilter);
			var aSVFilters = new sap.ui.model.Filter(aSVFilter);
			var aEFFilters = new sap.ui.model.Filter(aEFFilter);

			this.filterList("roadSafetyList", aRVFilters); //RoadSafe
			this.filterList("eficiencyList", aSVFilters); //Eficicncy
			this.filterList("customSrvList", aEFFilters); //Customer Service

		},
		onListItemPress: function(oEvent) {

			var oUserDetailModel = this.getView().getModel("userDetail");
			var oItem = oEvent.getSource();
			var oPath = oItem.getBindingContext("Incident").getPath().substr(1);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oContext = oItem.getBindingContext("Incident");
			var oObj = oContext.getObject();
			oPath = oPath.replace("Incident/", "");
			var oLockIncident = {
				keyLock: []
			};

			if (oObj.isLocked === false || oObj.isLocked === "" || oObj.isLocked === undefined) {
				oObj.isLocked = true;
				oObj.userName = oUserDetailModel.oData.userData.Uname;

				var oIncident = {
					"incident": [oObj]
				};

				var oKeyLock = {
					key: oObj.key,
					isLocked: true,
					userName: oObj.userName,
					tknum: oObj.tknum
				};

				//oContext.getModel("Incident").refresh();
				var oList,
					oRoadSafetyList = this.byId("roadSafetyList"),
					oEficiencyList = this.byId("eficiencyList"),
					oCustomSrvList = this.byId("customSrvList");

				if (oObj.tpAlert === "RS") {
					oList = oRoadSafetyList;
				} else if (oObj.tpAlert === "EF") {
					oList = oEficiencyList;
				} else {
					oList = oCustomSrvList;
				}
				oList.getModel("Incident").refresh();

				oLockIncident.keyLock.push(oKeyLock);
				//this._wsIncidents.send(JSON.stringify(oLockIncident));
				$.sap._wsIncidents.send(JSON.stringify(oLockIncident));

				var oModel = sap.ui.getCore().getModel("Incident");
				oModel.refresh();
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

			onNavToDetail(oRouter, oPath);

		},
		_setIncidentWindowScroll: function() {
			var oIncidentWindow = this.byId("incidentWindow");
			oIncidentWindow.addEventDelegate({
				onAfterRendering: function() {
					var aContent = oIncidentWindow.getContent();
					if (aContent.length > 0) {
						//var $lastItem = jQuery.sap.byId(aContent.pop().sId);
						//oIncidentWindow.scrollTo($lastItem.position().top + $lastItem.outerHeight());
					}
				}
			}, this);
		},
		_setUserData: function() {
			var p = "/UserDetailSet('')";
			var oUserDetailModel = this.getView().getModel("userDetail");
			this.oIncidentODataModel.read(p, {
				async: true,
				success: function(oData) {
					oUserDetailModel.setProperty("/userData", oData);
					sap.ui.getCore().setModel(oUserDetailModel,"userDetail");
				},
				error: null
			});
		},
		_setCountryes: function() {
			var p = "/CustomizingCountryCollection";
			var oCountryModel = this.getView().getModel("vm");
			this.oIncidentODataModel.read(p, {
				async: true,
				success: function(oData) {
					oCountryModel.setProperty("/CustomizingCountry", oData.results);
				},
				error: null
			});

			if (window.location.host.slice(0, 9) === "localhost") {

				var oCoutLocalModel = new JSONModel("./localService/mockData/Countryes.json");
				this.getView().setModel(oCoutLocalModel, "vm");

			}
		},
		_getIncidents: function() {
			//var p = "/IncidentSet('Incident')";
			var p = "/IncidentSet";
			var oIncidentModel = this.getView().getModel("Incident");
			var oKpiModel = this.getView().getModel("KpiSLA");
			var oReasonModel = this.getView().getModel("ReasonModel");
			var that = this;
			this.oIncidentODataModel.read(p, {
				async: true,
				success: function(oData) {

					for (var i = 0; i < oData.results.length; i++) {

						if (oData.results[i].ObjName === "Incident") {
							var aIncidents = JSON.parse(oData.results[i].JsonObj);
							oIncidentModel.setProperty("/Incident", aIncidents.incident);
							sap.ui.getCore().setModel(oIncidentModel, "Incident");
						}

						if (oData.results[i].ObjName === "Indi") {
							var oKpiData = JSON.parse(oData.results[i].JsonObj);
							oKpiModel.setProperty("/Kpi", oKpiData);
							sap.ui.getCore().setModel(oKpiModel, "KpiSLA");
							//ChartsApi.init(that.loadChart, that);

						}

						if (oData.results[i].ObjName === "Motivos") {
							var oReason = JSON.parse(oData.results[i].JsonObj);
							oReasonModel.setProperty("/Reasons", oReason);
							sap.ui.getCore().setModel(oReasonModel, "ReasonModel");
						}

					}

					sap.ui.core.BusyIndicator.hide();
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
				}
			});

		},
		_setWebSocket: function() {
			//var sWSURL = "wss://" + window.location.host + "/sap/bc/apc/sap/zapc_ws_ctrl_twr";
			var oUserModel = this.getView().getModel("user"),
				oIncidentModel = this.getView().getModel("Incident"),
				oRoadSafetyList = this.byId("roadSafetyList"),
				oEficiencyList = this.byId("eficiencyList"),
				oCustomSrvList = this.byId("customSrvList");
			//	this._wsIncidents = new WebSocket(sWSURL);
			var t = this;
			//this._wsIncidents.addEventListener("message", function(oEvent) {
			$.sap._wsIncidents.addEventListener("message", function(oEvent) {
				var oData = JSON.parse(oEvent.data);
				if (oData.connectedUsers) {
					oUserModel.setProperty("/connectedUsers", oData.connectedUsers);
					t._getIncidents();
				}
				if (oData.incident) {
					//oIncidentModel.setProperty("/Incident", oData.incident);
					var aList = oIncidentModel.getData().Incident;

					for (var i = 0; i < oData.incident.length; i++) {

						var oResult = aList.find(inc => {
							return inc.key === oData.incident[i].key
						});
						if (oResult) {

						} else {
							aList.push(oData.incident[i]);
						}

					}
					oIncidentModel.setProperty("/Incident", aList);
					oIncidentModel.refresh();

				}
				if (oData.keyLock) {

					for (var i = 0; i < oData.keyLock.length; i++) {
						var oKeyLock = oData.keyLock[i];
						var oResult = oIncidentModel.getData().Incident.find(inc => {
							return inc.key === oKeyLock.key
						});
						var oIndex = oIncidentModel.getData().Incident.findIndex(idx => {
							return idx.key === oKeyLock.key
						});
						if (oResult) {
							if (oKeyLock.isLocked) {
								oResult.userName = oKeyLock.userName;
							} else {
								oResult.userName = "";
							}
							
							oResult.isLocked = oKeyLock.isLocked;
							oIncidentModel.setProperty("/Incident/" + oIndex, oResult);
							var aIncidents =  oIncidentModel.getData().Incident.filter(r => { return r.tknum == oKeyLock.tknum  });
							for (var x = 0; x < aIncidents.length; x++) {
								var oRel = aIncidents[x].relation.find(r => {
									return r.key === oKeyLock.key
								});
								if (oRel) {
									oRel.isLocked = oResult.isLocked;
									oRel.userName = oResult.userName;
								}
							}
							oIncidentModel.refresh();
						}
					}

				}
				if (oData.idFollowUp !== undefined) {

					var aIncidents = oIncidentModel.getData().Incident;
					var oIndex = aIncidents.findIndex(idx => {
						return idx.key === oData.key
					});
					if (oIndex !== undefined) {
						aIncidents.splice(oIndex, 1);
					}
					if (oData.relation) {
						for (var x = 0; x < oData.relation.length; x++) {
							var oRelIndex = aIncidents.findIndex(relIdx => {
								return relIdx.key === oData.relation[x].key
							});
							if (oRelIndex !== undefined) {
								aIncidents.splice(oRelIndex, 1);
							}
						}
					}

					oIncidentModel.setProperty("/Incident", aIncidents);
					oIncidentModel.refresh();

				}

			});
		},
		getDialogAdd: function(oFragment) {
			if (!this._oDialogCounty) {
				this._oDialogCounty = sap.ui.xmlfragment(oFragment, this);
				this.getView().addDependent(this._oDialogCounty);
			}
			return this._oDialogCounty;
		},
		onOpenPopover: function(oEvent) {

			// create popover
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("popoverNavCon", "sap.holcim.zctrl_tower.view.UserDetailPopover", this);
				this.getView().addDependent(this._oPopover);
			}

			// delay because addDependent will do a async rerendering and the popover will immediately close without it
			var oButton = oEvent.getSource();
			jQuery.sap.delayedCall(0, this, function() {
				this._oPopover.openBy(oButton);
			});
		},
		onNavToUser: function(oEvent) {

			var oCtx = oEvent.getSource().getBindingContext("user");
			var oNavCon = Fragment.byId("popoverNavCon", "navCon");
			var oDetailPage = Fragment.byId("popoverNavCon", "detail");
			oNavCon.to(oDetailPage);
			oDetailPage.bindElement({
				path: oCtx.getPath(),
				model: "user"
			});
		},

		onNavBack: function(oEvent) {
			var oNavCon = Fragment.byId("popoverNavCon", "navCon");
			oNavCon.back();
		},
		_handleLogout: function(oEvent) {

			MessageBox.show(this.geti18NText("LOGOUT_MSG"), {
				icon: MessageBox.Icon.INFORMATION,
				title: this.geti18NText("TITLE_INFORMATION"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				styleClass: "sapUiSizeCompact",
				onClose: function(a) {
					if (a === MessageBox.Action.YES) {
						jQuery.ajax({
							type: "GET",
							contentType: "application/json",
							url: "/sap/public/bc/icf/logoff",
							dataType: "json",
							async: true,
							success: function(data, textStatus, jqXHR) {

								if (!document.execCommand("ClearAuthenticationCache")) {
									//"ClearAuthenticationCache" will work only for IE. Below code for other browsers  
									jQuery.ajax({
										type: "GET",
										url: "/sap/public/bc/icf/logoff", //any URL to a Gateway service  
										username: '', //dummy credentials: when request fails, will clear the authentication header  
										password: '',
										statusCode: {
											401: function() {
												//This empty handler function will prevent authentication pop-up in chrome/firefox  
											}
										},
										error: function() {
											//alert('reached error of wrong username password')  
										}
									});

								}
								//window.location.reload(true); // Reloads page at same location
								window.location.replace("/sap/bc/ui5_ui5/sap/zctrl_tower/index.html");
							},
							error: function(oError) {
								//window.location.reload(true); // Reloads page at same location
								window.location.replace("/sap/bc/ui5_ui5/sap/zctrl_tower/index.html");
							}
						});

					}
				}

			});
		}
	});
});