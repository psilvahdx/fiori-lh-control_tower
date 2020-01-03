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
	"sap/ui/core/format/DateFormat"
], function(BaseController, MessageToast, MessageBox, JSONModel, jQuery, Fragment, Token, Formatter, DateFormat) {
	"use strict";
	return BaseController.extend("sap.holcim.zctrl_tower.controller.App", {
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
				Reasons: []
			}), "ReasonModel");

			this.getView().setModel(new JSONModel({
				"dateFrom": "",
				"dateTo": "",
				"selectedCountries": [],
				"aRVFilters": new sap.ui.model.Filter([]),
				"aSVFilters": new sap.ui.model.Filter([]),
				"aEFFilters": new sap.ui.model.Filter([])
			}), "filter");

			if (this.oView.getId() === "__xmlview0") {
				this.initWebSocket();
			}
			sap.ui.core.BusyIndicator.show();
			this._setCountryes();
			this._setUserData();
			this._setWebSocket();
			this._getIncidents();
		},
		onExit: function() {
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
		kpiSlaPress: function(oEvent) {

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
		kpiDataSumAll: function(aKpiData, aCountries) {

			var oKpiConsolidado = {
				"land1": "",
				"group": "ALL",
				"a1": 0,
				"a2": 0,
				"a3": 0,
				"a4Rs": 0,
				"a4Ef": 0,
				"a4Sv": 0,
				"a5Rs": 0,
				"a5Ef": 0,
				"a5Sv": 0,
				"a6": 0,
				"red": 0,
				"green": 0,
				"kpi": 0,
				"total": 0,
				"dtLastUpd": "",
				"dtNextUpd": ""
			};

			var bToday = false;
			var oFilterModel = this.getView().getModel("filter");

			if (oFilterModel.getProperty("/dateFrom") !== "") {
				bToday = true;
			}

			//Sumarize KPI
			for (var i = 0; i < aKpiData.length; i++) {

				var oKpi = JSON.stringify(aKpiData[i]);
				oKpi = JSON.parse(oKpi);

				if (aCountries.length > 0) {

					try {
						var oResult = aCountries.find(country => {
							return country.getProperty("countryID") === oKpi.land1;
						});

					} catch (ex) {
						oResult = aCountries.find(country => {
							return country === oKpi.land1;
						});

					}

					if (!oResult) {
						continue;
					}
				}
				//Filtro no dia atual, desconsidera group = ALL
				if (bToday) {
					if (oKpi.group === "ALL") {
						continue;
					}
				} else {
					//Filtro padrão, desconsidera group = DAY
					if (oKpi.group !== "ALL") {
						continue;
					}
				}

				oKpiConsolidado.a1 += oKpi.a1;
				oKpiConsolidado.a2 += oKpi.a2;
				oKpiConsolidado.a3 += oKpi.a3;
				oKpiConsolidado.a6 += oKpi.a6;
				oKpiConsolidado.a4Rs += oKpi.a4Rs;
				oKpiConsolidado.a4Ef += oKpi.a4Ef;
				oKpiConsolidado.a4Sv += oKpi.a4Sv;
				oKpiConsolidado.a5Rs += oKpi.a5Rs;
				oKpiConsolidado.a5Ef += oKpi.a5Ef;
				oKpiConsolidado.a5Sv += oKpi.a5Sv;
				oKpiConsolidado.red += oKpi.red;
				oKpiConsolidado.green += oKpi.green;
				oKpiConsolidado.kpi += oKpi.kpi;
				oKpiConsolidado.total = (oKpiConsolidado.green + oKpiConsolidado.red);
			}

			//LastUpdate
			oKpiConsolidado.dtLastUpd = new Date();
			var dtNextUpd = new Date();
			oKpiConsolidado.dtNextUpd = new Date(dtNextUpd.setMilliseconds(1000 * 60));
			oKpiConsolidado.dtLastUpd = oKpiConsolidado.dtLastUpd.toLocaleString();
			oKpiConsolidado.dtNextUpd = oKpiConsolidado.dtNextUpd.toLocaleString();

			this.getView().setModel(new JSONModel(oKpiConsolidado), "KpiSLA");
			sap.ui.getCore().setModel(new JSONModel(aKpiData), "AllKpiSLA");

			var y = setInterval(function() {
				$(".sapSuiteRMCFont").css("text-shadow", "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000");
				var oPercentual = (oKpiConsolidado.green / oKpiConsolidado.total) * 100;
				oPercentual = Math.round(oPercentual);
				$(".sapSuiteRMCFont").text(oPercentual + "%");
				$(".sapSuiteRMCFont").css("font-size", "315px");

				if (oPercentual >= 90) {
					$(".sapSuiteRMCFont").css("fill", "rgb(7, 236, 105)"); //Green
				} else if (oPercentual >= 70 && oPercentual < 90) {
					$(".sapSuiteRMCFont").css("fill", "rgb(255, 254, 0)"); //Yellow
				} else {
					$(".sapSuiteRMCFont").css("fill", "rgba(234, 52, 20)"); //Red
					$(".sapSuiteRMCFont").css("font-size", "360px");
				}
				clearInterval(y);
			}, 200);

			this._countDownKpi(dtNextUpd);

		},
		_countDownKpi: function(oDate) {

			var getTimeSla = function(cDDate) {

				// Get todays date and time
				var now = new Date().getTime();
				// Find the distance between now and the count down date
				//var distance = cDDate - now;
				var isExpired = cDDate < now;
				var distance = !isExpired ? cDDate - now : now - cDDate;

				// Time calculations for days, hours, minutes and seconds
				var days = Math.floor(distance / (1000 * 60 * 60 * 24));
				var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				//if (days !== -1) { //data de Hoje
				hours += (days * 24);
				//}
				var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
				var seconds = Math.floor((distance % (1000 * 60)) / 1000);

				var sHours;
				var sMinutes;
				var sSeconds;

				if (isExpired) {
					sHours = "-" + hours.toString().padStart(2, "0");
				} else {
					sHours = hours.toString().padStart(2, "0");
				}
				sMinutes = minutes.toString().padStart(2, "0");
				sSeconds = seconds.toString().padStart(2, "0");

				return sHours + ":" + sMinutes + ":" + sSeconds;

			};

			// Set the date we're counting down to
			var countDownDate = new Date(oDate).getTime();
			var oKpiConsolidado = this.getView().getModel("KpiSLA");

			var x = function(cdDate, oKpiConsolidado) {
				var oLDate = cdDate;
				var oLKpiConsolidado = oKpiConsolidado;
				return setInterval(function() {
					var sReturn = getTimeSla(oLDate);
					oLKpiConsolidado.setProperty("/timer", sReturn);
					oLKpiConsolidado.refresh();

				}, 1000);
			};

			var a = x(countDownDate, oKpiConsolidado);

		},

		onFilterOpen: function(oEvent) {
			this.getDialogFilter("sap.holcim.zctrl_tower.view.Filters").open();
			//Limpa Filtros selecionados
			var oFilterModel = this.getView().getModel("filter");
			oFilterModel.setProperty("/aRVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aSVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aEFFilters", new sap.ui.model.Filter([]));
		},
		getDialogFilter: function(oFragment) {
			if (!this._oDialogFilter) {
				this._oDialogFilter = sap.ui.xmlfragment(oFragment, this);
				this.getView().addDependent(this._oDialogFilter);
			}
			return this._oDialogFilter;
		},
		handleConfirmFilter: function(oEvent) {

			var oBtnOpenFilters = this.getView().byId("btnOpenFilters");
			var oFilterModel = this.getView().getModel("filter");
			var aSelectedCountries = oFilterModel.getProperty("/selectedCountries");
			var aKpiData = [];

			if (sap.ui.getCore().getModel("AllKpiSLA")) {
				aKpiData = sap.ui.getCore().getModel("AllKpiSLA").getData();
				this.kpiDataSumAll(aKpiData, aSelectedCountries); //Sum KPIs by Countries
			}

			var oDateFilter = this._getDateFilter();
			if (oDateFilter !== null) {
				oBtnOpenFilters.setType("Emphasized"); //Filtro somente por data
			} else if (aSelectedCountries.length > 0) {
				oBtnOpenFilters.setType("Emphasized"); //Filtro simente por País(es)
			} else {
				oBtnOpenFilters.setType("Default"); //nenhuma opção de filtro selecionado
			}

			this.filterList("roadSafetyList", oFilterModel.getProperty("/aRVFilters")); //RoadSafe
			this.filterList("eficiencyList", oFilterModel.getProperty("/aSVFilters")); //Eficicncy
			this.filterList("customSrvList", oFilterModel.getProperty("/aEFFilters")); //Customer Service

			this._oDialogFilter.close();
		},
		_getDateFilter: function() {
			var oFilterModel = this.getView().getModel("filter");
			var oDateFilter = null;
			var oDtFrom = oFilterModel.getProperty("/dateFrom");
			//var oDtTo = oFilterModel.getProperty("/dateTo");
			var bToday = sap.ui.getCore().byId("RBToday").getSelected();
			oDtFrom = new Date();

			var oDateFormat = DateFormat.getDateTimeInstance({
				//pattern: "YYYYMMdd" //Alterado dia 26.06.19
				pattern: "YYYY-MM-dd"
			});

			oDtFrom = oDateFormat.format(oDtFrom);

			if (bToday) {
				oDateFilter = new sap.ui.model.Filter("data", sap.ui.model.FilterOperator.EQ, oDtFrom);
			}

			return oDateFilter;
		},

		_getCountryFilter: function() {
			var oFilterModel = this.getView().getModel("filter");
			var oCountryFilter = null;
			var aCountryFilter = [];
			var aSelectedCountries = oFilterModel.getProperty("/selectedCountries");

			try {

				for (var i = 0; i < aSelectedCountries.length; i++) {
					var oCountry = aSelectedCountries[i].getProperty("countryID");
					oCountryFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oCountry);
					aCountryFilter.push(oCountryFilter);
				}
			} catch (ex) {

			}

			return aCountryFilter;
		},

		handleClearFilter: function(oEvent) {
			var oMultiInput1 = sap.ui.getCore().byId("mInpCountryes");
			var oFilterModel = this.getView().getModel("filter");
			var rbAll = sap.ui.getCore().byId("RBAll");

			rbAll.setSelected(true);

			oMultiInput1.removeAllTokens();
			this.clearSelectedCountries();

			oFilterModel.setData({
				"dateFrom": "",
				"dateTo": "",
				"selectedCountries": [],
				"aRVFilters": new sap.ui.model.Filter([]),
				"aSVFilters": new sap.ui.model.Filter([]),
				"aEFFilters": new sap.ui.model.Filter([])
			});

			var oBtnOpenFilters = this.getView().byId("btnOpenFilters");
			oBtnOpenFilters.setType("Default");
		},
		clearSelectedCountries: function() {
			var oSelItems = this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes").getItems();
			for (var idx = 0; idx < oSelItems.length; idx++) {
				oSelItems[idx].setSelected(false);
			}
		},
		handleCancelFilter: function(oEvent) {
			this._oDialogFilter.close();
		},

		onDateFromChange: function(oEvent) {
			var oDtTo = sap.ui.getCore().byId("dtTo");
			oDtTo.setMinDate(oEvent.getSource().getDateValue());
		},
		onRbPeriodSelect: function(oEvent) {
			var oSelIndex = oEvent.getParameter("selectedIndex");
			var oFilterModel = this.getView().getModel("filter");
			var oDtFrom = oFilterModel.getProperty("/dateFrom");

			if (oSelIndex === 1) { //Hoje
				oDtFrom = new Date();
				var oDateFormat = DateFormat.getDateTimeInstance({
					//pattern: "YYYYMMdd" //Alterado em 26.06.19
					pattern: "YYYY-MM-dd"
				});

				oDtFrom = oDateFormat.format(oDtFrom);
			} else {
				oDtFrom = "";
			}
			oFilterModel.setProperty("/dateFrom", oDtFrom);
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
			var oFilterModel = this.getView().getModel("filter");
			oFilterModel.setProperty("/aRVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aSVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aEFFilters", new sap.ui.model.Filter([]));

			var oMultiInput1 = sap.ui.getCore().byId("mInpCountryes");
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

				//this.kpiDataSumAll(aKpiData, oSelItems); //Sum KPIs by Countries
				oFilterModel.setProperty("/selectedCountries", oSelItems); //Countries Filter
				oFilterModel.setProperty("/aRVFilters", aRVFilters); //RoadSafe
				oFilterModel.setProperty("/aSVFilters", aSVFilters); //Eficicncy
				oFilterModel.setProperty("/aEFFilters", aEFFilters); //Customer Service

			} else {
				oMultiInput1.removeAllTokens();
				oFilterModel.setProperty("/selectedCountries", []); //Countries Filter
				oFilterModel.setProperty("/aRVFilters", new sap.ui.model.Filter([])); //RoadSafe
				oFilterModel.setProperty("/aSVFilters", new sap.ui.model.Filter([])); //Eficicncy
				oFilterModel.setProperty("/aEFFilters", new sap.ui.model.Filter([])); //Customer Service
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

			//Date Filter
			var oFilterDate = this._getDateFilter();
			if (oFilterDate !== null) {
				aFilter.aFilters.push(oFilterDate);
			}

			//Country Filter
			var aCountryFilter = this._getCountryFilter();
			if (aCountryFilter.length > 0) {
				//set Filter by Country
				for (var i = 0; i < aCountryFilter.length; i++) {
					aFilter.aFilters.push(aCountryFilter[i]);
				}
			}
			
			aFilter.aFilters.push(oFilter);
			oBinding.filter(aFilter.aFilters);
		},
		onDeleteCountry: function(oEvent) {

			var aTokens = oEvent.getSource().getParent().getTokens();
			var aRVFilter = [];
			var aSVFilter = [];
			var aEFFilter = [];
			//var aKpiData = sap.ui.getCore().getModel("AllKpiSLA").getData();
			var aSelCountries = [];
			var oFilterModel = this.getView().getModel("filter");
			oFilterModel.setProperty("/aRVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aSVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aEFFilters", new sap.ui.model.Filter([]));

			for (var i = 0; i < aTokens.length; i++) {

				var oDelCountry = oEvent.getSource().getProperty("key");
				var oCountry = aTokens[i].getKey();
				if (oDelCountry !== oCountry) {
					var oFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oCountry);
					aRVFilter.push(oFilter);
					aSVFilter.push(oFilter);
					aEFFilter.push(oFilter);
					aSelCountries.push(oCountry); //Countries to Sum Kpi
				}
			}

			if (aRVFilter.length === 0) {
				this.getDialogAdd("sap.holcim.zctrl_tower.view.Countryes")._resetSelection();
				aSelCountries = [];
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

			oFilterModel.setProperty("/selectedCountries", aSelCountries); //Countries Filter
			oFilterModel.setProperty("/aRVFilters", aRVFilters); //RoadSafe
			oFilterModel.setProperty("/aSVFilters", aSVFilters); //Eficicncy
			oFilterModel.setProperty("/aEFFilters", aEFFilters); //Customer Service

		},
		onSelectCountry: function(oEvent) {

			var aTokens = oEvent.getSource().getParent().getTokens();
			var aRVFilter = [];
			var aSVFilter = [];
			var aEFFilter = [];
			//var aKpiData = sap.ui.getCore().getModel("AllKpiSLA").getData();
			var aSelCountries = [];
			var oFilterModel = this.getView().getModel("filter");
			oFilterModel.setProperty("/aRVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aSVFilters", new sap.ui.model.Filter([]));
			oFilterModel.setProperty("/aEFFilters", new sap.ui.model.Filter([]));

			for (var i = 0; i < aTokens.length; i++) {

				var oCountry = aTokens[i].getKey();
				var oFilter = new sap.ui.model.Filter("land1", sap.ui.model.FilterOperator.EQ, oCountry);
				aRVFilter.push(oFilter);
				aSVFilter.push(oFilter);
				aEFFilter.push(oFilter);
				aSelCountries.push(oCountry); //Countries to Sum Kpi
			}

			var aRVFilters = new sap.ui.model.Filter(aRVFilter);
			var aSVFilters = new sap.ui.model.Filter(aSVFilter);
			var aEFFilters = new sap.ui.model.Filter(aEFFilter);

			//this.kpiDataSumAll(aKpiData, aSelCountries); //Sum KPIs
			oFilterModel.setProperty("/selectedCountries", aSelCountries); //Countries Filter
			oFilterModel.setProperty("/aRVFilters", aRVFilters); //RoadSafe
			oFilterModel.setProperty("/aSVFilters", aSVFilters); //Eficicncy
			oFilterModel.setProperty("/aEFFilters", aEFFilters); //Customer Service

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
					}, false);

					clearInterval(x);
				}, 500);

			};

			onNavToDetail(oRouter, oPath);

		},
		_setUserData: function() {
			var p = "/UserDetailSet('')";
			var oUserDetailModel = this.getView().getModel("userDetail");
			this.oIncidentODataModel.read(p, {
				async: true,
				success: function(oData) {
					oUserDetailModel.setProperty("/userData", oData);
					sap.ui.getCore().setModel(oUserDetailModel, "userDetail");
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
			var p = "/IncidentSet";
			var oIncidentModel = this.getView().getModel("Incident");
			var oReasonModel = this.getView().getModel("ReasonModel");
			var oUserModel = this.getView().getModel("user");
			var that = this;
			this.oIncidentODataModel.read(p, {
				async: true,
				success: function(oData) {

					for (var i = 0; i < oData.results.length; i++) {

						if (oData.results[i].ObjName === "Incident") {
							var aIncidents = JSON.parse(oData.results[i].JsonObj);
							oIncidentModel.setProperty("/Incident", aIncidents.incident);
							sap.ui.getCore().setModel(oIncidentModel, "Incident");
							oIncidentModel.setSizeLimit(5000);
						}

						if (oData.results[i].ObjName === "Indi") {
							var aKpiData = JSON.parse(oData.results[i].JsonObj);
							that.kpiDataSumAll(aKpiData.indi, []);
						}

						if (oData.results[i].ObjName === "Motivos") {
							var oReason = JSON.parse(oData.results[i].JsonObj);
							oReasonModel.setProperty("/Reasons", oReason);
							sap.ui.getCore().setModel(oReasonModel, "ReasonModel");
						}

						if (oData.results[i].ObjName === "ConnectedUsers") {
							var aUsers = JSON.parse(oData.results[i].JsonObj);
							oUserModel.setProperty("/connectedUsers", aUsers.connectedUsers);
							sap.ui.getCore().setModel(oUserModel, "user");
						}

					}
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
				}
			});

		},
		_getKpis: function() {
			//var that = this;
			var vRefresh = setInterval(function() {

				var oKpis = {
					"land1": "XX",
					"a1": 0,
					"a2": 0,
					"a3": 0,
					"a4Rs": 0,
					"a4Ef": 0,
					"a4Sv": 0,
					"a5Rs": 0,
					"a5Ef": 0,
					"a5Sv": 0,
					"a6": 0,
					"red": 0,
					"green": 0,
					"kpi": 0,
				}

				$.sap._wsIncidents.send(JSON.stringify(oKpis));

			}, 60000); // 1 Min
		},
		_setWebSocket: function() {

			var oUserModel = this.getView().getModel("user"),
				oIncidentModel = this.getView().getModel("Incident"),
				oRoadSafetyList = this.byId("roadSafetyList"),
				oEficiencyList = this.byId("eficiencyList"),
				oCustomSrvList = this.byId("customSrvList"),
				oFilterModel = this.getView().getModel("filter");

			var t = this;

			$.sap._wsIncidents.addEventListener("message", function(oEvent) {

				if (oEvent.data !== "") {
					var oData = JSON.parse(oEvent.data);

					if (oData.connectedUsers) {

						sap.ui.core.BusyIndicator.hide();
						var aUsersList = oUserModel.getData().connectedUsers;

						for (var u = 0; u < oData.connectedUsers.length; u++) {

							var oUsrResult;
							var oIndex;
							if (aUsersList) {
								if (aUsersList.length > 0) {
									oUsrResult = aUsersList.find(user => {
										return user.id === oData.connectedUsers[u].id
									});
									oIndex = aUsersList.findIndex(idx => {
										return idx.id === oData.connectedUsers[u].id
									});
								}
							}
							if (oUsrResult) {
								if (!oUsrResult.logado || oUsrResult.logado === "") {
									aUsersList.splice(oIndex, 1);
								}

							} else {
								aUsersList.push(oData.connectedUsers[u]);
							}
						}
						oUserModel.setProperty("/connectedUsers", aUsersList);
						oUserModel.refresh();
					}
					if (oData.incident) {

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
								var aIncidents = oIncidentModel.getData().Incident.filter(r => {
									return r.tknum == oKeyLock.tknum
								});
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
						if (oIndex !== undefined && oIndex >= 0) {
							aIncidents.splice(oIndex, 1);
						}
						if (oData.relation) {
							for (var x = 0; x < oData.relation.length; x++) {
								//Remove Incident main list
								var oRelIndex = aIncidents.findIndex(relIdx => {
									return relIdx.key === oData.relation[x].key
								});
								if (oRelIndex !== undefined) {
									aIncidents.splice(oRelIndex, 1);
								}

								for (var y = 0; y < aIncidents.length; y++) {
									//unlock Incident in Relation list
									var oFollowRel = aIncidents[y].relation.find(fR => {
										return fR.key === oData.relation[x].key
									});
									if (oFollowRel) {
										oFollowRel.isLocked = false;
										oFollowRel.userName = "";
										oFollowRel.closeFol = true;
									}

								}

							}
						}
						for (var x = 0; x < aIncidents.length; x++) {
							var oRel = aIncidents[x].relation.find(r => {
								return r.key === oData.key
							});
							if (oRel) {
								oRel.isLocked = false;
								oRel.userName = "";
								oRel.closeFol = true;
							}
						}

						oIncidentModel.setProperty("/Incident", aIncidents);
						oIncidentModel.refresh();

					}
					if (oData.indi) {
						var aCountries = [];
						aCountries = oFilterModel.getProperty("/selectedCountries");
						t.kpiDataSumAll(oData.indi, aCountries);
					}

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
						sap.ui.core.BusyIndicator.show();
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
								sap.ui.core.BusyIndicator.hide();
							},
							error: function(oError) {
								//window.location.reload(true); // Reloads page at same location
								sap.ui.core.BusyIndicator.hide();
								window.location.replace("/sap/bc/ui5_ui5/sap/zctrl_tower/index.html");

							}
						});

					}
				}

			});
		}
	});
});