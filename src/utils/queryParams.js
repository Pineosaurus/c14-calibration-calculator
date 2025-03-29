import { CURVE_TYPES } from '../calibration-data';
import { SEARCH_MODES } from '../components/inputs/InputForm';

// Helper function to parse query parameters
export const parseQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  
  const getNumericParam = (name) => {
    const value = params.get(name);
    return value !== null ? parseFloat(value) : null;
  };
  
  // Get search mode parameter and validate it
  const searchMode = params.get('mode');
  const validMode = Object.values(SEARCH_MODES).includes(searchMode) 
    ? searchMode 
    : SEARCH_MODES.C14_BP;
  
  return {
    radiocarbon_age: getNumericParam('age'),
    uncertainty: getNumericParam('uncertainty'),
    reservoir_correction: getNumericParam('reservoir') || 0,
    curve: Object.values(CURVE_TYPES).includes(params.get('curve')) 
      ? params.get('curve') 
      : CURVE_TYPES.INTCAL20,
    search_mode: validMode
  };
};

// Helper function to update URL with query parameters
export const updateQueryParams = (inputData) => {
  const params = new URLSearchParams();
  if (inputData.radiocarbon_age !== null) params.set('age', inputData.radiocarbon_age);
  if (inputData.uncertainty !== null) params.set('uncertainty', inputData.uncertainty);
  if (inputData.reservoir_correction > 0) params.set('reservoir', inputData.reservoir_correction);
  params.set('curve', inputData.curve);
  
  // Add search mode to URL if it's provided
  if (inputData.search_mode) {
    params.set('mode', inputData.search_mode);
  }
  
  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
};