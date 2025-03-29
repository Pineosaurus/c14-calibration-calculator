import React, { useState } from 'react';
import { Card, Spinner, Intent, Tabs, Tab } from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';
import InputForm from './inputs/InputForm';
import CalibrationResults from './results/CalibrationResults';
import BatchCalibrationResults from './results/BatchCalibrationResults';
import BatchUpload from './BatchUpload';
import ResultsHeader from './ResultsHeader';

const MainContent = ({
  dataLoaded,
  isLoading,
  calibrationResults,
  batchResults,
  isBatchMode,
  inputCollapsed,
  windowWidth,
  inputFormRef,
  handleCalibrate,
  handleCalibrateBatch,
  initialParamValues,
  hasInitialCalibration,
  setInputCollapsed,
  handleEditInputs,
  AppToaster,
  exportCalibrationToPDF
}) => {
  const [selectedTabId, setSelectedTabId] = useState("single");
  // No need to track debouncing status now
  // Processing overlay component
  const ProcessingOverlay = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '3px',
      flexDirection: 'column'
    }}>
      <Spinner size={40} intent={Intent.PRIMARY} />
      <div style={{ marginTop: '15px', color: 'white', fontWeight: 'bold' }}>
        Calibrating...
      </div>
    </div>
  );

  // Initial data loading indicator
  if (!dataLoaded && isLoading) {
    return (
      <Card style={{ marginBottom: '20px', textAlign: 'center', padding: '40px' }}>
        <Spinner size={50} intent={Intent.PRIMARY} />
        <div style={{ marginTop: '20px', color: Colors.GRAY1 }}>
          Loading calibration data...
        </div>
      </Card>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: (!inputCollapsed && calibrationResults && windowWidth >= 700) ? 'row' : 'column',
      gap: '20px',
      transition: 'all 0.4s ease-in-out',
      position: 'relative',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Processing overlay - only show when loading calibration, not when debouncing */}
      {isLoading && dataLoaded && <ProcessingOverlay />}
      
      {/* Input Section - Only show full form when editing */}
      {!inputCollapsed && (
        <Card style={{ 
          position: 'relative',
          minHeight: '60px',
          width: ((calibrationResults || batchResults) && windowWidth >= 700) ? '35%' : 
                  (windowWidth < 500 ? '100%' : '500px'),
          maxWidth: '100%',
          margin: (!calibrationResults && !batchResults) ? '0 auto' : '0',
          flex: ((calibrationResults || batchResults) && windowWidth >= 700) ? '0 0 35%' : '0 0 auto',
          alignSelf: 'flex-start',
          transition: 'all 0.5s ease-in-out',
          animation: (calibrationResults || batchResults) ? 'slideInFromLeft 0.4s ease-in-out' : 'fadeIn 0.4s ease-in-out'
        }}>
          <div className="input-container">
            {/* Tabs for Single and Batch Input */}
            <Tabs
              id="inputTabs"
              selectedTabId={selectedTabId}
              onChange={setSelectedTabId}
              renderActiveTabPanelOnly={true}
            >
              <Tab 
                id="single" 
                title="Single Sample" 
                panel={
                  <div 
                    ref={inputFormRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      transition: 'height 0.3s ease-in-out'
                    }}
                  >
                    <InputForm 
                      onCalibrate={handleCalibrate} 
                      initialValues={calibrationResults?.input || initialParamValues}
                      hasInitialCalibration={hasInitialCalibration}
                      isLoading={isLoading}
                      dataLoaded={dataLoaded}
                      setInputCollapsed={setInputCollapsed}
                    />
                  </div>
                } 
              />
              <Tab 
                id="batch" 
                title="Batch Upload" 
                panel={
                  <BatchUpload 
                    onCalibrateBatch={handleCalibrateBatch}
                    isLoading={isLoading}
                    dataLoaded={dataLoaded}
                  />
                } 
              />
            </Tabs>
          </div>
        </Card>
      )}
      
      {/* Single Results section - Hidden when editing on small screens */}
      {calibrationResults && !isBatchMode && (windowWidth >= 700 || inputCollapsed) && (
        <Card style={{ 
          width: (!inputCollapsed && windowWidth >= 700) ? '65%' : '100%',
          flex: (!inputCollapsed && windowWidth >= 700) ? '1' : '1',
          opacity: 1,
          transition: 'all 0.4s ease-in-out',
          animation: !inputCollapsed ? 'slideInFromRight 0.4s ease-in-out' : 'fadeIn 0.4s ease-in-out'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Results header with input summary */}
            <ResultsHeader 
              calibrationResults={{...calibrationResults, exportToPDF: () => exportCalibrationToPDF(calibrationResults)}}
              inputCollapsed={inputCollapsed}
              handleEditInputs={handleEditInputs}
              windowWidth={windowWidth}
              AppToaster={AppToaster}
            />
            
            {/* Rest of the calibration results */}
            <CalibrationResults 
              results={calibrationResults} 
              hideInputParams={true}
              hideHeader={true}
            />
          </div>
        </Card>
      )}
      
      {/* Batch Results section */}
      {batchResults && isBatchMode && (windowWidth >= 700 || inputCollapsed) && (
        <Card style={{ 
          width: (!inputCollapsed && windowWidth >= 700) ? '65%' : '100%',
          flex: (!inputCollapsed && windowWidth >= 700) ? '1' : '1',
          opacity: 1,
          transition: 'all 0.4s ease-in-out',
          animation: !inputCollapsed ? 'slideInFromRight 0.4s ease-in-out' : 'fadeIn 0.4s ease-in-out'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Batch results with their own header */}
            <BatchCalibrationResults results={batchResults} />
            
            {/* Edit inputs button */}
            {/* <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                className="bp4-button" 
                onClick={handleEditInputs}
              >
                Edit Inputs
              </button>
            </div> */}
          </div>
        </Card>
      )}
      
      {/* No placeholder needed - let the input form speak for itself */}
    </div>
  );
};

export default MainContent;