// This file handles the mathematical calculations for radiocarbon calibration
import { SEARCH_MODES } from './components/inputs/InputForm';
import { CURVE_TYPES, CURVE_METADATA, loadCalibrationData, getCalibrationData } from './data-loader';

/**
 * Linearly interpolate between two data points
 * @param {number} targetCalBP - The cal BP value to interpolate for
 * @param {Object} lowerPoint - The data point with cal_BP <= targetCalBP
 * @param {Object} upperPoint - The data point with cal_BP >= targetCalBP
 * @return {Object} Interpolated c14_BP and error values
 */
export const interpolate = (targetCalBP, lowerPoint, upperPoint) => {
  // If points are the same, no interpolation needed
  if (lowerPoint.cal_BP === upperPoint.cal_BP) {
    return { c14_BP: lowerPoint.c14_BP, error: lowerPoint.error };
  }
  
  // Calculate the interpolation factor
  const factor = (targetCalBP - lowerPoint.cal_BP) / (upperPoint.cal_BP - lowerPoint.cal_BP);
  
  // Interpolate the c14_BP and error
  const c14_BP = lowerPoint.c14_BP + factor * (upperPoint.c14_BP - lowerPoint.c14_BP);
  const error = lowerPoint.error + factor * (upperPoint.error - lowerPoint.error);
  
  return { c14_BP, error };
};

/**
 * Find the calibration curve value for a specific cal BP year
 * @param {number} calBP - Calendar year BP to find
 * @param {Array} curveData - Calibration curve data (sorted ascending by cal_BP)
 * @return {Object} Interpolated { c14_BP, error } for the calBP year
 */
export const getCurveValueAt = (calBP, curveData) => {
  // Handle edge cases
  if (calBP <= curveData[0].cal_BP) return curveData[0];
  if (calBP >= curveData[curveData.length - 1].cal_BP) return curveData[curveData.length - 1];
  
  // Find the index where calBP would be inserted to maintain sort order
  let low = 0;
  let high = curveData.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (curveData[mid].cal_BP < calBP) {
      low = mid + 1;
    } else if (curveData[mid].cal_BP > calBP) {
      high = mid - 1;
    } else {
      // Exact match
      return curveData[mid];
    }
  }
  
  // No exact match, interpolate between the two closest points
  // low now points to the first element greater than calBP
  // high now points to the last element less than calBP
  const lowerPoint = curveData[high];
  const upperPoint = curveData[low];
  
  return interpolate(calBP, lowerPoint, upperPoint);
};

/**
 * Find the Highest Posterior Density (HPD) intervals
 * @param {Array} probDist - Probability distribution (ordered by cal_BP)
 * @param {number} conf - Confidence level (0.68 for 1σ, 0.95 for 2σ)
 * @return {Array} Array of intervals [{min, max}, ...] that collectively contain conf% of probability
 */
export const findHPD = (probDist, conf) => {
  // Input validation
  if (!probDist || !Array.isArray(probDist) || probDist.length === 0) {
    console.warn('Invalid probability distribution provided to findHPD');
    return [];
  }
  
  if (conf <= 0 || conf > 1) {
    console.warn(`Invalid confidence level (${conf}) provided to findHPD. Using 0.95 as default.`);
    conf = 0.95;
  }
  
  // Sort by descending probability - use destructuring for minimal memory footprint
  const sortedByProb = [...probDist].sort((a, b) => b.probability - a.probability);
  
  // Calculate total probability to handle non-normalized distributions
  const totalProb = probDist.reduce((sum, p) => sum + p.probability, 0);
  const targetProb = totalProb * conf;
  
  // Collect points until we reach the confidence threshold
  let cumulativeProb = 0;
  const includedPoints = [];
  
  for (const point of sortedByProb) {
    includedPoints.push(point);
    cumulativeProb += point.probability;
    if (cumulativeProb >= targetProb) break;
  }
  
  // Early exit if no points met the threshold
  if (includedPoints.length === 0) {
    return [];
  }
  
  // Sort included points by cal_BP (ascending)
  includedPoints.sort((a, b) => a.cal_BP - b.cal_BP);
  
  // Find contiguous intervals
  const intervals = [];
  let start = includedPoints[0];
  let prev = start;
  
  for (let i = 1; i < includedPoints.length; i++) {
    const curr = includedPoints[i];
    // If there's a break in continuity (gap > 1 year), end current interval and start new one
    if (curr.cal_BP - prev.cal_BP > 1) {
      intervals.push({ min: start.cal_BP, max: prev.cal_BP });
      start = curr;
    }
    prev = curr;
  }
  
  // Add the last interval
  intervals.push({ min: start.cal_BP, max: prev.cal_BP });
  
  return intervals;
};

