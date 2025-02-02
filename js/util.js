"use strict";

/**
 * @typedef {Object} DataItem
 * @property {number} sgv - The sgv value. sgv = sensor glucose value.
 * @property {number} date - The date in milliseconds.
 * @property {string} [direction] - The direction of the data (optional).
 */

/**
 * @typedef {Object} DataObject
 * @property {DataItem[]} result - An array of data items.
 */

const dir2Char = {
  NONE: `⇼`,
  TripleUp: `⤊`,
  DoubleUp: `⇈`,
  SingleUp: `↑`,
  FortyFiveUp: `↗`,
  Flat: `→`,
  FortyFiveDown: `↘`,
  SingleDown: `↓`,
  DoubleDown: `⇊`,
  TripleDown: `⤋`,
  "NOT COMPUTABLE": `-`,
  "RATE OUT OF RANGE": `⇕`
};

const MMOL_TO_MGDL_RATE = 18;
const TIME_TO_MINUTES = 1000 * 60;

const customAssign = (targetObject, patchObject) => {

  if (patchObject === null) {
    patchObject = ``;
  }

  for (const key of Object.keys(patchObject)) {
    if (key in targetObject) {
      if (typeof patchObject[key] != `object`) {
        if (targetObject[key].type === `checkbox`) {
          targetObject[key].checked = patchObject[key];
        } else {
          targetObject[key].value = patchObject[key];
        }
      } else {
        customAssign(targetObject[key], patchObject[key]);
      }
    }
  }
  return targetObject;
};

const mgdlToMMOL = (mgdl) => {
  return (mgdl / MMOL_TO_MGDL_RATE).toFixed(1);
};

const mmolToMGDL = (mmol) => {
  return (mmol * MMOL_TO_MGDL_RATE).toFixed();
};

const convertUnitsFor = (obj, toMMOL) => {
  for (const key in obj) {
    if (typeof(obj[key]) === `object` && !Array.isArray(obj[key])) {
      convertUnitsFor(obj[key], toMMOL);
    } else if (typeof(obj[key]) === `number`) {
      if (toMMOL) {
        obj[key] = parseFloat(mgdlToMMOL(obj[key]));
      } else {
        obj[key] = parseFloat(mmolToMGDL(obj[key]));
      }
    }
  }
};

const charToEntity = (char) => {
  if (char === undefined) {
    return ``;
  }

  return char && char.length && `&#` + char.charCodeAt(0) + `;`;
};

const directionToChar = (direction) => {
  return dir2Char[direction] || `-`;
};

const calcTrend = (data) => {

  const MIN_DATA_CALC_LENGTH = 6;
  const SENSOR_READ_INTERVAL_IN_MIN = 5;

  if (!Array.isArray(data) ||
      data.length < MIN_DATA_CALC_LENGTH ||
      !data.every(isFinite)) {
    return `NOT COMPUTABLE`;
  }

  const thresholds = {
    Double: {MIN: 4, HALF: 90},
    Single: {MIN: 2, HALF: 60},
    FortyFive: {MIN: 1, HALF: 30},
  };

  const changes = [];
  for (let i = 0; i < MIN_DATA_CALC_LENGTH - 1; i++) {
    changes.push(data[i] - data[i + 1]);
  }

  const lastMinuteChange = changes[0] / SENSOR_READ_INTERVAL_IN_MIN;
  const totalChangePerHalf = changes.reduce((sum, change) => sum + change, 0);

  for (const trend in thresholds) {
    if (
      lastMinuteChange > thresholds[trend].MIN ||
      totalChangePerHalf > thresholds[trend].HALF
    ) {
      return `${trend}Up`;
    } else if (
      lastMinuteChange < -thresholds[trend].MIN ||
      totalChangePerHalf < -thresholds[trend].HALF
    ) {
      return `${trend}Down`;
    }
  }

  return `Flat`;
};

/**
 * Calculates the SVG delta.
 * @param {DataObject} dataObj - The data object containing the results.
 * @returns {number} The calculated SVG delta.
 */

