import React, { useRef } from 'react';
import { Divider, H3, H5, Tag, Card, Callout } from "@blueprintjs/core";
import { Colors } from '@blueprintjs/colors';
import CalibrationChart from '../graphs/CalibrationChart';

const CalibrationResults = ({ results, hideInputParams = false, hideHeader = false }) => {
  const resultsRef = useRef(null);
  const {
    input,
    calibrated_years_BP,
    // calendar_year,
    range_1sigma,
    range_2sigma,
    hpd68_ranges,
    hpd95_ranges,
    distribution,
    curveMetadata
  } = results;

  const formatCalendarYear = (yearsBP) => {
    const yearAD = 1950 - yearsBP;
    return yearAD < 0 ? Math.abs(yearAD) + " BCE" : yearAD + " CE";
  };

  // Helper to display HPD ranges in a readable format
  const formatRanges = (ranges) => {
    if (!ranges || ranges.length === 0) return 'No ranges available';

    if (ranges.length === 1) {
      // Single range
      return `${formatCalendarYear(ranges[0].max)} to ${formatCalendarYear(ranges[0].min)}`;
    } else {
      // Multiple ranges - return a formatted list
      return (
        <div style={{ marginTop: '5px' }}>
          {ranges.map((range, i) => (
            <div key={i} style={{ marginLeft: '15px', marginBottom: '3px' }}>
              Range {i + 1}: {formatCalendarYear(range.max)} to {formatCalendarYear(range.min)}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div id="calibration-results" className="results-content" ref={resultsRef}>
      {!hideHeader && (
        <div id="results-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '15px',
          borderBottom: `1px solid ${Colors.DARK_GRAY3}`,
          paddingBottom: '10px'
        }}>
          <H3 style={{ margin: 0 }}>Calibration Results</H3>
        </div>
      )}

      {/* Probability Distribution Chart - Above the fold */}
      <div style={{ marginBottom: '25px' }}>
        <div id="chart-container" className="chart-container" style={{
          height: '450px',
          backgroundColor: 'rgba(17, 20, 24, 0.1)',
          borderRadius: '3px',
          padding: '15px',
          boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)'
        }}>
          <CalibrationChart
            distribution={distribution}
            hpd68={hpd68_ranges}
            hpd95={hpd95_ranges}
            calibratedYearsBP={calibrated_years_BP}
            c14AgeBP={input.radiocarbon_age}
            uncertainty={input.uncertainty}
          />
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '12px',
          color: Colors.GRAY2,
          fontStyle: 'italic'
        }}>
          Toggle between "Probability" (standard view) and "Calibration Curve (OxCal Style)" for different visualizations
        </div>
      </div>

      <Divider />

      <div id="probability-ranges" style={{ margin: '20px 0' }}>
        <H5 style={{ marginBottom: '10px' }}>Result Summary</H5>

        {/* Maximum Probability Age */}
        <Callout
          id="max-probability"
          title="Maximum Probability Age"
          icon="timeline-events"
          style={{ marginBottom: '20px' }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
            {calibrated_years_BP} BP ({formatCalendarYear(calibrated_years_BP)})
          </div>
          <div style={{ fontSize: '12px', color: Colors.GRAY2 }}>
            Based on the calibration, this is the most likely age of the dated material.
          </div>
        </Callout>

        {/* Overall Ranges */}
        <Card id="overall-ranges" style={{ backgroundColor: Colors.LIGHT_GRAY5, marginBottom: '20px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Overall range (1-sigma):</strong>{" "}
            {formatCalendarYear(range_1sigma.max)} – {formatCalendarYear(range_1sigma.min)}
          </div>
          <div>
            <strong>Overall range (2-sigma):</strong>{" "}
            {formatCalendarYear(range_2sigma.max)} – {formatCalendarYear(range_2sigma.min)}
          </div>
        </Card>

        {/* Confidence Intervals */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

          {/* 1-sigma */}
          <Callout
            id="probability-1sigma"
            icon="endorsed"
            title="68.2% Probability (1σ)"
            intent="primary"
            style={{ flex: '1 1 300px' }}
          >
            {formatRanges(hpd68_ranges || [
              { min: range_1sigma.min, max: range_1sigma.max }
            ])}
          </Callout>

          {/* 2-sigma */}
          <Callout
            id="probability-2sigma"
            icon="endorsed"
            title="95.4% Probability (2σ)"
            intent="none"
            style={{ flex: '1 1 300px' }}
          >
            {formatRanges(hpd95_ranges || [
              { min: range_2sigma.min, max: range_2sigma.max }
            ])}
          </Callout>

        </div>
      </div>

      {!hideInputParams && (
        <>
          <Divider />
          <div style={{ marginTop: '20px' }}>
            <H5>Input Parameters:</H5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <Tag large>Radiocarbon Age: {input.radiocarbon_age} ± {input.uncertainty} BP</Tag>
              {input.reservoir_correction > 0 && (
                <Tag large>Reservoir Correction: {input.reservoir_correction} years</Tag>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '12px', marginTop: '30px', color: Colors.GRAY2 }}>
        <div>* Calibration based on {curveMetadata.fullName} dataset.</div>
        <div style={{ marginTop: '4px' }}>
          <strong>Citation:</strong> {curveMetadata.citation}
        </div>
      </div>

    </div>
  );
};

export default CalibrationResults;