/**
 * @jest-environment jsdom
 */
"use strict";

import {
  dir2Char,
  mgdlToMMOL,
  mmolToMGDL,
  convertUnitsFor,
  charToEntity,
  directionToChar,
  prepareData,
  customAssign,
  calcTrend,
  alert,
  formDataToObject
} from "../js/util";

describe(`alert`, () => {
  const mockShowMessageBox = jest.fn();
  const mockShowMessageBoxSync = jest.fn();

  beforeEach(() => {
    global.electronAPI = { // eslint-disable-line
      dialog: {
        showMessageBox: mockShowMessageBox,
        showMessageBoxSync: mockShowMessageBoxSync,
      },
    };
  });

  afterEach(() => {
    mockShowMessageBox.mockClear();
    mockShowMessageBoxSync.mockClear();

    delete global.electronAPI; // eslint-disable-line
  });

  it(`should call showMessageBox for asynchronous alert`, async () => {
    await alert(`info`, `Title`, `Message`, false);

    expect(mockShowMessageBox).toHaveBeenCalledWith({
      type: `info`,
      icon: `asset/icons/png/128x128.png`,
      title: `Title`,
      message: `Message`,
      buttons: [`OK`],
      defaultId: 0,
    });

    expect(mockShowMessageBoxSync).not.toHaveBeenCalled();
    expect(mockShowMessageBox).toHaveBeenCalled();
  });

  it(`should call showMessageBoxSync for synchronous alert`, () => {
    alert(`error`, `Error Title`, `Error Message`, true);

    expect(mockShowMessageBoxSync).toHaveBeenCalledWith({
      type: `error`,
      icon: `asset/icons/png/128x128.png`,
      title: `Error Title`,
      message: `Error Message`,
      buttons: [`OK`],
      defaultId: 0,
    });

    expect(mockShowMessageBoxSync).toHaveBeenCalled();
    expect(mockShowMessageBox).not.toHaveBeenCalled();
  });

  it(`should call showMessageBox for asynchronous alert by default`, async () => {
    await alert(`info`, `Title`, `Message`);

    expect(mockShowMessageBox).toHaveBeenCalledWith({
      type: `info`,
      icon: `asset/icons/png/128x128.png`,
      title: `Title`,
      message: `Message`,
      buttons: [`OK`],
      defaultId: 0,
    });

    expect(mockShowMessageBoxSync).not.toHaveBeenCalled();
    expect(mockShowMessageBox).toHaveBeenCalled();
  });
});

describe(`mmolToMGDL`, () => {
  const values = [
    { mmol: 10.0, mgdl: 180 },
    { mmol: 8.5, mgdl: 153 },
    { mmol: 5.0, mgdl: 90 },
    { mmol: 4.5, mgdl: 81 },
    { mmol: 3.5, mgdl: 63 }
  ];

  for (const value of values) {
    describe(`converting mmol to mgdl values`, () => {
      it(`should correctly convert positive ${value.mmol} mmol to ${value.mgdl} mgdl`, () => {
        const result = mmolToMGDL(value.mmol);
        expect(result).toEqual(value.mgdl.toFixed());
      });

      it(`should correctly convert negative -${value.mmol} mmol to -${value.mgdl} mgdl`, () => {
        const result = mmolToMGDL(-value.mmol);
        expect(result).toEqual(`-${value.mgdl.toFixed()}`);
      });
    });
  }

  it(`should handle zero input`, () => {
    const result = mmolToMGDL(`0.0`);
    expect(result).toEqual(`0`);
  });
});

describe(`mgdlToMMOL`, () => {
  const values = [
    { mgdl: 180, mmol: 10.0 },
    { mgdl: 153, mmol: 8.5 },
    { mgdl: 90, mmol: 5.0 },
    { mgdl: 81, mmol: 4.5 },
    { mgdl: 63, mmol: 3.5 }
  ];

  for (const value of values) {
    describe(`converting mgdl to mmol values`, () => {
      it(`should correctly convert positive ${value.mgdl} mgdl to ${value.mmol} mmol`, () => {
        const result = mgdlToMMOL(value.mgdl);
        expect(result).toEqual(value.mmol.toFixed(1));
      });

      it(`should correctly convert negative -${value.mgdl} mgdl to -${value.mmol} mmol`, () => {
        const result = mgdlToMMOL(-value.mgdl);
        expect(result).toEqual(`-${value.mmol.toFixed(1)}`);
      });
    });
  }

  it(`should handle zero input`, () => {
    const result = mgdlToMMOL(0);
    expect(result).toEqual(`0.0`);
  });
});

