// This test file validates our calibration against OxCal published results
// using the ACTUAL IntCal20 data (not mocked data)

import {
  interpolate,
  getCurveValueAt,
  findHPD,
  calculateProbability,
  createUniformDistribution,
  calibrateDate
} from '../calibration-math';

import { CURVE_TYPES } from '../data-loader';
import fs from 'fs';
import path from 'path';

// Path to the actual IntCal20 data file in the public directory
const INTCAL20_PATH = path.join(__dirname, '../..', 'public', 'intcal20.14c');

// Check if the file exists before proceeding with tests
const intcal20Exists = fs.existsSync(INTCAL20_PATH);

// OxCal reference results for validation
const OXCAL_REFERENCE_DATES = [
  {
    input: { c14_age: 3000, uncertainty: 300 },
    results: [
      { start: '2013calBC', end: '2000calBC', probability: 0.002 },
      { start: '1976calBC', end: '476calBC', probability: 0.952 }
    ]
  },
  {
    input: { c14_age: 5000, uncertainty: 200 },
    results: [
      { start: '4316calBC', end: '4299calBC', probability: 0.005 },
      { start: '4253calBC', end: '3371calBC', probability: 0.949 }
    ]
  },
  {
    input: { c14_age: 2000, uncertainty: 500 },
    results: [
      { start: '1287calBC', end: '992calAD', probability: 0.954 }
    ]
  }
];

// Helper functions for date conversion
const calBPtoCalDate = (calBP) => {
  const year = 1950 - calBP;
  return year < 0 ? `${Math.abs(year)}calBC` : `${year}calAD`;
};

const calDateToCalBP = (calDate) => {
  if (calDate.includes('calBC')) {
    return parseInt(calDate.replace('calBC', '')) + 1950;
  } else {
    return 1950 - parseInt(calDate.replace('calAD', ''));
  }
};

// Convert OxCal ranges to BP format
const convertOxCalRangeToBP = (oxcalRange) => {
  const startBP = calDateToCalBP(oxcalRange.start);
  const endBP = calDateToCalBP(oxcalRange.end);
  
  return { 
    startBP, 
    endBP, 
    probability: oxcalRange.probability
  };
};

// Parse the actual IntCal20 data file for testing
const parseIntCal20File = () => {
  try {
    const fileContent = fs.readFileSync(INTCAL20_PATH, 'utf8');
    const lines = fileContent.split('\n');
    
    // Parse data, skipping header lines
    const data = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Parse data point
      const parts = trimmed.split(/[\s,]+/);
      if (parts.length < 3) continue;
      
      const cal_BP = parseFloat(parts[0]);
      const c14_BP = parseFloat(parts[1]);
      const error = parseFloat(parts[2]);
      
      if (isNaN(cal_BP) || isNaN(c14_BP) || isNaN(error)) continue;
      
      // Only include data within our supported range (0-12000 BP)
      if (cal_BP >= 0 && cal_BP <= 12000) {
        data.push({ cal_BP, c14_BP, error });
      }
    }
    
    // Sort by cal_BP for binary search
    return data.sort((a, b) => a.cal_BP - b.cal_BP);
  } catch (error) {
    console.error(`Error parsing IntCal20 file: ${error.message}`);
    return null;
  }
};

// Check if ranges overlap
function rangesOverlap(range1, range2) {
  // For BP dates, note that startBP is the larger (older) value and endBP is the smaller (more recent) value
  // Check if ranges overlap (taking BP date direction into account)
  return range1.startBP >= range2.endBP && range1.endBP <= range2.startBP;
}

// Calculate the coverage percentage
function calculateCoverage(oxcalRange, ourRanges) {
  // Total years in OxCal range
  const oxcalYears = oxcalRange.startBP - oxcalRange.endBP + 1;
  
  // Years covered by our ranges
  let yearsCovered = 0;
  for (let year = oxcalRange.endBP; year <= oxcalRange.startBP; year++) {
    for (const ourRange of ourRanges) {
      if (year >= ourRange.min && year <= ourRange.max) {
        yearsCovered++;
        break;
      }
    }
  }
  
  return (yearsCovered / oxcalYears) * 100;
}

if (!intcal20Exists) throw('No oxcal')

// Skip all tests if the actual IntCal20 file doesn't exist


describe('OxCal validation with actual IntCal20 data', () => {
  let intcal20Data;
  
  beforeAll(() => {
    // Parse the actual IntCal20 data file
    intcal20Data = parseIntCal20File();
  });
  
  test('Actual IntCal20 data was loaded successfully', () => {
    expect(intcal20Data).toBeTruthy();
    expect(intcal20Data.length).toBeGreaterThan(1000); // Should have thousands of points
    expect(intcal20Data[0]).toHaveProperty('cal_BP');
    expect(intcal20Data[0]).toHaveProperty('c14_BP');
    expect(intcal20Data[0]).toHaveProperty('error');
  });
  
  // Mock the data-loader module
  beforeEach(() => {
    // Properly mock the data-loader module before each test
    const dataLoader = require('../data-loader');
    
    // Create mock functions that will return our actual IntCal20 data
    dataLoader.loadCalibrationData = jest.fn().mockResolvedValue({
      [CURVE_TYPES.INTCAL20]: intcal20Data
    });
    
    dataLoader.getCalibrationData = jest.fn().mockReturnValue({
      [CURVE_TYPES.INTCAL20]: intcal20Data
    });
  });
  
  // Test each OxCal reference date
  OXCAL_REFERENCE_DATES.forEach(reference => {
    const { c14_age, uncertainty } = reference.input;
    
    test(`R_Date(${c14_age},${uncertainty}) matches OxCal ranges with >80% coverage`, async () => {
      // Convert OxCal ranges to BP format
      const oxcalRangesBP = reference.results.map(convertOxCalRangeToBP);
      
      // Run our calibration against the actual IntCal20 data
      const result = await calibrateDate(c14_age, uncertainty, 0, CURVE_TYPES.INTCAL20);
      
      // Check result structure
      expect(result).toHaveProperty('hpd95_ranges');
      expect(result.hpd95_ranges.length).toBeGreaterThan(0);
      
      // Check if significant OxCal ranges (>5% probability) are covered
      let hasOverlap = false;
      let bestCoverage = 0;
      
      for (const oxcalRange of oxcalRangesBP) {
        // Skip minor ranges (<5% probability)
        if (oxcalRange.probability < 0.05) continue;
        
        // Check if any of our ranges overlap with this OxCal range
        for (const ourRange of result.hpd95_ranges) {
          const convertedRange = {
            startBP: ourRange.max,
            endBP: ourRange.min
          };
          
          if (rangesOverlap(oxcalRange, convertedRange)) {
            hasOverlap = true;
            
            // Calculate coverage percentage
            const coverage = calculateCoverage(oxcalRange, result.hpd95_ranges);
            bestCoverage = Math.max(bestCoverage, coverage);
          }
        }
        
        // There should be overlap with significant OxCal ranges
        expect(hasOverlap).toBe(true);
        
        // Coverage should be at least 80%
        expect(bestCoverage).toBeGreaterThanOrEqual(80);
      }
    });
  });
});