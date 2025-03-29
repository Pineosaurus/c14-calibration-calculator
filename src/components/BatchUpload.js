import React, { useState } from 'react';
import { 
  FormGroup, 
  FileInput, 
  Button, 
  Intent, 
  Card, 
  Callout, 
  H5, 
  Collapse,
  Tag,
  HTMLSelect
} from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CURVE_TYPES } from '../data-loader';
import { SEARCH_MODES } from './inputs/InputForm';

/**
 * Component for batch uploading and processing radiocarbon dates
 */
const BatchUpload = ({ onCalibrateBatch, isLoading, dataLoaded }) => {
  const [file, setFile] = useState(null);
  const [fileParseError, setFileParseError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [defaultCurve, setDefaultCurve] = useState(CURVE_TYPES.INTCAL20);
  const [defaultSearchMode, setDefaultSearchMode] = useState(SEARCH_MODES.C14_BP);
  const [defaultReservoirCorrection, setDefaultReservoirCorrection] = useState(0);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileParseError(null);
    setParsedData(null);
    
    if (selectedFile) {
      parseFile(selectedFile);
    }
  };

  // Parse uploaded file (CSV or XLSX)
  const parseFile = (file) => {
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: handleParsedData,
        error: (error) => {
          setFileParseError(`Error parsing CSV: ${error}`);
        }
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          handleParsedData({ data: jsonData });
        } catch (error) {
          setFileParseError(`Error parsing Excel file: ${error.message}`);
        }
      };
      reader.onerror = () => {
        setFileParseError('Error reading file');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileParseError('Unsupported file format. Please upload a CSV or Excel (XLSX/XLS) file.');
    }
  };

  // Process the parsed data and validate format
  const handleParsedData = (result) => {
    if (!result.data || result.data.length === 0) {
      setFileParseError('No data found in the file');
      return;
    }

    // Check for required columns
    const firstRow = result.data[0];
    const hasRadiocarbonAge = 'radiocarbon_age' in firstRow || 'age' in firstRow || 'c14_age' in firstRow;
    const hasUncertainty = 'uncertainty' in firstRow || 'error' in firstRow || 'standard_deviation' in firstRow;
    
    if (!hasRadiocarbonAge || !hasUncertainty) {
      setFileParseError(
        'File format is invalid. Required columns: radiocarbon_age/age/c14_age and uncertainty/error/standard_deviation'
      );
      return;
    }

    // Map data to standard format
    const standardizedData = result.data.map((row) => {
      // Extract values with different possible column names
      const radiocarbon_age = 
        parseFloat(row.radiocarbon_age) || 
        parseFloat(row.age) || 
        parseFloat(row.c14_age) || 
        null;
      
      const uncertainty = 
        parseFloat(row.uncertainty) || 
        parseFloat(row.error) || 
        parseFloat(row.standard_deviation) || 
        null;
      
      const reservoir_correction = 
        parseFloat(row.reservoir_correction) || 
        parseFloat(row.reservoir) || 
        parseFloat(row.marine_correction) || 
        null;
      
      const curve = row.curve || row.calibration_curve || null;
      const sample_id = row.id || row.sample_id || row.name || `Sample ${result.data.indexOf(row) + 1}`;
      
      return {
        sample_id,
        radiocarbon_age,
        uncertainty,
        reservoir_correction: reservoir_correction !== null ? reservoir_correction : null,
        curve: curve || null,
        // Store original row for reference
        original_data: row
      };
    });

    // Validate data
    const validatedData = standardizedData.filter(row => {
      return (
        row.radiocarbon_age !== null && 
        !isNaN(row.radiocarbon_age) && 
        row.uncertainty !== null && 
        !isNaN(row.uncertainty) &&
        row.radiocarbon_age > 0 &&
        row.uncertainty > 0
      );
    });

    if (validatedData.length === 0) {
      setFileParseError('No valid data found after parsing');
      return;
    }

    setParsedData(validatedData);
    setPreviewExpanded(true);
  };

  // Submit batch for calibration
  const handleSubmit = () => {
    if (!parsedData || parsedData.length === 0) {
      setFileParseError('No valid data to calibrate');
      return;
    }

    // Prepare data for calibration with defaults where needed
    const calibrationData = parsedData.map(item => ({
      sample_id: item.sample_id,
      radiocarbon_age: item.radiocarbon_age,
      uncertainty: item.uncertainty,
      reservoir_correction: item.reservoir_correction !== null ? item.reservoir_correction : defaultReservoirCorrection,
      curve: item.curve || defaultCurve,
      search_mode: defaultSearchMode,
      original_data: item.original_data
    }));

    onCalibrateBatch(calibrationData);
  };

  return (
    <div>
      <Card elevation={1} style={{ marginBottom: '20px', backgroundColor: Colors.LIGHT_GRAY5 }}>
        <H5>Batch Calibration</H5>
        
        <FormGroup 
          label="Upload Data File" 
          helperText="Upload a CSV or Excel file with radiocarbon dates to calibrate in batch"
        >
          <FileInput
            text={file ? file.name : "Choose file..."}
            onInputChange={handleFileChange}
            disabled={isLoading || !dataLoaded}
            inputProps={{ accept: ".csv,.xlsx,.xls" }}
            fill
          />
        </FormGroup>

        {fileParseError && (
          <Callout intent={Intent.DANGER} title="File Error" style={{ marginBottom: '15px' }}>
            {fileParseError}
          </Callout>
        )}

        {parsedData && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <Button 
                minimal 
                icon={previewExpanded ? "caret-down" : "caret-right"} 
                onClick={() => setPreviewExpanded(!previewExpanded)}
              >
                {`Preview Data (${parsedData.length} samples)`}
              </Button>
              
              <Collapse isOpen={previewExpanded}>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '10px', marginBottom: '10px' }}>
                  <table className="bp4-html-table bp4-html-table-striped bp4-html-table-condensed bp4-interactive">
                    <thead>
                      <tr>
                        <th>Sample ID</th>
                        <th>¹⁴C Age (BP)</th>
                        <th>Uncertainty (±)</th>
                        <th>Reservoir Correction</th>
                        <th>Curve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.sample_id}</td>
                          <td>{row.radiocarbon_age}</td>
                          <td>{row.uncertainty}</td>
                          <td>{row.reservoir_correction !== null ? row.reservoir_correction : '—'}</td>
                          <td>{row.curve || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapse>
            </div>

            <Card style={{ marginBottom: '20px', backgroundColor: Colors.LIGHT_GRAY4 }}>
              <H5>Default Settings</H5>
              <p style={{ fontSize: '13px', marginBottom: '15px', color: Colors.DARK_GRAY1 }}>
                These settings will be used for any samples missing specific values.
              </p>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <FormGroup label="Default Calibration Curve" style={{ minWidth: '200px', flex: 1 }}>
                  <HTMLSelect
                    value={defaultCurve}
                    onChange={e => setDefaultCurve(e.target.value)}
                    options={[
                      { value: CURVE_TYPES.INTCAL20, label: 'IntCal20 (Northern Hemisphere)' },
                      { value: CURVE_TYPES.SHCAL20, label: 'SHCal20 (Southern Hemisphere)' },
                      { value: CURVE_TYPES.MARINE20, label: 'Marine20 (Marine Samples)' }
                    ]}
                    fill
                  />
                </FormGroup>
                
                <FormGroup label="Default Reservoir Correction" style={{ minWidth: '200px', flex: 1 }}>
                  <HTMLSelect
                    value={defaultReservoirCorrection}
                    onChange={e => setDefaultReservoirCorrection(parseInt(e.target.value))}
                    options={[
                      { value: 0, label: 'None (0 years)' },
                      { value: 400, label: 'Standard Marine (400 years)' },
                      { value: 300, label: 'Freshwater (300 years)' }
                    ]}
                    fill
                  />
                </FormGroup>
                
                <FormGroup label="Search Mode" style={{ minWidth: '200px', flex: 1 }}>
                  <HTMLSelect
                    value={defaultSearchMode}
                    onChange={e => setDefaultSearchMode(e.target.value)}
                    options={[
                      { value: SEARCH_MODES.C14_BP, label: 'By ¹⁴C Age' },
                      { value: SEARCH_MODES.FIXED_RANGE, label: 'Fixed Range (0-12000 BP)' },
                      { value: SEARCH_MODES.FULL_CURVE, label: 'Full Curve' }
                    ]}
                    fill
                  />
                </FormGroup>
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button 
                intent={Intent.PRIMARY}
                large
                onClick={handleSubmit}
                disabled={isLoading || !dataLoaded}
                loading={isLoading}
                icon="send-to"
              >
                Calibrate {parsedData.length} Samples
              </Button>
            </div>
          </>
        )}

        {!parsedData && (
          <div style={{ marginTop: '15px' }}>
            <Tag icon="info-sign" fill large style={{ marginBottom: '10px' }}>
              Expected CSV/Excel Format:
            </Tag>
            <div style={{ fontSize: '12px', marginBottom: '10px' }}>
              Your file should include the following columns:
              <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                <li><strong>radiocarbon_age</strong> or <strong>age</strong> or <strong>c14_age</strong>: The radiocarbon age in years BP (required)</li>
                <li><strong>uncertainty</strong> or <strong>error</strong> or <strong>standard_deviation</strong>: Measurement uncertainty (required)</li>
                <li><strong>sample_id</strong> or <strong>id</strong> or <strong>name</strong>: Sample identifier (optional)</li>
                <li><strong>reservoir_correction</strong> or <strong>reservoir</strong>: Reservoir effect correction (optional)</li>
                <li><strong>curve</strong> or <strong>calibration_curve</strong>: Calibration curve to use (optional)</li>
              </ul>
            </div>
            
            <Button 
              minimal 
              icon="document-open" 
              onClick={() => window.open("/example-batch-format.csv")}
            >
              Download Example CSV
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BatchUpload;