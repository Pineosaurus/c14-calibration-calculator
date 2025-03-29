import { calibrateDate } from '../calibration-data';
import { SEARCH_MODES } from '../components/inputs/InputForm';

export const performCalibration = async (inputData) => {
  const { radiocarbon_age, uncertainty, reservoir_correction = 0, curve, search_mode = SEARCH_MODES.C14_BP } = inputData;
  
  // Use our calibration function from calibration-data.js
  const calibrationResult = await calibrateDate(radiocarbon_age, uncertainty, reservoir_correction, curve, search_mode);
  
  // Format calendar year as BCE/CE
  const calendar_year_AD = 1950 - calibrationResult.calibrated_years_BP;
  const calendar_year = calendar_year_AD < 0 
    ? Math.abs(calendar_year_AD) + " BCE" 
    : calendar_year_AD + " CE";
  
  // Return results with formatted calendar year
  return {
    ...calibrationResult,
    calendar_year
  };
};