describe(`convertUnitsFor`, () => {
  let ConfigInMMOL = null;
  let ConfigInMGDL = null;

  beforeEach(() => {
    ConfigInMMOL = {
      BG: {
        HIGH: 10,
        LOW: 3.5,
        TARGET: {
          TOP: 8.5,
          BOTTOM: 4.5
        }
      }
    };

    ConfigInMGDL = {
      BG: {
        HIGH: 180,
        LOW: 63,
        TARGET: {
          TOP: 153,
          BOTTOM: 81
        }
      }
    };
  });

  it(`should correctly convert mgdl config to mmol config`, () => {
    const isMMOL = true;
    convertUnitsFor(ConfigInMGDL.BG, isMMOL);
    expect(ConfigInMGDL.BG).toMatchObject(ConfigInMMOL.BG);
  });

  it(`should correctly convert mmol config to mgdl config`, () => {
    const isMMOL = false;
    convertUnitsFor(ConfigInMMOL.BG, isMMOL);
    expect(ConfigInMMOL.BG).toMatchObject(ConfigInMGDL.BG);
  });

  it(`should handle zero input with isMMOL = true`, () => {
    const isMMOL = true;
    convertUnitsFor({}, isMMOL);
    expect({}).toEqual({});
  });

  it(`should handle zero input with isMMOL = true`, () => {
    const isMMOL = false;
    convertUnitsFor({}, isMMOL);
    expect({}).toEqual({});
  });

  it(`should not modify non-numeric values`, () => {
    const isMMOL = false;
    const inputObject = {
      TEXT: `some text`,
      BOOLEAN: true,
      ARRAY: [1, 2, 3],
      OBJECT: { key: `value` }
    };

    convertUnitsFor(inputObject, isMMOL);

    expect(inputObject.TEXT).toBe(`some text`);
    expect(inputObject.BOOLEAN).toBe(true);
    expect(inputObject.ARRAY).toEqual([1, 2, 3]);
    expect(inputObject.OBJECT).toEqual({ key: `value` });
  });
});

describe(`charToEntity`, () => {
  it(`should convert character to HTML entity`, () => {
    const result = charToEntity(`A`);
    expect(result).toEqual(`&#65;`);
  });

  it(`should handle empty string input`, () => {
    const result = charToEntity(``);
    expect(result).toEqual(``);
  });

  it(`should handle undefined input`, () => {
    const result = charToEntity(undefined);
    expect(result).toEqual(``);
  });
});

describe(`directionToChar`, () => {
  for (const direction in dir2Char) {
    it(`should map ${direction} to ${dir2Char[direction]}`, () => {
      const result = directionToChar(direction);
      expect(result).toEqual(dir2Char[direction]);
    });
  }

  it(`should handle undefined input as -`, () => {
    const result = directionToChar(undefined);
    expect(result).toEqual(`-`);
  });
});

