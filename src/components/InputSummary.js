import React from 'react';
import { Button, Tag } from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';

const InputSummary = ({ calibrationResults, handleEditInputs, windowWidth }) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      marginTop: windowWidth < 500 ? '10px' : '0'
    }}>
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: Colors.LIGHT_GRAY1,
          borderRadius: '3px',
          padding: '6px 10px',
          cursor: 'pointer',
          border: '1px solid rgba(19, 124, 189, 0.6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={handleEditInputs}
      >
        {/* Left side with age info */}
        <div style={{ 
          marginRight: '12px',
          fontWeight: 'bold',
          fontSize: '14px',
          color: Colors.BLACK
        }}>
          {calibrationResults.input.radiocarbon_age} ± {calibrationResults.input.uncertainty} BP
          {calibrationResults.input.reservoir_correction > 0 && 
            <span style={{ color: Colors.DARK_GRAY2 }}> (R: {calibrationResults.input.reservoir_correction}y)</span>
          }
          <Tag minimal round style={{ 
            marginLeft: '5px', 
            fontSize: '12px',
            backgroundColor: 'rgba(16, 43, 64, 0.25)',
            color: Colors.BLACK,
            fontWeight: 'bold'
          }}>
            {calibrationResults.input.curve}
          </Tag>
          {calibrationResults.input.search_mode && (
            <Tag minimal round style={{ 
              marginLeft: '5px', 
              fontSize: '11px',
              backgroundColor: 'rgba(16, 43, 64, 0.15)',
              color: Colors.DARK_GRAY1,
              fontWeight: 'normal'
            }}>
              {calibrationResults.input.search_mode === 'c14_bp' ? 'C14 Search' : 
               calibrationResults.input.search_mode === 'full_curve' ? 'Full Curve' : 'Fixed Range'}
            </Tag>
          )}
        </div>
        
        {/* Edit button */}
        <Button
          small
          icon="edit"
          text="Edit"
          intent="primary"
          style={{ 
            minHeight: '20px',
            padding: '0 8px',
            minWidth: '50px',
            fontWeight: 'bold',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}
        />
      </div>
    </div>
  );
};

export default InputSummary;