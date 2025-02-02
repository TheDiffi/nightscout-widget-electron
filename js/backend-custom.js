"use strict";

/**
 * @typedef {Object} GlucoseDataItem
 * @property {number} sgv - The sgv value. sgv = sensor glucose value.
 * @property {number} date - The date in milliseconds.
 * @property {string} [direction] - The direction of the data (optional).
 */

/**
 * @typedef {Object} GlucoseDataResponse
 * @property {GlucoseDataItem[]} result - An array of data items.
 */

/**
 * @typedef {Object} GlucoseMeasurement
 * @property {number} Value - The glucose value.
 * @property {string} Timestamp - The timestamp of the reading.
 * @property {number} ValueInMgPerDl - The glucose value in mg/dL.
 * @property {boolean} isHigh - Indicates if the value is high.
 * @property {boolean} isLow - Indicates if the value is low.
 */

/**
 * @callback onSuccess
 * @param {GlucoseDataResponse} data - The data returned from the API call.
 */

/**
 * @callback onError
 * @param {string} error - The error message.
 */

const CONFIG = await window.electronAPI.getSettings();

const REQUEST_TIMEOUT = 10000;
const log = window.electronAPI.logger;

const StatusCode = {
  OK: 200,
  NOT_FOUND: 404,
};

class MeasurementsHistory {
  constructor() {
    this.measurementsHistory = [];
  }

  updateHistory(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided");
    }

    if (!this.measurementsHistory.length) {
      this._populateHistory(data);
      return;
    }

    // Add the new measurement at the start only if the date is newer
    if (data.date !== this.measurementsHistory[0].date) {
      this.measurementsHistory.unshift({ ...data });
    }

    // Remove the oldest measurement (9last element if the history is longer than 10
    if (this.measurementsHistory.length > 10) {
      this.measurementsHistory.pop();
    }

    // this.measurementsHistory.sort((a, b) => b.date - a.date);
  }

  _populateHistory(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided");
    }

    this.measurementsHistory = new Array(10).fill({ ...data }, 0, 9);
  }

  /**
   * Transforms the API response to a glucose object.
   * @param {GlucoseDataItem[]} data - The data returned from the API call.
   * @returns {GlucoseDataResponse} The transformed glucose object.
   *
   **/
  populateWithGraphData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided");
    }
    //only the first 10 items are needed
    this.measurementsHistory = data.sort((a, b) => b.date - a.date).slice(0, 9);
  }

  getHistory() {
    return [...this.measurementsHistory];
  }
}

const measurementsHistory = new MeasurementsHistory();

class LegendaryApiResponse {
  constructor(type, data) {
    this.type = type;
    this.data = data;
    this.cleanedData = this._cleanData();
  }

  _cleanData() {
    if (this.type === "graph") {
      return this.data
        .map(this.transformCurrentToGlucoseItem)
        .sort((a, b) => b.date - a.date);
    } else if (this.type === "current") {
      return this.transformCurrentToGlucoseItem(this.data);
    }
  }

  /**
   * Transforms the current data to a glucose item.
   * @param {GlucoseMeasurement} data - The data returned from the API call.
   * @returns {GlucoseDataItem} The transformed glucose item.
   **/
  transformCurrentToGlucoseItem = (data) => {
    return {
      sgv: data.Value,
      date: new Date(data.Timestamp).getTime(),
      direction: "",
    };
  };

  getCleandData() {
    return this.cleanedData;
  }
}

/**
 * Creates an XMLHttpRequest.
 * @param {string} method - The HTTP method.
 * @param {string|URL} url - The URL for the request.
 * @param {onSuccess} onLoad - The callback to handle successful response.
 * @param {onError} onError - The callback to handle errors.
 * @returns {XMLHttpRequest} The created XMLHttpRequest.
 */
const createRequest = (method, url, onLoad, onError) => {
  const xhr = new XMLHttpRequest();
  xhr.responseType = `json`;

  xhr.addEventListener(`load`, () => {
    let xhrStatusText = ``;

    switch (xhr.status) {
      case StatusCode.OK:
        onLoad(xhr.response);
        break;
      case StatusCode.NOT_FOUND:
        xhrStatusText = `The requested resource was not found on the server`;
        onError(`Request status: ${xhr.status} - ${xhrStatusText}`);
        break;
      default:
        if (xhr.response) {
          xhrStatusText =
            xhr.statusText === ``
              ? xhr.response.message
              : `${xhr.statusText}: ${xhr.response.message}`;
        } else {
          xhrStatusText = xhr.statusText;
        }
        onError(`Request status: ${xhr.status} - ${xhrStatusText}`);
    }
  });

  xhr.addEventListener(`error`, () => {
    let errorMessage = `An unknown error occurred.`;
    if (!navigator.onLine) {
      errorMessage = `You are currently offline. Please check your network connection.`;
    } else if (xhr.status === 0) {
      errorMessage = `The server is not responding. Check your nightscout site address.`;
    } else if (xhr.status >= 400 && xhr.status < 500) {
      errorMessage = `The request could not be completed because the server returned an error.`;
    } else if (xhr.status >= 500 && xhr.status < 600) {
      errorMessage = `The server encountered an error and could not complete the request.`;
    }
    onError(errorMessage);
  });

  xhr.addEventListener(`timeout`, () => {
    onError(`Request timeout reached: ${xhr.timeout} ms.`);
  });

  xhr.timeout = REQUEST_TIMEOUT;
  xhr.open(method, url, true);

  return xhr;
};

/**
 * Fetches data from the API.
 * @param {onSuccess} onSuccess - The callback to handle successful API response.
 * @param {onError} onError - The callback to handle errors.
 */
const getData = (onSuccess, onError) => {
  log.info(`Backend Custom Script Loaded`);
  log.info(CONFIG);
  if (!measurementsHistory.getHistory().length) {
    log.info(`No history found. Fetching data from the API.`);
    fillingHistoryWithGraphData(onSuccess, onError);
    return;
  }

  log.info(`Getting Data...`);
  const xhr = createRequest(
    `GET`,
    CONFIG.CUSTOM_URL_ONE,
    (response) => {
      const responseObj = new LegendaryApiResponse("current", response);
      measurementsHistory.updateHistory(responseObj.getCleandData());
      onSuccess({ result: measurementsHistory.getHistory() });
    },
    onError
  );

  xhr.send();
};

/**
 * Fetches data from the API.
 * @param {onSuccess} onSuccess - The callback to handle successful API response.
 * @param {onError} onError - The callback to handle errors.
 */
const fillingHistoryWithGraphData = (onSuccess, onError) => {
  const xhr = createRequest(
    `GET`,
    CONFIG.CUSTOM_URL_TWO,
    (response) => {
      const responseObj = new LegendaryApiResponse("graph", response);
      measurementsHistory.populateWithGraphData(responseObj.getCleandData());
      getData(onSuccess, onError);
      return;
    },
    onError
  );

  xhr.send();
};

/**
 * Fetches the status from the API.
 * @param {Params} testParams - The parameters for the request.
 * @param {onSuccess} onSuccess - The callback to handle successful API response.
 * @param {onError} onError - The callback to handle errors.
 */
const getStatus = (testParams, onSuccess, onError) => {
  const xhr = createRequest(`GET`, CONFIG.CUSTOM_URL_ONE, onSuccess, onError);

  xhr.send();
};

export { getData, getStatus };
