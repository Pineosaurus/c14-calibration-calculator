import React from 'react';
import { Button, Icon } from "@blueprintjs/core";
import { useNavigate } from 'react-router-dom';

const AppHeader = ({ setIsHelpOpen }) => {
  const navigate = useNavigate();
  
  const goToHome = () => {
    // Clear URL parameters 
    window.history.pushState({}, '', '/');
    
    // Reload the page to reset all state
    window.location.reload();
  };

  return (
    <div 
      id="app-header"
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}
    >
      <h1 
        id="app-title"
        style={{ 
          color: 'white', 
          margin: 0,
          cursor: 'pointer'
        }}
        onClick={goToHome}
      >
        <Icon icon={"tree"} size={32}/> Radiocarbon (¹⁴C) Calibration Tool
      </h1>
      <Button 
        id="help-button"
        intent="primary" 
        icon="help" 
        onClick={() => setIsHelpOpen(true)}
        className="help-button"
      >
        <span className="help-text">Help & Documentation</span>
        <span className="help-text-mobile">Help</span>
      </Button>
    </div>
  );
};

export default AppHeader;