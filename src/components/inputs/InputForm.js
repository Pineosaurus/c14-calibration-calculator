import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FormGroup, 
  NumericInput, 
  Button, 
  Intent, 
  Tooltip, 
  Icon, 
  Callout,
  HTMLSelect,
  Tag,
  Colors,
  Radio,
  RadioGroup
} from "@blueprintjs/core";
import { CURVE_TYPES, CURVE_METADATA } from '../../calibration-data';

// Define search mode options
// Using string values to match the ones expected by calibrateDate
export const SEARCH_MODES = {
  C14_BP: "c14_bp",            // Sort by radiocarbon BP
  FULL_CURVE: "full_curve",    // Use entire curve range
  FIXED_RANGE: "fixed_range"   // Fixed range 0-12000 BP
};

const InputForm = ({ 
  onCalibrate, 
  initialValues = null, 
  hasInitialCalibration = false, 
  isLoading = false, 
  dataLoaded = true,
  setInputCollapsed = null,
}) => {
  const [radiocarbon_age, setRadiocarbonAge] = useState(initialValues?.radiocarbon_age || null);
  const [uncertainty, setUncertainty] = useState(initialValues?.uncertainty || null);
  const [reservoir_correction, setReservoirCorrection] = useState(initialValues?.reservoir_correction || 0);
  const [selectedCurve, setSelectedCurve] = useState(initialValues?.curve || CURVE_TYPES.INTCAL20);
  const [searchMode, setSearchMode] = useState(initialValues?.search_mode || SEARCH_MODES.C14_BP);
  const [errors, setErrors] = useState({});
  const [debouncingFields, setDebouncingFields] = useState({
    radiocarbon_age: false,
    uncertainty: false,
    reservoir_correction: false
  });
  const [shouldCalibrate, setShouldCalibrate] = useState(false);
  
  // Setup debounce timers as refs so they persist between renders
  const radioAgeTimerRef = useRef(null);
  const uncertaintyTimerRef = useRef(null);
  const reservoirTimerRef = useRef(null);
  
  // Update values if initialValues change
  useEffect(() => {
    if (initialValues) {
      setRadiocarbonAge(initialValues.radiocarbon_age);
      setUncertainty(initialValues.uncertainty);
      setReservoirCorrection(initialValues.reservoir_correction || 0);
      setSelectedCurve(initialValues.curve || CURVE_TYPES.INTCAL20);
      
      const newSearchMode = initialValues.search_mode || SEARCH_MODES.C14_BP;
      setSearchMode(newSearchMode);
      // Update the last search mode ref to prevent unnecessary recalibration
      lastSearchMode.current = newSearchMode;
    }
  }, [initialValues]);
  
  // Define a helper to clean up all timers
  const cleanupTimers = useCallback(() => {
    if (radioAgeTimerRef.current) clearTimeout(radioAgeTimerRef.current);
    if (uncertaintyTimerRef.current) clearTimeout(uncertaintyTimerRef.current);
    if (reservoirTimerRef.current) clearTimeout(reservoirTimerRef.current);
  }, []);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return cleanupTimers;
  }, [cleanupTimers]);

  // Update the input values but don't trigger calibration
  const handleInputChange = useCallback((value, setter, field, timerRef) => {
    // Update state immediately for responsive UI
    setter(value);
    
    // Set debouncing state for visual feedback
    setDebouncingFields(prev => ({ ...prev, [field]: true }));
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Set up a new timer for calibration
    timerRef.current = setTimeout(() => {
      // Mark debouncing as complete
      setDebouncingFields(prev => ({ ...prev, [field]: false }));
      
      // Only trigger calibration after debouncing if we already have an initial calibration
      if (hasInitialCalibration) {
        setShouldCalibrate(true);
      }
    }, 500);
  }, [hasInitialCalibration]);
  
  // Define the individual handlers using the common handler
  const handleRadioAgeChange = useCallback((value) => {
    handleInputChange(value, setRadiocarbonAge, 'radiocarbon_age', radioAgeTimerRef);
  }, [handleInputChange]);
  
  const handleUncertaintyChange = useCallback((value) => {
    handleInputChange(value, setUncertainty, 'uncertainty', uncertaintyTimerRef);
  }, [handleInputChange]);
  
  const handleReservoirChange = useCallback((value) => {
    handleInputChange(value, setReservoirCorrection, 'reservoir_correction', reservoirTimerRef);
  }, [handleInputChange]);
  
  // Validate inputs and return true if valid
  const validateInputs = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    // Validate radiocarbon age
    if (radiocarbon_age === null) {
      newErrors.radiocarbon_age = "Please provide a radiocarbon age";
      isValid = false;
    } else if (radiocarbon_age < 0 || radiocarbon_age > 50000) {
      newErrors.radiocarbon_age = "Radiocarbon age must be between 0 and 50,000 years BP";
      isValid = false;
    }
    
    // Validate uncertainty
    if (uncertainty === null) {
      newErrors.uncertainty = "Please provide measurement uncertainty";
      isValid = false;
    } else if (uncertainty <= 0) {
      newErrors.uncertainty = "Uncertainty must be greater than 0";
      isValid = false;
    }
    
    // Update errors state
    setErrors(newErrors);
    return isValid;
  }, [radiocarbon_age, uncertainty]);

  // Memoize the calibration handler to prevent circular dependencies
  const handleCalibration = useCallback(() => {
    if (hasInitialCalibration && validateInputs() && !isLoading && dataLoaded) {
      onCalibrate({
        radiocarbon_age,
        uncertainty,
        reservoir_correction,
        curve: selectedCurve,
        search_mode: searchMode
      });
    }
  }, [
    radiocarbon_age, 
    uncertainty, 
    reservoir_correction, 
    selectedCurve,
    searchMode, 
    hasInitialCalibration, 
    validateInputs, 
    isLoading, 
    dataLoaded, 
    onCalibrate
  ]);
  
  // Effect for calibration curve changes (debounce with a short delay)
  useEffect(() => {
    if (hasInitialCalibration && !isLoading && dataLoaded) {
      // Use a short delay for dropdown changes to prevent too frequent updates
      const timer = setTimeout(() => {
        setShouldCalibrate(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCurve, hasInitialCalibration, isLoading, dataLoaded]);
  
  // Track user-initiated search mode changes
  const userChangedSearchMode = useRef(false);
  const lastSearchMode = useRef(searchMode);
  
  // Effect for search mode changes (debounce with a short delay)
  useEffect(() => {
    // Only trigger a calibration if:
    // 1. We have an initial calibration
    // 2. We're not already loading 
    // 3. Data is loaded
    // 4. Either user explicitly changed the mode OR the search mode changed externally but not from calibration results
    const isUserChange = userChangedSearchMode.current;
    const isModeChange = searchMode !== lastSearchMode.current;
    
    if (hasInitialCalibration && !isLoading && dataLoaded && (isUserChange || isModeChange)) {
      // Update the last mode to prevent loops
      lastSearchMode.current = searchMode;
      
      // Use a short delay for changes to prevent too frequent updates
      const timer = setTimeout(() => {
        setShouldCalibrate(true);
        // Reset the user change flag after triggering calibration
        userChangedSearchMode.current = false;
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [searchMode, hasInitialCalibration, isLoading, dataLoaded]); 
  
  // Effect to actually perform the calibration, but only when shouldCalibrate is set to true
  // This separates input state updates from the calibration calculation
  useEffect(() => {
    // Only run if we should calibrate and have all the necessary conditions
    if (shouldCalibrate && hasInitialCalibration && !isLoading && dataLoaded) {
      // Reset the calibration trigger
      setShouldCalibrate(false);
      
      // Validate and perform calibration
      if (validateInputs()) {
        onCalibrate({
          radiocarbon_age,
          uncertainty,
          reservoir_correction,
          curve: selectedCurve,
          search_mode: searchMode
        });
      }
    }
  }, [
    shouldCalibrate,
    radiocarbon_age, 
    uncertainty, 
    reservoir_correction, 
    selectedCurve,
    searchMode,
    hasInitialCalibration, 
    isLoading, 
    dataLoaded,
    validateInputs,
    onCalibrate
  ]);
  
  // Automatically submit the form when Enter key is pressed in any input field
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !hasInitialCalibration && !isLoading && dataLoaded) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Block submission if loading or data not loaded
    if (isLoading || !dataLoaded) return;
    
    // Make sure no debouncing is in progress by clearing any timers
    cleanupTimers();
    
    // Reset debouncing states
    setDebouncingFields({
      radiocarbon_age: false,
      uncertainty: false,
      reservoir_correction: false
    });
    
    // Use the same validation for initial calibration
    if (validateInputs()) {
      // Call the parent's calibration function
      onCalibrate({
        radiocarbon_age,
        uncertainty,
        reservoir_correction,
        curve: selectedCurve,
        search_mode: searchMode
      });
    }
  };
  
  const titleText = hasInitialCalibration ? "Edit Parameters" : "Set Parameters"

  return (
    <form id="calibration-form" onSubmit={handleSubmit} style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row',
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: '15px',
      borderBottom: `1px solid ${Colors.DARK_GRAY3}`,
      paddingBottom: '10px',
      gap: '15px',
      flexWrap: 'wrap'
    }}>
      <div style={{
        display: 'flex', 
        flexDirection: 'row',
        alignItems: 'center', 
        gap: '15px'
      }}>
        <h3 id="form-title" style={{ margin: 0 }}>{titleText}</h3>

      </div>
      {hasInitialCalibration && <Button
            id="collapse-form-button"
            small
            icon="small-cross"
            onClick={() => hasInitialCalibration && setInputCollapsed && setInputCollapsed(true)}
          />}
    </div>
      {/* General error callout removed in favor of field-specific errors */}
      
      <FormGroup
        label={
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Conventional Radiocarbon Age (¹⁴C years BP)</span>
            <Tooltip content="Enter the uncalibrated radiocarbon age in years Before Present (BP, with present = 1950)">
              <Icon icon="info-sign" style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
        }
        labelFor="radiocarbon-age"
        labelInfo="(required)"
        intent={errors.radiocarbon_age ? Intent.DANGER : debouncingFields.radiocarbon_age ? Intent.PRIMARY : Intent.NONE}
        helperText={errors.radiocarbon_age || (debouncingFields.radiocarbon_age ? "Processing input..." : "")}
      >
        <NumericInput
          id="radiocarbon-age"
          min={0}
          max={55000}
          value={radiocarbon_age}
          placeholder="e.g., 3000"
          onValueChange={handleRadioAgeChange}
          onKeyDown={handleKeyDown}
          buttonPosition="none"
          fill
          disabled={isLoading || !dataLoaded}
          intent={errors.radiocarbon_age ? Intent.DANGER : debouncingFields.radiocarbon_age ? Intent.PRIMARY : Intent.NONE}
        />
      </FormGroup>
      
      <FormGroup
        label={
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Measurement Uncertainty (± years)</span>
            <Tooltip content="Enter the standard deviation or error term of the radiocarbon measurement">
              <Icon icon="info-sign" style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
        }
        labelFor="uncertainty"
        labelInfo="(required)"
        intent={errors.uncertainty ? Intent.DANGER : debouncingFields.uncertainty ? Intent.PRIMARY : Intent.NONE}
        helperText={errors.uncertainty || (debouncingFields.uncertainty ? "Processing input..." : "")}
      >
        <NumericInput
          id="uncertainty"
          min={1}
          max={50000}
          value={uncertainty}
          placeholder="e.g., 300"
          onValueChange={handleUncertaintyChange}
          onKeyDown={handleKeyDown}
          buttonPosition="none"
          fill
          disabled={isLoading || !dataLoaded}
          intent={errors.uncertainty ? Intent.DANGER : debouncingFields.uncertainty ? Intent.PRIMARY : Intent.NONE}
        />
      </FormGroup>
      
      <FormGroup
        label={
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Reservoir Effect Correction (years)</span>
            <Tooltip content="Optional adjustment for samples affected by marine or freshwater reservoir effects. Enter 0 for no correction.">
              <Icon icon="info-sign" style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
        }
        labelFor="reservoir-correction"
        intent={debouncingFields.reservoir_correction ? Intent.PRIMARY : Intent.NONE}
        helperText={debouncingFields.reservoir_correction ? "Processing input..." : ""}
      >
        <NumericInput
          id="reservoir-correction"
          value={reservoir_correction}
          min={0}
          placeholder="e.g., 0"
          onValueChange={handleReservoirChange}
          onKeyDown={handleKeyDown}
          buttonPosition="none"
          fill
          disabled={isLoading || !dataLoaded}
          intent={debouncingFields.reservoir_correction ? Intent.PRIMARY : Intent.NONE}
        />
      </FormGroup>
      
      <FormGroup
        label={
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Calibration Curve</span>
            <Tooltip content="Select the appropriate calibration curve based on your sample's origin and type.">
              <Icon icon="info-sign" style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
        }
        labelFor="calibration-curve"
        helperText={CURVE_METADATA[selectedCurve].description}
      >
        <HTMLSelect
          id="calibration-curve"
          value={selectedCurve}
          onChange={(e) => setSelectedCurve(e.target.value)}
          fill
          disabled={isLoading || !dataLoaded}
          options={[
            { value: CURVE_TYPES.INTCAL20, label: 'IntCal20 (Northern Hemisphere)' },
            { value: CURVE_TYPES.SHCAL20, label: 'SHCal20 (Southern Hemisphere)' },
            { value: CURVE_TYPES.MARINE20, label: 'Marine20 (Marine Samples)' }
          ]}
        />
        <div 
          className="marine-warning-container"
          style={{ 
            marginTop: '8px', 
            maxHeight: selectedCurve === CURVE_TYPES.MARINE20 ? '200px' : '0',
            opacity: selectedCurve === CURVE_TYPES.MARINE20 ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out'
          }}
        >
          <Tag 
            intent={Intent.WARNING} 
            icon="info-sign" 
            fill={true}
            multiline={true}
            style={{ 
              padding: '10px 12px', 
              lineHeight: '1.5',
              display: 'block',
              wordBreak: 'break-word'
            }}
          >
            Marine20 curve includes global marine reservoir effect.
            Local corrections (ΔR) should be applied in Reservoir Correction.
          </Tag>
        </div>
      </FormGroup>
      
      <FormGroup
        label={
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Calendar Range Search Mode</span>
            <Tooltip content="Controls how calendar years are selected for calibration.">
              <Icon icon="info-sign" style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
        }
        labelFor="search-mode"
      >
        <RadioGroup
          id="search-mode"
          selectedValue={searchMode}
          onChange={(e) => {
            // Only trigger a change if we're actually changing the mode
            if (e.target.value !== searchMode) {
              setSearchMode(e.target.value);
              userChangedSearchMode.current = true;
            }
          }}
          disabled={isLoading || !dataLoaded}
          style={{ width: '100%' }}
        >
          <Radio 
            value={SEARCH_MODES.C14_BP} 
            label="Search by ¹⁴C Age"
            labelElement={<div>Search by radiocarbon age</div>}
          />
          {/* <Radio 
            value={SEARCH_MODES.FIXED_RANGE} 
            label="Fixed Range" 
            labelElement={<div>0-12000 BP</div>}
          /> */}
          <Radio 
            value={SEARCH_MODES.FULL_CURVE} 
            label="Full Curve"
            labelElement={<div>0-55000 BP</div>}
          />
        </RadioGroup>
        <div style={{ marginTop: '4px', fontSize: '12px', color: Colors.GRAY4, maxWidth: '100%', wordWrap: 'break-word' }}>
          {searchMode === SEARCH_MODES.C14_BP && 
            "Recommended: Searches by radiocarbon age for accurate detection."}
          {searchMode === SEARCH_MODES.FIXED_RANGE && 
            "Standard 0-12,000 range. May miss matches outside this range."}
          {searchMode === SEARCH_MODES.FULL_CURVE && 
            "Uses entire curve (0-55,000 BP) to find all potential matches."}
        </div>
      </FormGroup>
      
      <div style={{ 
        marginTop: '20px', 
        textAlign: 'center'
      }}>
        <Button 
          id="calibrate-button"
          type="submit" 
          intent={Intent.PRIMARY} 
          large
          rightIcon={hasInitialCalibration ? "tick" : "arrow-right"}
          loading={isLoading}
          disabled={!dataLoaded || isLoading}
          className="calibrate-button"
          onClick={() => hasInitialCalibration && setInputCollapsed && setInputCollapsed(true)}
        >
          {dataLoaded ? 'Calibrate' : 'Loading Calibration Data...'}
        </Button>
      </div>
    </form>
  );
};

export default InputForm;