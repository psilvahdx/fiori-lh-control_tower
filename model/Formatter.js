/* eslint-disable no-undef, linebreak-style */
sap.ui.define([
	"sap/holcim/zctrl_tower/model/moment"
], function(moment) {
	"use strict";

	var Formatter = {
		aInterval: [],
		displayUserLock: function(oUsr) {
			try {

				var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (oUsr !== "" && oUsr !== undefined) {
					return resourceBundle.getText("USER_LOCK", [oUsr]);
				} else {
					return "";
				}

			} catch (error) {
				return "";
			}

		},
		enableSave: function(oUsr) {

			try {

				var oUserModel = this.getView().getModel("userDetail");
				if (oUsr !== "" && oUsr !== undefined) {
					if (oUserModel.oData.userData.Uname === oUsr) {
						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}

			} catch (error) {
				return true;
			}

		},
		statusIncident: function(bClose) {
			if (bClose) {
				return "Error";
			} else {
				return "None";
			}
		},
		closeFolowUpText: function(bClose) {
			try{
			var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
			if (bClose) {
				return resourceBundle.getText("INCIDENT_FINISH_MSG");
			} else {
				return "";
			}
			}
			catch(error){
				return "";
			}
		},
		typeList: function(bClose) {
			if (bClose) {
				return "Inactive";
			} else {
				return "Active";
			}
		},
		showFolder: function(isLocked) {

			if (isLocked !== false && isLocked !== "" && isLocked !== undefined) {
				return "sap-icon://folder-full";
			} else {
				return "sap-icon://open-folder";
			}
		},
		getCoutryFlag: function(oCountry) {

			var img = "./imgs/" + oCountry + ".jpg";

			return img;

		},
		formatKPIText: function(oKpiValue) {

			if (oKpiValue) {
				return oKpiValue.toString() + "%";
			} else {
				return "";
			}

		},
		formatKPITooltip: function(oIn, oOut) {
			var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var sTooltip = resourceBundle.geti18NText("OUTSIDE_SLA_TXT") && ":" && oOut;
			sTooltip += " , " && resourceBundle.geti18NText("WITHIN_SLA_TXT") && ":" && oIn;
			return sTooltip;
		},
		formatDate: function(oDate) {

			if (typeof oDate === "string") {
				if (oDate.substring(0, 6) === "/Date(") {
					oDate = oDate.replace("/Date(", "").replace(")/", "");
					oDate = parseInt(oDate);
					oDate = new Date(oDate);
				} else {
					oDate = new Date(parseInt(oDate));
				}

			}
			if (oDate) {
				return oDate.toLocaleString();
			} else {
				return "";
			}

		},
		formatDateTitle: function(sDate, sHour) {
			var sDateReturn = "";
			
			if (sDate !== null && sHour !== null ) {
				//formato para todos os navegadores
				var vDate = new Date(
					sDate.substring(5, 7) + "/" + //Mês
					sDate.substring(8,10) + "/" + //Dia
					sDate.substring(0, 4) + " " + //Ano
					sHour //Hora
				);

				if (vDate) {
					sDateReturn =  vDate.toLocaleString();
				}
				
			}
			
			return sDateReturn;
		},
		formatShortNameTitle: function(sShortName, sDate, sHour) {
			var sReturn = "";

			if (sShortName !== null && sDate !== null && sHour !== null ) {
				//formato para todos os navegadores
				var vDate = new Date(
					sDate.substring(5, 7) + "/" + //Mês
					sDate.substring(8,10) + "/" + //Dia
					sDate.substring(0, 4) + " " + //Ano
					sHour //Hora
					/*sDate.substring(4, 6) + "/" + //Mês
					sDate.substring(6, 8) + "/" + //Dia
					sDate.substring(0, 4) + " " + //Ano
					sHour.substring(0, 2) + ":" + //Hora
					sHour.substring(2, 4) + ":" + //Minuto
					sHour.substring(4, 6) //segundos*/
				);

				if (vDate) {
					sReturn = sShortName + " (" + vDate.toLocaleString() + ")";
				} else {
					sReturn = sShortName;
				}
			}

			return sReturn;
		},
		formatStateTrip: function(sTripType){
			var sState = "Success";
			
			if(sTripType !== "Outbound"){
				sState = "Warning";
			}
		
			return sState;
		},
		setCountDownKeyRS: function(oKey, oDate) {
			var t = this;

			var aInterval = sap.ui.getCore().getModel("aInterval");

			if (typeof oDate === "string") {
				if (oDate.substring(0, 6) === "/Date(") {
					oDate = oDate.replace("/Date(", "").replace(")/", "");
					oDate = parseInt(oDate);
					oDate = new Date(oDate);
				} else {
					oDate = new Date(parseInt(oDate));
				}

			} else {
				oDate = new Date(parseInt(oDate));
			}

			if (oDate) {

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

					if (isExpired && hours > 98) {
						return "-99:00:00";
					} else {

						if (isExpired) {
							sHours = "-" + hours.toString().padStart(2, "0");
						} else {
							sHours = hours.toString().padStart(2, "0");
						}
						sMinutes = minutes.toString().padStart(2, "0");
						sSeconds = seconds.toString().padStart(2, "0");

						return sHours + ":" + sMinutes + ":" + sSeconds;
					}

				};
				// Set the date we're counting down to
				var countDownDate = new Date(oDate).getTime();

				var x = function(oItem, cdDate) {
					var oT = oItem;
					var oLDate = cdDate;
					return setInterval(function() {

						var sReturn = getTimeSla(oLDate);
						var aLbl = $("label[data-lblsla='" + oT.getValue() + "']");
						var oLbl;

						if (aLbl.length > 1) {
							oLbl = aLbl[aLbl.length - 1];
						} else {
							oLbl = aLbl[0];
						}
						if (oLbl) {

							var oIntervals = sap.ui.getCore().getModel("aInterval");

							for (var i = 0; i < oIntervals.length; i++) {

								if (oIntervals[i].key === oT.getValue()) {

									oIntervals[i].idLabel = oLbl.id;

									if (oIntervals[i].timeSla === oLDate) {
										oLbl.innerHTML = sReturn;
										if (sReturn.slice(0, 1) === "-") {
											oLbl.style.color = "red";
										} else {
											oLbl.style.color = "";
										}
									} else {
										//clearInterval(oIntervals[i].interval);
									}

								}
							}

						} else {
							//oT.getView().refresh();
						}
					}, 1000);
				};

				var a = x(t, countDownDate);
				var oInterval = {
					key: oKey,
					interval: a,
					timeSla: countDownDate,
					idLabel: ""

				};
				if (aInterval) {

					for (var i = 0; i < aInterval.length; i++) {
						if (aInterval[i].key === oKey) {
							clearInterval(aInterval[i].interval);
							aInterval[i].interval = oInterval.interval;
							aInterval[i].timeSla = oInterval.timeSla;
						}
					}
					aInterval.push(oInterval);

				} else {
					aInterval = [];
					aInterval.push(oInterval);
					sap.ui.getCore().setModel(aInterval, "aInterval");
				}

			}

			return oKey;
		},
		showStatusFollowup: function(isLocked, isClose) {

			if (isClose !== false && isClose !== "" && isClose !== undefined) {
				return "sap-icon://accept"; //folowup finalizado
			} else if (isLocked !== false && isLocked !== "" && isLocked !== undefined) {
				return "sap-icon://folder-full"; //incidende bloqueado
			} else {
				return "sap-icon://open-folder"; //incidente livre
			}
		},
		showStatusTextFollowup: function(oUsr, isClose) {

			try {

				var resourceBundle = this.getView().getModel("i18n").getResourceBundle();

				if (isClose !== false && isClose !== "" && isClose !== undefined) {
					return resourceBundle.getText("INCIDENT_FINISH_MSG"); //folowup ja realizado
				} else if (oUsr !== "" && oUsr !== undefined) {
					return resourceBundle.getText("USER_LOCK", [oUsr]); //Incidente bloqueado
				} else {
					return "";
				}

			} catch (error) {
				return "";
			}
		}

	};
	return Formatter;
}, /* bExport */ true);