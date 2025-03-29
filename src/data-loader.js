// This file handles loading and parsing calibration curves for:
// - IntCal20 (Northern Hemisphere Atmospheric)
// - SHCal20 (Southern Hemisphere Atmospheric)
// - Marine20 (Marine Reservoir)

// Curve types enum
export const CURVE_TYPES = {
  INTCAL20: 'IntCal20',
  SHCAL20: 'SHCal20',
  MARINE20: 'Marine20'
};

// Curve metadata
export const CURVE_METADATA = {
  [CURVE_TYPES.INTCAL20]: {
    name: 'IntCal20',
    fullName: 'IntCal20 Northern Hemisphere Atmospheric',
    citation: 'Reimer, P., Austin, W., Bard, E. et al. (2020). "The IntCal20 Northern Hemisphere Radiocarbon Age Calibration Curve (0–55 cal kBP)." Radiocarbon, 62(4), 725-757.',
    description: 'Standard curve for Northern Hemisphere terrestrial samples.'
  },
  [CURVE_TYPES.SHCAL20]: {
    name: 'SHCal20',
    fullName: 'SHCal20 Southern Hemisphere Atmospheric',
    citation: 'Hogg, A., Heaton, T., Hua, Q. et al. (2020). "SHCal20 Southern Hemisphere Calibration, 0–55,000 Years cal BP." Radiocarbon, 62(4), 759-778.',
    description: 'For Southern Hemisphere terrestrial samples (affected by different carbon cycling).'
  },
  [CURVE_TYPES.MARINE20]: {
    name: 'Marine20',
    fullName: 'Marine20 Marine Calibration',
    citation: 'Heaton, T., Köhler, P., Butzin, M. et al. (2020). "Marine20—The Marine Radiocarbon Age Calibration Curve (0–55,000 cal BP)." Radiocarbon, 62(4), 779-820.',
    description: 'For marine samples (already accounts for global marine reservoir effect).'
  }
};

// Cached calibration curves will be loaded here
let CALIBRATION_CURVES = null;

/**
 * Parse a .14c format calibration file into an array of data points
 * @param {string} fileContent - Raw file content
 * @return {Array} Array of cal_BP, c14_BP, error data points
 */
export const parseCalibrationFile = (fileContent) => {
  if (!fileContent || typeof fileContent !== 'string') {
    console.error('Invalid file content provided to parser');
    return [];
  }
  
  try {
    // Split file into lines and skip header lines that start with # or ##
    const lines = fileContent.split('\n').filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('#') && trimmed.length > 0;
    });
    
    // If we have no valid lines, throw an error
    if (lines.length === 0) {
      console.error('No valid data lines found in calibration file');
      throw new Error('Invalid calibration file format');
    }
    
    // Parse data from each line
    const parsedLines = lines.map((line, index) => {
      try {
        // Handle both comma and space-separated formats
        let parts;
        if (line.includes(',')) {
          parts = line.trim().split(',');
        } else {
          parts = line.trim().split(/\s+/);
        }
        
        // Ensure we have at least 3 parts
        if (parts.length < 3) {
          console.warn(`Insufficient data at line ${index + 1}: ${line}`);
          return null;
        }
        
        // Extract the first three numbers (cal_BP, c14_BP, error)
        const cal_BP = parseFloat(parts[0]);
        const c14_BP = parseFloat(parts[1]);
        const error = parseFloat(parts[2]);
        
        // Validate parsed values
        if (isNaN(cal_BP) || isNaN(c14_BP) || isNaN(error)) {
          console.warn(`Invalid numeric data at line ${index + 1}: ${line}`);
          return null;
        }
        
        // Validate reasonable ranges
        if (cal_BP < 0 || cal_BP > 100000 || c14_BP < 0 || c14_BP > 100000 || error <= 0) {
          console.warn(`Out of range values at line ${index + 1}: ${line}`);
          return null;
        }
        
        return { cal_BP, c14_BP, error };
      } catch (err) {
        console.warn(`Error parsing line ${index + 1}: ${line}`, err);
        return null;
      }
    }).filter(item => item !== null); // Remove any null entries from failed parsing
    
    // Final check - ensure we have data
    if (parsedLines.length === 0) {
      console.error('All lines failed to parse in calibration file');
      throw new Error('No valid data points found');
    }
    
    return parsedLines;
  } catch (err) {
    console.error('Error parsing calibration file:', err);
    return []; // Return empty array on failure
  }
};


/**
 * Load calibration data from all curves
 * @return {Object} Object with keys for each curve type containing data arrays
 */
export const loadCalibrationData = async () => {
  if (CALIBRATION_CURVES !== null) {
    return CALIBRATION_CURVES;
  }
  
  try {
    const curveFiles = {
      [CURVE_TYPES.INTCAL20]: '/intcal20.14c',
      [CURVE_TYPES.SHCAL20]: '/shcal20.14c',
      [CURVE_TYPES.MARINE20]: '/marine20.14c'
    };
    
    // Fetch and process each curve in parallel with better error handling
    const curveFetches = Object.entries(curveFiles).map(async ([curveType, filePath]) => {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${curveType} data: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const data = parseCalibrationFile(text);
        
        if (!data.length) {
          throw new Error(`${curveType} data is empty or invalid`);
        }
        
        return [curveType, data];
      } catch (err) {
        console.error(`Error loading ${curveType} data:`, err);
        throw new Error(`Failed to load ${curveType} calibration data: ${err.message}`);
      }
    });
    
    // Wait for all curve data to be processed
    const curveResults = await Promise.all(curveFetches);
    
    // Process results
    const calibrationCurves = {};
    
    // Sort the data properly (ascending by cal_BP)
    // No longer filtering to 0-12000 years BP to support full curve calibration
    curveResults.forEach(([curveType, data]) => {
      const sortedData = data
        .filter(point => point.cal_BP >= 0) // Still ensure we don't have negative cal BP values
        .sort((a, b) => a.cal_BP - b.cal_BP); // Sort ascending by cal_BP
      
      calibrationCurves[curveType] = sortedData;
    });
    
    // Store the processed curves
    CALIBRATION_CURVES = calibrationCurves;
    
    return CALIBRATION_CURVES;
  } catch (error) {
    console.error('Error loading calibration data:', error);
    throw new Error('Failed to load calibration data. Please ensure all calibration files are available.');
  }
};

/**
 * Get the currently loaded calibration data
 * @return {Object|null} The calibration curves or null if not yet loaded
 */
export const getCalibrationData = () => {
  return CALIBRATION_CURVES;
};