describe(`calcTrend`, () => {
  const dataSet = {
    DoubleUp: {
      MIN: [170, 140, 130, 120, 110, 80],
      HALF: [180, 160, 140, 130, 110, 80]
    },
    SingleUp: {
      MIN: [155, 140, 130, 120, 110, 95],
      HALF: [160, 150, 135, 120, 105, 90]
    },
    FortyFiveUp: {
      MIN: [155, 149, 150, 150, 150, 144],
      HALF: [130, 124, 118, 112, 96, 90]
    },
    Flat: [105, 100, 95, 100, 105, 100],
    Invalid: {
      LENGTH: [100, 110, 120, 130, 140],
      VALUES: [100, 110, `test`, 120, 130, 120],
      UNDEF: [100, 110, undefined, 100, 100, 100],
      NOT_ARR: `test`
    }
  };

  describe(`calcTrend data-driven unit-tests`, () => {
    const trendData = [
      {
        trend: `DoubleUp`,
        min: dataSet.DoubleUp.MIN.slice(),
        half: dataSet.DoubleUp.HALF.slice()
      },
      {
        trend: `SingleUp`,
        min: dataSet.SingleUp.MIN.slice(),
        half: dataSet.SingleUp.HALF.slice()
      },
      {
        trend: `FortyFiveUp`,
        min: dataSet.FortyFiveUp.MIN.slice(),
        half: dataSet.FortyFiveUp.HALF.slice()
      },
      {
        trend: `FortyFiveDown`,
        min: dataSet.FortyFiveUp.MIN.reverse(),
        half: dataSet.FortyFiveUp.HALF.reverse()
      },
      {
        trend: `SingleDown`,
        min: dataSet.SingleUp.MIN.reverse(),
        half: dataSet.SingleUp.HALF.reverse()
      },
      {
        trend: `DoubleDown`,
        min: dataSet.DoubleUp.MIN.reverse(),
        half: dataSet.DoubleUp.HALF.reverse()
      },
    ];

    for (const data of trendData) {
      describe(`identifying ${data.trend} trend`, () => {
        it(`should correctly identify last minute rise`, () => {
          const result = calcTrend(data.min);
          expect(result).toBe(data.trend);
        });

        it(`should correctly identify half an hour rise`, () => {
          const result = calcTrend(data.half);
          expect(result).toBe(data.trend);
        });
      });
    }

    describe(`identifying Flat trend`, () => {
      it(`should correctly identify flat trend`, () => {
        const data = dataSet.Flat;
        expect(calcTrend(data)).toBe(`Flat`);
      });
    });
  });

  describe(`calcTrend invalid data`, () => {
    const invalidData = {
      smallArray: dataSet.Invalid.LENGTH,
      notAnArray: dataSet.Invalid.NOT_ARR,
      hasUndefValues: dataSet.Invalid.UNDEF,
      hasWrongTypeValues: dataSet.Invalid.VALUES,
    };

    for (const exception in invalidData) {
      it(`should handle ${exception} as invalid data`, () => {
        const data = invalidData[exception];
        const result = calcTrend(data);
        expect(result).toBe(`NOT COMPUTABLE`);
      });
    }
  });
});

describe(`customAssign`, () => {
  it(`should assign values from patchObject to targetObject`, () => {
    const targetObject = {
      input1: { type: `text`, value: `` },
      checkbox1: { type: `checkbox`, checked: false },
    };

    const patchObject = {
      input1: `newValue`,
      checkbox1: true,
    };

    customAssign(targetObject, patchObject);

    expect(targetObject.input1.value).toBe(`newValue`);
    expect(targetObject.checkbox1.checked).toBe(true);
  });

  it(`should handle nested objects`, () => {
    const targetObject = {
      nested: {
        input2: { type: `text`, value: `` },
      },
    };

    const patchObject = {
      nested: {
        input2: `nestedValue`,
      },
    };

    customAssign(targetObject, patchObject);

    expect(targetObject.nested.input2.value).toBe(`nestedValue`);
  });

  it(`should handle null patchObject`, () => {
    const targetObject = {
      input3: { type: `text`, value: `` },
    };

    const patchObject = null;

    customAssign(targetObject, patchObject);

    expect(targetObject.input3.value).toBe(``);
  });

  it(`should not modify targetObject for keys not present in patchObject`, () => {
    const targetObject = {
      input4: { type: `text`, value: `` },
    };

    const patchObject = {
      input5: `newValue`,
    };

    const initObject = JSON.parse(JSON.stringify(targetObject));

    customAssign(targetObject, patchObject);

    expect(targetObject).toMatchObject(initObject);
    expect(targetObject.input5).toBeUndefined();
  });

  it(`should handle targetObject with no nested objects`, () => {
    const targetObject = {
      input6: { type: `text`, value: `` },
      checkbox2: { type: `checkbox`, checked: false },
    };

    const patchObject = {
      input6: `newValue`,
      checkbox2: true,
    };

    customAssign(targetObject, patchObject);

    expect(targetObject.input6.value).toBe(`newValue`);
    expect(targetObject.checkbox2.checked).toBe(true);
  });

});

