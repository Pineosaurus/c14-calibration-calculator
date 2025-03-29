import React from 'react';
import { Callout, Intent } from "@blueprintjs/core";

const AppMessages = ({ dataLoadError, calibrationError, usingSimulatedData }) => {
  return (
    <>
      {/* Data loading error message */}
      {dataLoadError && (
        <Callout
          intent={Intent.DANGER}
          title="Data Loading Error"
          style={{ marginBottom: '20px' }}
        >
          {dataLoadError}
        </Callout>
      )}
      
      {/* Calibration error message */}
      {calibrationError && (
        <Callout
          intent={Intent.DANGER}
          title="Calibration Error"
          style={{ marginBottom: '20px' }}
        >
          {calibrationError}
        </Callout>
      )}
      
      {usingSimulatedData && (
        <Callout
          intent={Intent.WARNING}
          title="Using Simulated Calibration Data"
          style={{ marginBottom: '20px' }}
          icon="warning-sign"
        >
          <p>
            The application is currently using simulated calibration data because one or more of the real calibration curves 
            could not be loaded. While still functional for demonstration purposes, calibration results 
            will not be as accurate as with the official IntCal20, SHCal20, and Marine20 datasets.
          </p>
          <p style={{ marginTop: '10px', fontSize: '0.9em' }}>
            Please ensure that you have the calibration data files in the root directory or try refreshing the page.
          </p>
        </Callout>
      )}
    </>
  );
};

export default AppMessages;