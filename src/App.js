import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FocusStyleManager, Position, Toaster } from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

import HelpDialog from './components/inputs/HelpDialog';
import AppHeader from './components/AppHeader';
import AppMessages from './components/AppMessages';
import MainContent from './components/MainContent';
import Footer from './components/Footer';
import { loadCalibrationData } from './calibration-data';
import { exportCalibrationToPDF } from './utils/pdfExport';
import { parseQueryParams, updateQueryParams } from './utils/queryParams';
import { performCalibration } from './utils/calibration';

// Import packages for file parsing
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Initialize Blueprint.js focus style manager
FocusStyleManager.onlyShowFocusOnTabs();

// Create app-wide toaster
const AppToaster = Toaster.create({
  position: Position.TOP,
});

function App() {
  const [calibrationResults, setCalibrationResults] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [hasInitialCalibration, setHasInitialCalibration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoadError, setDataLoadError] = useState(null);
  const [calibrationError, setCalibrationError] = useState(null);
  const [initialParamValues, setInitialParamValues] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Create a ref for the input form to detect clicks outside of it
  const inputFormRef = useRef(null);
  
  // State to track if we're using simulated data
  const [usingSimulatedData, setUsingSimulatedData] = useState(false);
  
  // State to track window width for responsive layout
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Load calibration data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load calibration data
        const calibrationCurves = await loadCalibrationData();
        
        // Check if any of the curves are using simulated data
        let hasSimulatedData = false;
        
        if (calibrationCurves) {
          // Check each curve for simulated data points
          Object.values(calibrationCurves).forEach(curveData => {
            if (curveData && curveData.length > 0 && curveData.some(point => point.simulated)) {
              hasSimulatedData = true;
            }
          });
        }
        
        // Set state based on whether simulation was used
        setUsingSimulatedData(hasSimulatedData);
        setDataLoaded(true);
        setDataLoadError(null);
        
        // Check for URL query parameters
        const queryParams = parseQueryParams();
        if (queryParams.radiocarbon_age !== null && queryParams.uncertainty !== null) {
          // Store the initial values from URL parameters
          setInitialParamValues(queryParams);
        }
      } catch (error) {
        console.error('Failed to load calibration data:', error);
        setDataLoadError('Failed to load calibration data. Please refresh the page to try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Memoize the calibration handler to prevent unnecessary re-renders
  const handleCalibrate = useCallback(async (inputData) => {
    if (!dataLoaded) {
      setCalibrationError('Calibration data not loaded yet. Please wait.');
      return;
    }
    
    setIsLoading(true);
    setCalibrationError(null);
    
    try {
      // Calculate results
      const results = await performCalibration(inputData);
      
      // We only want to update URL parameters when explicitly sharing, not on every calibration
      // Removed: updateQueryParams(inputData);
      
      // Update state to switch views - transitions are handled by CSS
      setCalibrationResults(results);
      setBatchResults(null); // Reset batch results when doing single calibration
      setIsBatchMode(false);
      
      // Only collapse the input section on initial calibration
      if (!hasInitialCalibration) {
        setInputCollapsed(true);
        setHasInitialCalibration(true);
        
        // We're handling the recalibration in the URL param effect now, 
        // so this is no longer needed
      }
    } catch (error) {
      console.error('Calibration error:', error);
      setCalibrationError(`Calibration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [hasInitialCalibration, dataLoaded]);
  
  // Handle batch calibration for multiple inputs
  const handleCalibrateBatch = useCallback(async (batchData) => {
    if (!dataLoaded) {
      setCalibrationError('Calibration data not loaded yet. Please wait.');
      return;
    }
    
    setIsLoading(true);
    setCalibrationError(null);
    
    try {
      // Process all calibrations sequentially
      const batchResults = [];
      
      for (const item of batchData) {
        // Add a small delay between calibrations to avoid freezing the UI
        if (batchResults.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const result = await performCalibration(item);
        
        // Add sample_id to the result input for reference
        batchResults.push({
          ...result,
          input: {
            ...result.input,
            sample_id: item.sample_id
          }
        });
      }
      
      // Update state to show batch results
      setBatchResults(batchResults);
      setCalibrationResults(null); // Reset single result when doing batch calibration
      setIsBatchMode(true);
      setHasInitialCalibration(true);
      setInputCollapsed(true);
      
    } catch (error) {
      console.error('Batch calibration error:', error);
      setCalibrationError(`Batch calibration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [dataLoaded]);
  
  const handleEditInputs = () => {
    // Simply toggle the collapsed state - transitions are handled by CSS
    setInputCollapsed(false);
  };
  
  // Flag to track initial loading from URL and prevent flickering
  const initialLoadRef = useRef(true);
  
  // Use effect to perform auto-calibration from URL parameters once data is loaded
  useEffect(() => {
    if (dataLoaded && initialParamValues && !hasInitialCalibration) {
      // Just use the original search mode directly without the fixed_range workaround
      // This eliminates the animation issue when opening shared links
      handleCalibrate({
        ...initialParamValues
      });
    }
  }, [dataLoaded, initialParamValues, hasInitialCalibration, handleCalibrate]);
  
  // Listen for window resize events to update layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="bp4-dark" style={{ 
      backgroundColor: Colors.DARK_GRAY3, 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        {/* App Header */}
        <AppHeader setIsHelpOpen={setIsHelpOpen} />
        
        {/* App Messages */}
        <AppMessages 
          dataLoadError={dataLoadError}
          calibrationError={calibrationError}
          usingSimulatedData={usingSimulatedData}
        />
        
        {/* Main Content */}
        {(dataLoaded || !isLoading) && (
          <MainContent
            dataLoaded={dataLoaded}
            isLoading={isLoading && !initialLoadRef.current}
            calibrationResults={calibrationResults}
            batchResults={batchResults}
            isBatchMode={isBatchMode}
            inputCollapsed={inputCollapsed}
            windowWidth={windowWidth}
            inputFormRef={inputFormRef}
            handleCalibrate={handleCalibrate}
            handleCalibrateBatch={handleCalibrateBatch}
            initialParamValues={initialParamValues}
            hasInitialCalibration={hasInitialCalibration}
            setInputCollapsed={setInputCollapsed}
            handleEditInputs={handleEditInputs}
            AppToaster={AppToaster}
            exportCalibrationToPDF={exportCalibrationToPDF}
          />
        )}
        
        {/* Help Dialog */}
        <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default App;