const calculateSgvRateOfChange = (dataObj) => {
  const latestReading = dataObj.result[0];

  //find the previous value that is closest to 5 minutes before the last value
  const fiveMinutesBeforeLatest = latestReading.date - TIME_TO_MINUTES * 5;
  const distanceMap = dataObj.result.map((obj) =>
    Math.abs(obj.date - fiveMinutesBeforeLatest)
  );
  let closestReadingIndex = distanceMap.indexOf(Math.min(...distanceMap));

  // If the closest reading is the same as the latest reading, increment the index
  if (latestReading.date - dataObj.result[closestReadingIndex].date <= 0) {
    closestReadingIndex++;
  }

  const closestReading = dataObj.result[closestReadingIndex];
  const deltaTimeMs =
    latestReading.date - dataObj.result[closestReadingIndex].date;

  // Guard against division by zero
  if (deltaTimeMs === 0) {
    return 0;
  }

  let readingDelta = latestReading.sgv - closestReading.sgv;
  // Normalize to 5 minutes
  readingDelta = readingDelta / (deltaTimeMs / (TIME_TO_MINUTES * 5));
  // Round to 2 decimal place
  readingDelta = Math.round(readingDelta * 100) / 100;
  return readingDelta;
};

/**
 * @typedef {Object} RenderableData
 * @property {number | string} last - The last glucose value.
 * @property {number} prev - The previous glucose value.
 * @property {number} deltaTime - The time difference between the last and previous values.
 * @property {number} age - The age of the last value.
 * @property {string} delta - The svg delta value over 5 minutes.
 * @property {string} direction - The direction of the data.
 */

/**
 * Prepares the data for display.
 * @param {DataObject} dataObj - The data object containing the results.
 * @param {Object} paramsObj - The parameters object.
 * @param {boolean} paramsObj.units_in_mmol - Whether to convert units to mmol.
 * @param {boolean} paramsObj.calc_trend - Whether to calculate the trend.
 * @returns {RenderableData} The prepared data.
 */
const prepareData = (dataObj, paramsObj) => {
  const result = {};

  result.last = dataObj.result[0].sgv;
  result.prev = dataObj.result[1].sgv;
  let deltaSgv = calculateSgvRateOfChange(dataObj);
  result.deltaTime = dataObj.result[0].date - dataObj.result[1].date;

  const currentTime = new Date();
  result.age = Math.floor(
    (currentTime.getTime() - dataObj.result[0].date) / TIME_TO_MINUTES
  );

  if (paramsObj.units_in_mmol) {
    deltaSgv = mgdlToMMOL(deltaSgv);
  }

  if (deltaSgv > 0) {
    result.delta = `+${deltaSgv}`;
  } else if (deltaSgv == 0) {
    result.delta = `+${paramsObj.units_in_mmol ? `0.0` : `0`}`;
  } else {
    result.delta = deltaSgv.toString();
  }

  if (paramsObj.units_in_mmol) {
    result.last = mgdlToMMOL(result.last);
  }

  if (paramsObj.calc_trend) {
    result.direction = charToEntity(
      directionToChar(calcTrend(dataObj.result.map((obj) => obj.sgv)))
    );
  } else {
    result.direction = charToEntity(
      directionToChar(dataObj.result[0].direction)
    );
  }

  return result;
};

const alert = (type, title, msg, sync = false) => {
  const dialog = window.electronAPI.dialog;

  const data = {
    type: type,
    title: title,
    message: msg.toString(),
    buttons: [`OK`],
    defaultId: 0,
    icon: `asset/icons/png/128x128.png`
  };

  if (sync) {
    return dialog.showMessageBoxSync(data);
  } else {
    return dialog.showMessageBox(data);
  }
};

const formDataToObject = (formData) => {
  return Object.fromEntries([...formData.entries()]);
};

export {
  dir2Char,
  mgdlToMMOL,
  mmolToMGDL,
  convertUnitsFor,
  charToEntity,
  directionToChar,
  prepareData,
  customAssign,
  alert,
  calcTrend,
  formDataToObject
};
