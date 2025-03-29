import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  H3, 
  H5, 
  Tabs, 
  Tab, 
  Callout, 
  Divider, 
  Tag, 
  HTMLTable, 
  Collapse,
  Tooltip,
  Icon,
  Intent,
  Colors,
  ButtonGroup
} from "@blueprintjs/core";
import CalibrationResults from './CalibrationResults';
import { exportAllResults, exportResultsAsCSV, formatCalendarYear } from '../../utils/batch-pdf-export';
import { updateQueryParams } from '../../utils/queryParams';

const BatchCalibrationResults = ({ results }) => {
  const [activeTabId, setActiveTabId] = useState('summary');
  const [selectedSample, setSelectedSample] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  // Toggle detailed view for a specific sample
  const toggleRowDetails = (sampleId) => {
    setExpandedRows(prev => ({
      ...prev,
      [sampleId]: !prev[sampleId]
    }));
  };

  // Create summary statistics for all results
  const createSummary = () => {
    if (!results || results.length === 0) return null;

    const earliestSample = [...results].sort((a, b) => a.calibrated_years_BP - b.calibrated_years_BP)[0];
    const latestSample = [...results].sort((a, b) => b.calibrated_years_BP - a.calibrated_years_BP)[0];
    
    return (
      <div>
        <Callout title="Batch Summary" intent={Intent.PRIMARY} style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <Card style={{ backgroundColor: Colors.LIGHT_GRAY4, flex: '1 1 240px' }}>
              <h4 style={{ color: Colors.DARK_GRAY1, marginTop: '5px' }}>Total Samples</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: Colors.DARK_GRAY1 }}>{results.length}</div>
            </Card>
            
            <Card style={{ backgroundColor: Colors.LIGHT_GRAY4, flex: '1 1 240px' }}>
              <h4 style={{ color: Colors.DARK_GRAY1, marginTop: '5px' }}>Earliest Date</h4>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: Colors.DARK_GRAY1 }}>
                {earliestSample.calibrated_years_BP} BP
              </div>
              <div style={{ color: Colors.GRAY1 }}>Sample: {earliestSample.input.sample_id}</div>
            </Card>
            
            <Card style={{ backgroundColor: Colors.LIGHT_GRAY4, flex: '1 1 240px' }}>
              <h4 style={{ color: Colors.DARK_GRAY1, marginTop: '5px' }}>Latest Date</h4>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: Colors.DARK_GRAY1 }}>
                {latestSample.calibrated_years_BP} BP
              </div>
              <div style={{ color: Colors.GRAY1 }}>Sample: {latestSample.input.sample_id}</div>
            </Card>
          </div>
        </Callout>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '10px' }}>
        <Button 
            intent={Intent.SUCCESS} 
            icon="th" 
            onClick={() => exportResultsAsCSV(results)}
          >
            Export as CSV
          </Button>

          <Button 
            intent={Intent.PRIMARY} 
            icon="document" 
            onClick={() => exportAllResults(results)}
          >
            Export as PDF
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="batch-results-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '15px',
        borderBottom: `1px solid ${Colors.DARK_GRAY3}`,
        paddingBottom: '10px'
      }}>
        <H3 style={{ margin: 0 }}>Batch Calibration Results</H3>
      </div>
      
      <Tabs 
        id="BatchResultsTabs" 
        selectedTabId={activeTabId} 
        onChange={setActiveTabId}
        renderActiveTabPanelOnly={true}
      >
        <Tab 
          id="summary" 
          title="Summary" 
          panel={
            <div style={{ padding: '10px 0' }}>
              {createSummary()}
              
              <H5>Results Table</H5>
              <div style={{ overflowX: 'auto' }}>
                <HTMLTable interactive striped style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Sample ID</th>
                      <th>¹⁴C Age (BP)</th>
                      <th>Uncertainty (±)</th>
                      <th>Curve</th>
                      <th>Calibrated (BP)</th>
                      <th>Calendar Date</th>
                      <th>68.2% Range (1σ)</th>
                      <th>95.4% Range (2σ)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <React.Fragment key={index}>
                        <tr onClick={() => toggleRowDetails(result.input.sample_id)}>
                          <td>{result.input.sample_id}</td>
                          <td>{result.input.radiocarbon_age}</td>
                          <td>{result.input.uncertainty}</td>
                          <td>
                            <Tooltip content={result.curveMetadata.fullName}>
                              <span>{result.curveMetadata.name}</span>
                            </Tooltip>
                          </td>
                          <td>{result.calibrated_years_BP}</td>
                          <td>{formatCalendarYear(result.calibrated_years_BP)}</td>
                          <td>
                            {formatCalendarYear(result.range_1sigma.max)} to {formatCalendarYear(result.range_1sigma.min)}
                          </td>
                          <td>
                            {formatCalendarYear(result.range_2sigma.max)} to {formatCalendarYear(result.range_2sigma.min)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <Button 
                                small 
                                minimal 
                                icon={expandedRows[result.input.sample_id] ? "caret-up" : "caret-down"} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRowDetails(result.input.sample_id);
                                }}
                              />
                              <Tooltip content="Open in new tab with shareable link">
                                <Button 
                                  small 
                                  minimal 
                                  icon="document-open" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Create a URL with the sample's calibration parameters
                                    const shareableParams = {
                                      radiocarbon_age: result.input.radiocarbon_age,
                                      uncertainty: result.input.uncertainty,
                                      reservoir_correction: result.input.reservoir_correction || 0,
                                      curve: result.input.curve,
                                      search_mode: result.input.search_mode
                                    };
                                    
                                    // Create URL with parameters
                                    const params = new URLSearchParams();
                                    params.set('age', shareableParams.radiocarbon_age);
                                    params.set('uncertainty', shareableParams.uncertainty);
                                    if (shareableParams.reservoir_correction > 0) params.set('reservoir', shareableParams.reservoir_correction);
                                    params.set('curve', shareableParams.curve);
                                    params.set('mode', shareableParams.search_mode);
                                    
                                    // Open in new tab
                                    const url = `${window.location.origin}?${params.toString()}`;
                                    window.open(url, '_blank');
                                  }}
                                />
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="9" style={{ padding: 0 }}>
                            <Collapse isOpen={expandedRows[result.input.sample_id]}>
                              <div 
                                style={{ padding: '15px' }} 
                                data-sample-id={result.input.sample_id}
                              >
                                <CalibrationResults 
                                  results={result} 
                                  hideHeader={true} 
                                  hideInputParams={false}
                                />
                              </div>
                            </Collapse>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </HTMLTable>
              </div>
            </div>
          } 
        />
      </Tabs>
    </div>
  );
};

export default BatchCalibrationResults;