/**
 * Calculate the probability that a radiocarbon age corresponds to a specific calendar year
 * @param {number} c14Age - Measured radiocarbon age (BP)
 * @param {number} c14Error - Error/uncertainty in measurement
 * @param {number} curveC14BP - Calibration curve C14 age at the calendar point
 * @param {number} curveError - Calibration curve error at the calendar point
 * @return {number} Probability density
 */
export const calculateProbability = (c14Age, c14Error, curveC14BP, curveError) => {
  // Combine measurement and calibration curve errors in quadrature
  const totalError = Math.sqrt(Math.pow(c14Error, 2) + Math.pow(curveError, 2));
  
  // Calculate the deviation between measured value and calibration curve
  const deviation = c14Age - curveC14BP;
  
  // Calculate probability using normal distribution formula
  return Math.exp(-0.5 * Math.pow(deviation / totalError, 2)) / (totalError * Math.sqrt(2 * Math.PI));
};

/**
 * Create a uniform 1-year resolution distribution from the calibration curve
 * @param {Array} curveData - Original calibration curve data
 * @param {number} startYear - Starting year BP (lower bound)
 * @param {number} endYear - Ending year BP (upper bound)
 * @return {Array} Array of points with 1-year spacing
 */
export const createUniformDistribution = (curveData, startYear, endYear) => {
  const result = [];
  
  for (let calBP = startYear; calBP <= endYear; calBP++) {
    const { c14_BP, error } = getCurveValueAt(calBP, curveData);
    result.push({ cal_BP: calBP, c14_BP, error });
  }
  
  return result;
};

/**
 * Find calendar year range based on radiocarbon age
 * @param {Array} curveData - Calibration curve data
 * @param {number} c14Age - Target radiocarbon age
 * @param {number} uncertainty - Measurement uncertainty
 * @return {Object} Range of calendar years corresponding to the c14 age range
 */
export const findCalendarRangeByC14BP = (curveData, c14Age, uncertainty) => {
  // Create a searchable copy of curve data sorted by c14_BP
  const c14SortedCurve = [...curveData].sort((a, b) => a.c14_BP - b.c14_BP);
  
  // We'll go +/- 5 sigma from the measured age to capture the full probability distribution
  const searchRange = 5 * uncertainty;
  const minC14 = c14Age - searchRange;
  const maxC14 = c14Age + searchRange;
  
  // Binary search to find closest points to min C14 age
  let low = 0;
  let high = c14SortedCurve.length - 1;
  let minIndex = 0;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (c14SortedCurve[mid].c14_BP < minC14) {
      low = mid + 1;
    } else {
      high = mid - 1;
      minIndex = mid;
    }
  }
  
  // Binary search to find closest points to max C14 age
  low = 0;
  high = c14SortedCurve.length - 1;
  let maxIndex = c14SortedCurve.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (c14SortedCurve[mid].c14_BP <= maxC14) {
      low = mid + 1;
      maxIndex = mid;
    } else {
      high = mid - 1;
    }
  }
  
  // Get the range of calendar years
  const calYears = c14SortedCurve.slice(minIndex, maxIndex + 1).map(p => p.cal_BP);
  return {
    min: Math.min(...calYears),
    max: Math.max(...calYears)
  };
};

/**
 * Calibrate a radiocarbon date
 * @param {number} c14_age - Radiocarbon age (BP)
 * @param {number} uncertainty - Measurement uncertainty
 * @param {number} reservoir_correction - Reservoir effect correction (default: 0)
 * @param {string} curveType - Calibration curve to use (default: INTCAL20)
 * @param {string} search_mode - How to determine calendar year range
 * @return {Object} Calibration results including probability distribution
 * @throws {Error} If input parameters are invalid or if calibration data can't be loaded
 */
