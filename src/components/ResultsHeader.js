import React from 'react';
import { Button, Intent } from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';
import InputSummary from './InputSummary';

const ResultsHeader = ({ 
  calibrationResults, 
  inputCollapsed, 
  handleEditInputs, 
  windowWidth,
  AppToaster 
}) => {
  return (
    <div 
      id="results-header"
      style={{ 
        display: 'flex', 
        flexDirection: windowWidth < 700 ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: windowWidth < 700 ? 'flex-start' : 'center', 
        marginBottom: '15px',
        borderBottom: `1px solid ${Colors.DARK_GRAY3}`,
        paddingBottom: '10px',
        gap: windowWidth < 700 ? '15px' : '0'
      }}>
      <div style={{
        display: 'flex', 
        flexDirection: windowWidth < 500 ? 'column' : 'row',
        alignItems: windowWidth < 500 ? 'flex-start' : 'center', 
        gap: '15px'
      }}>
        <h3 style={{ margin: 0 }}>Calibration Results</h3>
        
        {/* Input Summary (only when collapsed/viewing results) */}
        {inputCollapsed && (
          <InputSummary 
            calibrationResults={calibrationResults} 
            handleEditInputs={handleEditInputs} 
            windowWidth={windowWidth} 
          />
        )}
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: windowWidth < 700 ? 'column' : 'row',
        alignItems: windowWidth < 700 ? 'flex-start' : 'center',
        gap: '10px',
        marginTop: windowWidth < 700 ? '5px' : '0'
      }}>
        <div style={{ 
          display: 'flex',
          gap: '5px' 
        }}>
          <Button
            small
            icon="share"
            text="Share"
            onClick={() => {
              // Create shareable URL
              const params = new URLSearchParams();
              const input = calibrationResults.input;
              params.set('age', input.radiocarbon_age);
              params.set('uncertainty', input.uncertainty);
              if (input.reservoir_correction > 0) params.set('reservoir', input.reservoir_correction);
              params.set('curve', input.curve);
              
              // Add search mode to the shared URL
              if (input.search_mode) {
                params.set('mode', input.search_mode);
              }
              
              const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
              
              // Try to use clipboard API
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl)
                  .then(() => {
                    // Show success toast notification
                    AppToaster.show({
                      message: "Shareable link copied to clipboard!",
                      intent: Intent.SUCCESS,
                      icon: "tick",
                      timeout: 3000
                    });
                  })
                  .catch(err => {
                    console.error('Failed to copy link: ', err);
                    // Fallback to prompt
                    prompt('Copy this link to share your calibration:', shareUrl);
                  });
              } else {
                // Fallback for browsers without clipboard API
                prompt('Copy this link to share your calibration:', shareUrl);
              }
            }}
          />
          <Button
            small
            icon="export"
            text="PDF"
            onClick={() => calibrationResults.exportToPDF()}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsHeader;