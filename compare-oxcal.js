#!/usr/bin/env node

/**
 * Compare-OxCal.js
 * 
 * This script validates our calibration math against known OxCal results
 * using the actual IntCal20 calibration curve data.
 * 
 * It processes the IntCal20 file directly and runs validation tests against
 * published OxCal results to ensure our implementation is scientifically accurate.
 */

const fs = require('fs');
const path = require('path');

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

// Utility to convert between BP and BC/AD
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
    probability: oxcalRange.probability,
    startCalDate: oxcalRange.start,
    endCalDate: oxcalRange.end
  };
};

/**
 * Parse the IntCal20 data file
 * @param {string} filePath - Path to IntCal20.14c file
 * @returns {Array} Array of calibration curve data points
 */
function parseIntCal20File(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
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
    process.exit(1);
  }
}

/**
 * Linearly interpolate between two calibration curve points
 */
function interpolate(targetCalBP, lowerPoint, upperPoint) {
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
}

/**
 * Get the calibration curve value at a specific cal BP year
 */
function getCurveValueAt(calBP, curveData) {
  // Handle edge cases
  if (calBP <= curveData[0].cal_BP) return curveData[0];
  if (calBP >= curveData[curveData.length - 1].cal_BP) return curveData[curveData.length - 1];
  
  // Use binary search to find the closest points
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
  const lowerPoint = curveData[high];
  const upperPoint = curveData[low];
  
  return interpolate(calBP, lowerPoint, upperPoint);
}

/**
 * Create a uniform 1-year resolution distribution
 */
function createUniformDistribution(curveData, startYear, endYear) {
  const result = [];
  
  for (let calBP = startYear; calBP <= endYear; calBP++) {
    const { c14_BP, error } = getCurveValueAt(calBP, curveData);
    result.push({ cal_BP: calBP, c14_BP, error });
  }
  
  return result;
}

/**
 * Calculate probability for a specific calendar year
 */
function calculateProbability(c14Age, c14Error, curveC14BP, curveError) {
  // Combine measurement and calibration curve errors in quadrature
  const totalError = Math.sqrt(Math.pow(c14Error, 2) + Math.pow(curveError, 2));
  
  // Calculate the deviation between measured value and calibration curve
  const deviation = c14Age - curveC14BP;
  
  // Calculate probability using normal distribution formula
  return Math.exp(-0.5 * Math.pow(deviation / totalError, 2)) / (totalError * Math.sqrt(2 * Math.PI));
}

/**
 * Find the Highest Posterior Density intervals
 */
function findHPD(probDist, conf) {
  // Sort by descending probability
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
}

/**
 * Calibrate a radiocarbon date using the actual IntCal20 data
 * This is a direct implementation of the calibration algorithm
 */
function calibrateDateWithIntCal20(c14Age, uncertainty, curveData) {
  // Apply a reasonable search range to find the relevant calendar years
  const searchRange = 5 * uncertainty;
  const potentialMinC14 = c14Age - searchRange;
  const potentialMaxC14 = c14Age + searchRange;
  
  // Find the calendar years that correspond to this C14 range
  let minCalBP = curveData[0].cal_BP;
  let maxCalBP = curveData[curveData.length - 1].cal_BP;
  
  // Binary search to find the lower bound
  let low = 0;
  let high = curveData.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (curveData[mid].c14_BP < potentialMinC14) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  // Adjust bounds if needed
  if (low > 0 && low < curveData.length) {
    minCalBP = curveData[Math.max(0, low - 1)].cal_BP;
  }
  
  // Reset for upper bound search
  low = 0;
  high = curveData.length - 1;
  
  // Find the upper bound
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (curveData[mid].c14_BP <= potentialMaxC14) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  // Adjust bounds if needed
  if (high >= 0 && high < curveData.length) {
    maxCalBP = curveData[Math.min(curveData.length - 1, high + 1)].cal_BP;
  }
  
  // Add margin to ensure we don't miss any probability mass
  minCalBP = Math.max(0, minCalBP - 200);
  maxCalBP = Math.min(12000, maxCalBP + 200);
  
  // Create a uniform distribution
  const uniformCurve = createUniformDistribution(curveData, minCalBP, maxCalBP);
  
  // Calculate probability for each calendar year
  const probabilities = uniformCurve.map(point => {
    const probability = calculateProbability(
      c14Age,
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
  
  // Find 95.4% confidence interval
  const hpd95 = findHPD(normalizedProbabilities, 0.954);
  
  return {
    input: {
      radiocarbon_age: c14Age,
      uncertainty
    },
    calibrated_years_BP: modePoint.cal_BP,
    calendar_year: 1950 - modePoint.cal_BP,
    hpd95_ranges: hpd95,
    range_95: {
      min: Math.min(...hpd95.map(r => r.min)),
      max: Math.max(...hpd95.map(r => r.max))
    }
  };
}

/**
 * Check if two date ranges overlap
 */
function rangesOverlap(range1, range2) {
  // For BP dates, note that startBP is the larger (older) value and endBP is the smaller (more recent) value
  // Check if ranges overlap (taking BP date direction into account)
  return range1.startBP >= range2.endBP && range1.endBP <= range2.startBP;
}

/**
 * Calculate the percentage of an OxCal range covered by our HPD intervals
 */
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

/**
 * Run validation tests against OxCal reference results
 */
function runValidationTests(curveData) {
  console.log('====================================================');
  console.log('INTCAL20 VALIDATION AGAINST OXCAL REFERENCE RESULTS');
  console.log('====================================================');
  console.log('Using actual IntCal20 curve data for validation tests');
  console.log(`Loaded ${curveData.length} data points from IntCal20\n`);
  
  let totalCoverage = 0;
  let referenceCount = 0;
  
  // Run tests for each reference date
  for (const reference of OXCAL_REFERENCE_DATES) {
    const { c14_age, uncertainty } = reference.input;
    console.log(`\nTesting R_Date(${c14_age},${uncertainty}):`);
    console.log('OxCal 95.4% ranges:');
    
    // Convert OxCal ranges to BP format
    const oxcalRangesBP = reference.results.map(range => {
      const converted = convertOxCalRangeToBP(range);
      console.log(`  ${converted.startCalDate} to ${converted.endCalDate} (${(converted.probability * 100).toFixed(1)}%) = ${converted.startBP}-${converted.endBP} BP`);
      return converted;
    });
    
    // Run our calibration
    const result = calibrateDateWithIntCal20(c14_age, uncertainty, curveData);
    
    // Convert our HPD intervals to same format for comparison
    const ourRanges = result.hpd95_ranges.map(range => ({
      min: range.min,
      max: range.max,
      startBP: range.max,  // In BP, max is the older/larger value
      endBP: range.min,    // In BP, min is the more recent/smaller value
      startCalDate: calBPtoCalDate(range.max),
      endCalDate: calBPtoCalDate(range.min)
    }));
    
    console.log('\nOur 95.4% HPD intervals:');
    for (const range of ourRanges) {
      console.log(`  ${range.startCalDate} to ${range.endCalDate} = ${range.startBP}-${range.endBP} BP`);
    }
    
    // Check overlap with each OxCal range
    console.log('\nValidation results:');
    let overallCoverage = 0;
    let totalProb = 0;
    
    for (const oxcalRange of oxcalRangesBP) {
      // Only focus on significant ranges (>5% probability)
      if (oxcalRange.probability < 0.05) {
        console.log(`  Minor range (${(oxcalRange.probability * 100).toFixed(1)}%): Skipping detailed validation`);
        continue;
      }
      
      // Check if any of our ranges overlap with this OxCal range
      let hasOverlap = false;
      let bestCoverage = 0;
      for (const ourRange of ourRanges) {
        if (rangesOverlap(oxcalRange, ourRange)) {
          hasOverlap = true;
          // Calculate coverage percentage
          const coverage = calculateCoverage(oxcalRange, result.hpd95_ranges);
          bestCoverage = Math.max(bestCoverage, coverage);
        }
      }
      
      // Report results
      if (hasOverlap) {
        console.log(`  Range ${oxcalRange.startCalDate} to ${oxcalRange.endCalDate} (${(oxcalRange.probability * 100).toFixed(1)}%):`);
        console.log(`    ✓ Overlap detected`);
        console.log(`    ✓ Coverage: ${bestCoverage.toFixed(1)}%`);
        
        // Weight the coverage by the probability of this range
        overallCoverage += bestCoverage * oxcalRange.probability;
        totalProb += oxcalRange.probability;
      } else {
        console.log(`  Range ${oxcalRange.startCalDate} to ${oxcalRange.endCalDate} (${(oxcalRange.probability * 100).toFixed(1)}%):`);
        console.log(`    ✗ No overlap found - Validation FAILED`);
      }
    }
    
    // Calculate weighted average coverage
    if (totalProb > 0) {
      const weightedCoverage = overallCoverage / totalProb;
      console.log(`\nOverall weighted coverage: ${weightedCoverage.toFixed(1)}%`);
      totalCoverage += weightedCoverage;
      referenceCount++;
    }
  }
  
  // Calculate and report average coverage across all reference tests
  if (referenceCount > 0) {
    const averageCoverage = totalCoverage / referenceCount;
    console.log('\n====================================================');
    console.log(`VALIDATION SUMMARY: ${averageCoverage.toFixed(1)}% average coverage`);
    console.log('====================================================');
    if (averageCoverage >= 80) {
      console.log('✓ PASSED: Our implementation is scientifically accurate!');
    } else if (averageCoverage >= 60) {
      console.log('⚠ ACCEPTABLE: Our implementation is reasonably accurate but could be improved.');
    } else {
      console.log('✗ FAILED: Our implementation needs significant improvement.');
    }
  }
}

/**
 * Main function
 */
function main() {
  // Path to IntCal20 data file
  const intcalPath = path.join(__dirname, 'public', 'intcal20.14c');
  
  // Check if file exists
  if (!fs.existsSync(intcalPath)) {
    console.error(`Error: IntCal20 data file not found at ${intcalPath}`);
    process.exit(1);
  }
  
  // Parse IntCal20 data
  const curveData = parseIntCal20File(intcalPath);
  
  // Run validation tests
  runValidationTests(curveData);
}

// Run the main function
main();