export const calibrateDate = async (
  c14_age, 
  uncertainty, 
  reservoir_correction = 0, 
  curveType = CURVE_TYPES.INTCAL20,
  search_mode = SEARCH_MODES.C14_BP
) => {
  // Input validation
  if (typeof c14_age !== 'number' || isNaN(c14_age) || c14_age < 0 || c14_age > 100000) {
    throw new Error(`Invalid radiocarbon age: ${c14_age}. Must be a positive number.`);
  }
  
  if (typeof uncertainty !== 'number' || isNaN(uncertainty) || uncertainty <= 0) {
    throw new Error(`Invalid uncertainty: ${uncertainty}. Must be a positive number.`);
  }
  
  if (typeof reservoir_correction !== 'number' || isNaN(reservoir_correction)) {
    throw new Error(`Invalid reservoir correction: ${reservoir_correction}. Must be a number.`);
  }
  
  // Ensure valid curve type
  if (!Object.values(CURVE_TYPES).includes(curveType)) {
    console.warn(`Invalid curve type: ${curveType}. Using default ${CURVE_TYPES.INTCAL20}.`);
    curveType = CURVE_TYPES.INTCAL20;
  }
  
  // Ensure calibration data is loaded
  let calibrationCurves = getCalibrationData();
  if (calibrationCurves === null) {
    try {
      calibrationCurves = await loadCalibrationData();
    } catch (error) {
      throw new Error(`Failed to load calibration data: ${error.message}`);
    }
  }
  
  if (!calibrationCurves[curveType] || !Array.isArray(calibrationCurves[curveType]) || calibrationCurves[curveType].length === 0) {
    throw new Error(`Calibration curve data for ${curveType} is missing or invalid.`);
  }
  
  // Apply reservoir correction to the measured age
  const corrected_age = c14_age - reservoir_correction;
  
  // Get the calibration curve data
  const curveData = calibrationCurves[curveType];
  
  // Determine min and max calendar years based on search mode
  let minCalBP, maxCalBP;
  
  switch (search_mode) {
    case 'c14_bp':
      // Find calendar year range based on radiocarbon age
      const calRange = findCalendarRangeByC14BP(curveData, corrected_age, uncertainty);
      minCalBP = calRange.min;
      maxCalBP = calRange.max;
      
      // Add buffer for interpolation (more generous buffer)
      minCalBP = Math.max(0, minCalBP - 500);
      maxCalBP = maxCalBP + 500; // No upper limit
      break;
      
    case 'full_curve':
      // Use the entire calibration curve
      minCalBP = curveData[0].cal_BP;
      maxCalBP = curveData[curveData.length - 1].cal_BP;
      break;
      
    case 'fixed_range':
    default:
      // Standard fixed range (still capped at 12000 for this mode)
      minCalBP = 0;
      maxCalBP = 12000;
      break;
  }
  
  // Constrain to valid curve range
  minCalBP = Math.max(minCalBP, curveData[0].cal_BP);
  maxCalBP = Math.min(maxCalBP, curveData[curveData.length - 1].cal_BP);
  
  // Create a uniform 1-year resolution dataset for the region of interest
  const uniformCurve = createUniformDistribution(curveData, minCalBP, maxCalBP);
  
  // Calculate probability for each calendar year
  const probabilities = uniformCurve.map(point => {
    const probability = calculateProbability(
      corrected_age,
      uncertainty,
      point.c14_BP,
      point.error
    );
    
    return {
      cal_BP: point.cal_BP,
      probability
    };
  });
  
  // Normalize probabilities
  const totalProbability = probabilities.reduce((sum, p) => sum + p.probability, 0);
  const normalizedProbabilities = probabilities.map(p => ({
    cal_BP: p.cal_BP,
    probability: p.probability / totalProbability
  }));
  
  // Find the mode (highest probability calendar year)
  const modePoint = [...normalizedProbabilities].sort((a, b) => b.probability - a.probability)[0];
  
  // Find HPD intervals for 1σ (68.2%) and 2σ (95.4%) confidence
  const hpd68 = findHPD(normalizedProbabilities, 0.682);
  const hpd95 = findHPD(normalizedProbabilities, 0.954);
  
  // Format the distribution for the chart
  const distribution = normalizedProbabilities.map(p => ({
    x: p.cal_BP,
    y: p.probability
  }));
  
  // Sort the distribution by calendar age for display
  distribution.sort((a, b) => a.x - b.x);
  
  // Create more detailed result object
  return {
    input: {
      radiocarbon_age: c14_age,
      uncertainty,
      reservoir_correction,
      curve: curveType,
      search_mode
    },
    calibrated_years_BP: modePoint.cal_BP,
    calendar_year: 1950 - modePoint.cal_BP,
    // HPD intervals - potentially multiple ranges
    hpd68_ranges: hpd68,
    hpd95_ranges: hpd95,
    // Legacy compatibility with the existing app
    range_1sigma: {
      min: Math.min(...hpd68.map(r => r.min)),
      max: Math.max(...hpd68.map(r => r.max))
    },
    range_2sigma: {
      min: Math.min(...hpd95.map(r => r.min)),
      max: Math.max(...hpd95.map(r => r.max))
    },
    distribution: distribution,
    curveMetadata: CURVE_METADATA[curveType]
  };
};