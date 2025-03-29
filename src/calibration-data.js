// Re-export everything from data-loader and calibration-math
// This file serves as a backwards compatibility layer

import {
  CURVE_TYPES,
  CURVE_METADATA,
  loadCalibrationData,
  getCalibrationData
} from './data-loader';

import {
  interpolate,
  getCurveValueAt,
  findHPD,
  calculateProbability,
  createUniformDistribution,
  calibrateDate
} from './calibration-math';

export {
  CURVE_TYPES,
  CURVE_METADATA,
  loadCalibrationData,
  calibrateDate
};