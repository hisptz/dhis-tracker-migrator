// Before using the script pre install node environments to machine
// then inside the folder that holds this script init npm & install request module
// --> npm init --yes
// --> npm install request --save
// --> npm install async --save
// Thats it for installation, finally run 
// --> node data-export.js

const https = require('https');
const request = require("request");
const async = require('async');

const username = "username";
const password = "password";
const basicAuth = "https://" + username + ":" + password + "@";
const instanceUrl = "etl.moh.go.tz/tracker/api/";
const tBinstanceLink = basicAuth + instanceUrl;
const orgunitLevel = 5;
const selectedYears = [2019, 2018, 2017];

const program = {name: '', id: ''};
const programIndicatorGroup = {name: '', id: ''};
const dataElementGroup = {name: '', id: ''};

const orgunitLevelUrl = tBinstanceLink + "organisationUnits.json?paging=false&fields=id,name,level&filter=level:eq:" + orgunitLevel;
const programInfoUrl = tBinstanceLink + "programs/"+ program.id +".json?fields=id,name,programIndicators";
const programIndicatorGroupUrl = tBinstanceLink + "programIndicatorGroups/"+ programIndicatorGroup.id +".json?fields=id,name,programIndicators[id,name]";
const dataElementGroupUrl = tBinstanceLink + "dataElementGroups/"+ dataElementGroup +".json?fields=id,name,dataElements[id,name]";
const datavalueImportUrl = tBinstanceLink + "dataValueSets.json";
const runAnalyticsUrl = tBinstanceLink + "resourceTables/analytics";
const runMaintenanceUrl = tBinstanceLink + "maintenance";

var dataElements = [];
var programIndicators = [];
var orgunits = [];
var analyticsParams = [];
var programInfo = {};

console.log('Fetching Organisation Units Level ' + orgunitLevelUrl.slice(-1) + ' from server...');
https.get((orgunitLevelUrl), (resp) => {
  let data = '';
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });
  // The whole response has been received. Now we can process results
  resp.on('end', () => {
    console.log('Processing data results...');
    var responseData = JSON.parse(data);
    orgunits = responseData.organisationUnits ? responseData.organisationUnits : [];
        // Now fetch program info from group
        fetchProgramInfo();
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});