describe(`prepareData`, () => {
  const dataObj = {
    result: [
      { sgv: 90, date: new Date().getTime() - 3 * 60 * 1000 , direction: `FortyFiveUp`},
      { sgv: 80, date: new Date().getTime() - 8 * 60 * 1000 , direction: `Flat`},
      { sgv: 80, date: new Date().getTime() - 12 * 60 * 1000 , direction: `Flat`},
      { sgv: 80, date: new Date().getTime() - 17 * 60 * 1000 , direction: `Flat`},
      { sgv: 80, date: new Date().getTime() - 22 * 60 * 1000 , direction: `Flat`},
      { sgv: 80, date: new Date().getTime() - 27 * 60 * 1000 , direction: `Flat`},
    ],
  };

  const paramsObj = {
    units_in_mmol: false,
    calc_trend: false,
  };

  describe(`prepare data in mg/dl`, () => {
    it(`should prepare data correctly with units in mg/dl without trend calculation`, () => {
      const result = prepareData(dataObj, paramsObj);
      expect(result.last).toEqual(90);
    });
    it(`should prepare data with the correct delta calculation (> 0)`, () => {
      const result = prepareData(dataObj, paramsObj);
      expect(result.delta).toBe(`+10`);
    });
    it(`should prepare data with the correct delta calculation (< 0)`, () => {
      dataObj.result.unshift(
        { sgv: 80, date: new Date().getTime(), direction: `FortyFiveDown`}
      );

      const result = prepareData(dataObj, paramsObj);
      dataObj.result.shift();
      expect(result.delta).toBe(`-10`);
    });
    it(`should prepare data with the correct delta calculation (== 0)`, () => {
      const lastResult = dataObj.result[0];
      dataObj.result.shift();

      const result = prepareData(dataObj, paramsObj);
      dataObj.result.unshift(lastResult);
      expect(result.delta).toBe(`+0`);
    });
  });

  describe(`prepare data in mmol/l`, () => {
    const paramsObjMMOL = { ...paramsObj, units_in_mmol: true };
    it(`should prepare data correctly with units in mmol/l`, () => {
      const result = prepareData(dataObj, paramsObjMMOL);
      expect(result.last).toEqual(`5.0`);
    });
    it(`should prepare data with the correct delta calculation (> 0)`, () => {
      const result = prepareData(dataObj, paramsObjMMOL);
      expect(result.delta).toBe(`+0.6`);
    });
    it(`should prepare data with the correct delta calculation (< 0)`, () => {
      dataObj.result.unshift(
        { sgv: 80, date: new Date().getTime(), direction: `FortyFiveDown`}
      );

      const result = prepareData(dataObj, paramsObjMMOL);
      dataObj.result.shift();
      expect(result.delta).toBe(`-0.6`);
    });
    it(`should prepare data with the correct delta calculation (== 0)`, () => {
      const lastResult = dataObj.result[0];
      dataObj.result.shift();

      const result = prepareData(dataObj, paramsObjMMOL);
      dataObj.result.unshift(lastResult);
      expect(result.delta).toBe(`+0.0`);
    });
  });

  describe(`prepare data with trend calculation`, () => {
    const paramsObjCalcTrend = { ...paramsObj, calc_trend: true };
    it(`should prepare data correctly with trend calculation`, () => {
      const result = prepareData(dataObj, paramsObjCalcTrend);
      expect(result.direction).toEqual(`&#8599;`);
    });
    it(`should prepare data correctly without trend calculation`, () => {
      const result = prepareData(dataObj, paramsObjCalcTrend);
      expect(result.direction).toEqual(`&#8599;`);
    });
  });

  it(`should prepare data correctly with the last measurement age`, () => {
    const result = prepareData(dataObj, paramsObj);
    expect(result.age).toBe(3);
  });

});


describe(`formDataToObject`, () => {
  it(`converts FormData to object`, () => {
    const formData = new FormData();
    formData.append(`name`, `Dmitry`);
    formData.append(`age`, `40`);
    formData.append(`is-happy`, `on`);

    const result = formDataToObject(formData);
    expect(result).toEqual({ name: `Dmitry`, age: `40`, 'is-happy': `on` });
  });

  it(`handles FormData with multiple values for the same key`, () => {
    const formData = new FormData();
    formData.append(`colors`, [`red`, `blue`]);

    const result = formDataToObject(formData);
    expect(result).toEqual({ colors: `red,blue` });
  });

  it(`handles an empty FormData`, () => {
    const formData = new FormData();

    const result = formDataToObject(formData);
    expect(result).toEqual({});
  });

});