function fetchProgramInfo() {
  console.log('Fetching Program info...');
https.get((programInfoUrl), (resp) => {
  let data = '';
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });
  // The whole response has been received. Now we can process results
  resp.on('end', () => {
    console.log('Processing data results...');
    var responseData = JSON.parse(data);
    programInfo = responseData ? responseData : [];
        // Now fetch programIndicator from group
      fetchProgramIndicators();
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
}

function fetchProgramIndicators() {
  console.log('Fetching program indicators from server...');
https.get((programIndicatorGroupUrl), (resp) => {
  let data = '';
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });
  // The whole response has been received. Now we can process results
  resp.on('end', () => {
    console.log('Processing data results...');
    var responseData = JSON.parse(data);
    programIndicators = responseData.programIndicators ? responseData.programIndicators : [];
        // Now fetch dataElements from group
    fetchDataElements();
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
}

function fetchDataElements() {
console.log('Fetching dataElements to be mapped with program indicators from server...');
https.get((dataElementGroupUrl), (resp) => {
  let data = '';
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });
  // The whole response has been received. Now we can process results
  resp.on('end', () => {
    console.log('Processing data results...');
    var responseData = JSON.parse(data);
    dataElements = responseData.dataElements ? responseData.dataElements : [];
      // Process Analytics Params
    processAnalyticsParams();
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
}

function processAnalyticsParams() {
  (orgunits || []).forEach(ou => {
    (programIndicators || []).forEach(de => {
      selectedYears.forEach(pe => {
        analyticsParams.push({
          ou: ou.id ? ou.id : '',
          progIndicator: de.id,
          pe: getYearMonths(pe)
        })
      });
      
    });
  });
  fetchAnalyticsData();
}


const fetchAnalyticsData = async () => {
  const analyticsUrl = (analyticsParams || []).map(param => {
    return tBinstanceLink + "analytics/dataValueSet.json?dimension=dx:" + param.progIndicator + ""+
    "&dimension=pe:" + param.pe + "&dimension=ou:" + param.ou + ";LEVEL-5&displayProperty=NAME";
  });

  var importedData;
  importedData = await new Promise((resolve, reject) => {
    async.mapLimit(
      analyticsUrl,
      20,
      async.reflect(importData),
      (err, result) => {
        resolve(result);
      }
    );
  });

  return new Promise((resolve, reject) => {
    console.log('Finished importing data.');
    console.log('*********** THE END (1/2) ************');
    executeAnalytics();
    resolve(importedData);
  });
}

function progIndicatorDataElementConverter(analytics) {
    (analytics.dataValues || []).forEach(dataValue => {
        var filteredProgIndicator = programIndicators.filter(progInd => progInd.id === dataValue.dataElement);
        var actualProgIndicator = filteredProgIndicator[0] ? filteredProgIndicator[0] : {};
        var filteredDataElement = dataElements.filter(de => de.name === actualProgIndicator.name);
        var actualDataElement = filteredDataElement[0] ? filteredDataElement[0] : {};
            if (dataValue.dataElement === actualProgIndicator.id && actualDataElement.name === actualProgIndicator.name) {
                dataValue.dataElement = actualDataElement.id;
                delete dataValue.storedBy;
                delete dataValue.created;
                delete dataValue.lastUpdated;
                delete dataValue.comment;
            }
    });
  return analytics;
}

const getAnalyticsData = etlAnalyticsUrl => {
  return new Promise((resolve, reject) => {
    request(
      {
        url: etlAnalyticsUrl,
        method: 'GET'
      },
      (err, res) => {
        if (!err && res.statusCode == 200) {
          const responseBody = JSON.parse(res.body);
            console.log('Analytics status OK. ' + res.statusCode);
            resolve(responseBody ? responseBody : {});
        } else {
          // console.log('Analytics status is empty. ERROR ' + res.statusCode);
          reject(err);
        }
      }
    );
  });
};


const importData = async (etlAnalyticsUrl, callback) => {
  try {
    const anaLyticsDataValues = await getAnalyticsData(etlAnalyticsUrl);
    const dataValues = progIndicatorDataElementConverter(anaLyticsDataValues);
    if (dataValues.dataValues.length > 0) {
      try {
        const importResult = await dataValueImport(dataValues);
        console.log(importResult);
        // callback(null, importResult);
      } catch (error) {
        console.log('Data import not successful.');
        callback(error, null)
      }
      
    } else {
      callback(null, dataValues);
    }
  } catch (e) {
    callback(e, null);
  }
};

const dataValueImport = dataValues => {
  return new Promise((resolve, reject) => {
    request(
      {
        url: datavalueImportUrl,
        method: 'POST',
        json: true,
        body: dataValues
      },
      function(err, res, body) {
        
        if (!err) {
          try {
            const responseBody = Object.keys(body) ? body : JSON.parse(body);

            const result = responseBody
              ? {
                  imported: responseBody.importCount
                    ? (responseBody.importCount.updated || 0) +
                      (responseBody.importCount.imported || 0)
                    : 0,
                  ignored: responseBody.importCount
                    ? responseBody.importCount.ignored || 0
                    : 0
                }
              : null;
            resolve(result);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(err);
        }
      }
    );
  });
};


const executeAnalytics = async () => {
  console.log('Triggering Analytics run-time for ETL');
  const analyticsParams = [1];

  var analyticsRun;
  analyticsRun = await new Promise((resolve, reject) => {
    async.mapLimit(
      analyticsParams,
      1,
      async.reflect(updateAnalytics),
      (err, result) => {
        resolve(result);
      }
    );
  });

  return new Promise((resolve, reject) => {
    console.log('Finished Running Analytics.');
    console.log('*********** THE END (2/2) ************');
    resolve(analyticsRun);
  });
}

const updateAnalytics = async (param, callback) => {
  try {
    const runnedAnalytic = await runAnalytics();
    const runnedMaintenance = await runMaintenance();
  } catch (e) {
    callback(e, null);
  }
};

const runAnalytics = () => {
  console.log('Running Analytics...');
  // var dataString = 'lastYears=1';
  var dataString = '';
  return new Promise((resolve, reject) => {
    request(
      {
        url: runAnalyticsUrl,
        method: 'PUT',
        body: dataString,
      },
      (err, res) => {
        if (!err && res.statusCode == 200) {
          const responseBody = JSON.parse(res.body);
            console.log('Running Analytics status OK. ' + res.statusCode);
            resolve(responseBody ? responseBody : {});
        } else {
          // console.log('Analytics status is empty. ERROR ' + res.statusCode);
          reject(err);
        }
      }
    );
  });
};

const runMaintenance = () => {
  console.log('Running Maintenance...');
  var dataString = 'analyticsTableClear=false&zeroDataValueRemoval=false&softDeletedDataValueRemoval=false&' +
  'periodPruning=false&expiredInvitationsClear=false&sqlViewsDrop=false&sqlViewsCreate=false&categoryOptionComboUpdate=false&' +
  'ouPathsUpdate=false&cacheClear=true&appReload=false';
  var headers = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest'
  };
  return new Promise((resolve, reject) => {
    request(
      {
        url: runMaintenanceUrl,
        method: 'PUT',
        headers: headers,
        body: dataString,
      },
      (err, res) => {
        if (!err && res.statusCode == 200) {
          const responseBody = JSON.parse(res.body);
            console.log('Running Maintenance status OK. ' + res.statusCode);
            resolve(responseBody ? responseBody : {});
        } else {
          // console.log('Analytics status is empty. ERROR ' + res.statusCode);
          reject(err);
        }
      }
    );
  });
};


//      HELPER FUNCTIONS
function getYearMonths(year) {
    var monthCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var analyticsPeriodString = monthCodes.map(function (month) {
        return year + month;
    }).join(";");
    return analyticsPeriodString;
}

function sanitizeIndicators(indicators) {
  var analyticsDeString = indicators.map(function (indicator) {
      return indicator;
  }).join(";");
  return analyticsDeString;
}
