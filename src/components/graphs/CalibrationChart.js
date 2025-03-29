import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ErrorBar,
  Customized
} from 'recharts';
import { Button, ButtonGroup, Tooltip as BpTooltip } from '@blueprintjs/core';
import { Colors } from '@blueprintjs/colors';
import { getCalibrationData } from '../../data-loader';

const CustomVariableWidthLine = ({ xAxisMap, yAxisMap, data }) => {
  if (!data || data.length < 2 || !xAxisMap || !yAxisMap) return null;

  const xScale = xAxisMap[0].scale;
  const yScale = yAxisMap['left'].scale;

  // Upper boundary points (radiocarbon + error)
  const upperPath = data.map((point, idx) => {
    const x = xScale(point.x);
    const y = yScale(point.radiocarbon + point.error);
    return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  // Lower boundary points (radiocarbon - error), reversed for closing the shape
  const lowerPath = data.slice().reverse().map((point) => {
    const x = xScale(point.x);
    const y = yScale(point.radiocarbon - point.error);
    return `L ${x},${y}`;
  }).join(' ');

  const pathD = `${upperPath} ${lowerPath} Z`;

  return (
    <g>
      {/* Uncertainty Area */}
      <path
        d={pathD}
        fill={Colors.ROSE2}
        fillOpacity={0.3}
        stroke="none"
      />

      {/* Center Calibration Line */}
      <path
        d={data.map((point, idx) => {
          const x = xScale(point.x);
          const y = yScale(point.radiocarbon);
          return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ')}
        stroke={Colors.ROSE2}
        strokeWidth={2}
        fill="none"
      />
    </g>
  );
};

const CalibrationChart = ({ distribution, hpd68 = [], hpd95 = [], calibratedYearsBP, c14AgeBP, uncertainty }) => {
  const [showCalibrationCurve, setShowCalibrationCurve] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showBCECE, setShowBCECE] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Decimate distribution data for improved performance when dataset is large
  const optimizedDistribution = useMemo(() => {
    if (!distribution || distribution.length <= 3000) return distribution;
    const threshold = 2000;
    const step = Math.ceil(distribution.length / threshold);
    let decimated = distribution.filter((_, i) => i % step === 0);
    // Ensure the last point is included
    if (decimated[decimated.length - 1] !== distribution[distribution.length - 1]) {
      decimated = [...decimated, distribution[distribution.length - 1]];
    }
    return decimated;
  }, [distribution]);

  // Transition the axis labels without redrawing the chart
  const handleFormatToggle = useCallback(() => {
    setIsTransitioning(true);
    setShowBCECE(prev => {
      const newVal = !prev;
      localStorage.setItem('dateFormat', newVal ? 'BCE/CE' : 'BP');
      return newVal;
    });
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);

  // Track window resizing for responsive design with throttling
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          setWindowWidth(window.innerWidth);
          timeoutId = null;
        }, 150);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dateFormat');
    if (saved) {
      setShowBCECE(saved === 'BCE/CE');
    }
  }, []);

  // Memoize expensive calculations based on distribution
  const { min, max, maxProb, xDomain } = useMemo(() => {
    if (!distribution || !Array.isArray(distribution) || distribution.length === 0) {
      return { min: 0, max: 0, maxProb: 0, xDomain: [0, 0] };
    }

    // Extract min and max from distribution
    const min = Math.min(...distribution.map(d => d.x));
    const max = Math.max(...distribution.map(d => d.x));

    // Find the maximum probability for scaling reference areas
    const maxProb = Math.max(...distribution.map(d => d.y));

    // Fixed view boundaries - no zooming needed for mobile
    const xDomain = [Math.max(0, min - 200), max + 200];

    return { min, max, maxProb, xDomain };
  }, [distribution]);

  // Format the tooltip content - memoized to prevent recreation on each render
  const CustomTooltip = useMemo(() => {
    if (!distribution || !Array.isArray(distribution) || distribution.length === 0) {
      return () => null;
    }

    return ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;

        // Convert BP to calendar year
        const calYear = 1950 - Math.round(data.x);
        const calYearFormatted = calYear < 0
          ? Math.abs(calYear) + " BCE"
          : calYear + " CE";
        const yearDisplay = showBCECE ? calYearFormatted : Math.round(data.x) + " BP";

        // Calculate relative probability (make it more intuitive as a percentage of the max)
        const probPercent = (data.y * 100).toFixed(2);

        return (
          <div style={{
            backgroundColor: 'rgba(38, 50, 56, 0.95)',
            padding: windowWidth < 500 ? '8px' : '12px',
            border: `1px solid ${Colors.BLUE4}`,
            borderRadius: '4px',
            fontSize: windowWidth < 500 ? '11px' : '13px',
            color: 'white',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            minWidth: windowWidth < 500 ? '150px' : '180px'
          }}>
            <div style={{ marginBottom: '6px', borderBottom: `1px solid ${Colors.BLUE4}`, paddingBottom: '6px' }}>
              <strong style={{
                fontSize: windowWidth < 500 ? '13px' : '15px',
                color: Colors.BLUE4
              }}>{yearDisplay}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{showBCECE ? 'Calendar Year:' : 'Calibrated BP:'}</span>
              <span><strong>{showBCECE ? calYearFormatted : Math.round(data.x)}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Probability:</span>
              <span><strong>{probPercent}%</strong></span>
            </div>
            {data.radiocarbon && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>14C Age BP:</span>
                  <span><strong>{Math.round(data.radiocarbon)}</strong></span>
                </div>
                {data.error && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Uncertainty (±1σ):</span>
                    <span><strong>±{Math.round(data.error)}</strong></span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      return null;
    };
  }, [showBCECE, windowWidth, distribution]);


  // Memoize the calibration curve extraction to avoid recalculating on every render
  const calibrationCurve = useMemo(() => {
    const extractCalibrationCurve = () => {
      const calibrationData = getCalibrationData();

      if (!calibrationData || !calibrationData.IntCal20) return [];

      // Extract calibration curve data for our range of interest
      // Reduced buffer for better mobile display
      const bufferYears = 200;
      const rangeMin = Math.max(0, min - bufferYears);
      // No longer limiting to 12000 to support full curve data
      const rangeMax = max + bufferYears;

      return calibrationData.IntCal20
        .filter(point => point.cal_BP >= rangeMin && point.cal_BP <= rangeMax)
        .map(point => ({
          x: point.cal_BP,
          radiocarbon: point.c14_BP,
          error: point.error
        }));
    };

    return extractCalibrationCurve();
  }, [min, max]);

  // Memoize the combined data calculation
  const { combinedData, radiocarbonMin, radiocarbonMax } = useMemo(() => {
    // Optimized merge of calibration curve data with distribution data
    // Create a lookup map for faster access to calibration points
    const calibrationMap = new Map();
    calibrationCurve.forEach(point => {
      calibrationMap.set(point.x, point);
    });

    const combined = optimizedDistribution.map(point => {
      // Try direct lookup first
      const exactMatch = calibrationMap.get(point.x);
      if (exactMatch) {
        return {
          ...point,
          radiocarbon: exactMatch.radiocarbon,
          error: exactMatch.error,
          // Add upper and lower bounds for uncertainty bands
          radiocarbonUpper: exactMatch.radiocarbon + exactMatch.error,
          radiocarbonLower: exactMatch.radiocarbon - exactMatch.error
        };
      }

      // If no exact match, find closest (this is less frequent with the map optimization)
      let closestDiff = Infinity;
      let closest = { x: 0, radiocarbon: 0, error: 0 };

      for (const cal of calibrationCurve) {
        const diff = Math.abs(cal.x - point.x);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = cal;
        }
      }

      return {
        ...point,
        radiocarbon: closest.radiocarbon,
        error: closest.error,
        // Add upper and lower bounds for uncertainty bands
        radiocarbonUpper: closest.radiocarbon + closest.error,
        radiocarbonLower: closest.radiocarbon - closest.error
      };
    });

    const radioMin = Math.min(...calibrationCurve.map(d => d.radiocarbon - d.error)) - 100;
    const radioMax = Math.max(...calibrationCurve.map(d => d.radiocarbon + d.error)) + 100;

    return {
      combinedData: combined,
      radiocarbonMin: radioMin,
      radiocarbonMax: radioMax
    };
  }, [optimizedDistribution, calibrationCurve]);

  // Render the standard probability view - memoized to prevent unnecessary recreation
  const renderProbabilityOnly = useMemo(() => {
    return () => (
      <AreaChart
        data={optimizedDistribution}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={Colors.DARK_GRAY3} opacity={0.6} />
        <defs>
          <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={Colors.CERULEAN4} stopOpacity={0.8} />
            <stop offset="95%" stopColor={Colors.CERULEAN4} stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* X-axis: Calendar years BP */}
        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain}
          reversed={true}
          allowDecimals={false}
          tick={{
            fill: Colors.GRAY3,
            fontSize: windowWidth < 500 ? '10px' : '12px',
            opacity: isTransitioning ? 0.3 : 1,
            transition: 'opacity 0.3s ease'
          }}
          tickCount={windowWidth < 500 ? 6 : 10}
          tickFormatter={(value) => showBCECE ? (1950 - value < 0 ? Math.abs(1950 - value) + ' BCE' : (1950 - value) + ' CE') : value}
          label={{
            value: showBCECE ? 'Calendar date (BCE/CE)' : 'Calibrated years BP',
            position: 'insideBottom',
            offset: -10,
            fill: Colors.GRAY3,
            style: {
              fontSize: windowWidth < 500 ? '11px' : '13px',
              opacity: isTransitioning ? 0.3 : 1,
              transition: 'opacity 0.3s ease'
            }
          }}
        />

        {/* Y-axis: Probability */}
        <YAxis
          domain={[0, maxProb * 1.1]}
          tickFormatter={(value) => value.toExponential(1)}
          label={{
            value: 'Probability density',
            angle: -90,
            position: 'insideLeft',
            fill: Colors.CERULEAN4,
            dy: -10,
            style: { textAnchor: 'middle', fontSize: windowWidth < 500 ? '11px' : '13px' }
          }}
          tick={{ fill: Colors.GRAY3, fontSize: windowWidth < 500 ? '10px' : '12px' }}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* 95% HPD intervals - shown as light shaded background */}
        {hpd95 && hpd95.map((range, i) => (
          <ReferenceArea
            key={`hpd95-${i}`}
            x1={range.min}
            x2={range.max}
            y1={0}
            y2={maxProb * 1.05}
            fill="#32A467"
            fillOpacity={0.15}
            stroke="#32A467"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ))}

        {/* 68% HPD intervals - shown as darker shaded background */}
        {hpd68 && hpd68.map((range, i) => (
          <ReferenceArea
            key={`hpd68-${i}`}
            x1={range.min}
            x2={range.max}
            y1={0}
            y2={maxProb * 1.05}
            fill={Colors.GREEN3}
            fillOpacity={0.15}
            stroke={Colors.GREEN3}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* Probability density curve - animation reduced for better performance */}
        <Area
          type="monotone"
          dataKey="y"
          name="Probability"
          stroke={Colors.CERULEAN4}
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#colorProbability)"
          isAnimationActive={true}
        />

        {/* Maximum probability marker */}
        {calibratedYearsBP && (
          <ReferenceLine
            x={calibratedYearsBP}
            stroke={Colors.GREEN3}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Max Probability',
              position: 'top',
              fill: Colors.GREEN3,
              fontSize: 12
            }}
          />
        )}
      </AreaChart>
    );
  }, [distribution, xDomain, windowWidth, isTransitioning, showBCECE, maxProb, CustomTooltip, hpd95, hpd68, calibratedYearsBP]);

  // Render combined view with calibration curve - memoized to prevent unnecessary recreation
  const renderCombinedView = useMemo(() => {
    return () => (
      <ComposedChart
        data={combinedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={Colors.DARK_GRAY3} opacity={0.6} />
        <defs>
          <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={Colors.CERULEAN4} stopOpacity={0.8} />
            <stop offset="95%" stopColor={Colors.CERULEAN4} stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="calibrationUncertainty" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={Colors.ROSE2} stopOpacity={0.3} />
            <stop offset="95%" stopColor={Colors.ROSE2} stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain}
          reversed={true}
          allowDecimals={false}
          tick={{
            fill: Colors.GRAY3,
            fontSize: windowWidth < 500 ? '10px' : '12px',
            opacity: isTransitioning ? 0.3 : 1,
            transition: 'opacity 0.3s ease'
          }}
          tickCount={windowWidth < 500 ? 6 : 10}
          tickFormatter={(value) => showBCECE ? (1950 - value < 0 ? Math.abs(1950 - value) + ' BCE' : (1950 - value) + ' CE') : value}
          label={{
            value: showBCECE ? 'Calendar date (BCE/CE)' : 'Calibrated years BP',
            position: 'insideBottom',
            offset: -10,
            fill: Colors.GRAY3,
            style: {
              fontSize: windowWidth < 500 ? '11px' : '13px',
              opacity: isTransitioning ? 0.3 : 1,
              transition: 'opacity 0.3s ease'
            }
          }}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[Math.max(0, radiocarbonMin), radiocarbonMax]}
          label={{
            value: 'Radiocarbon Age (BP)',
            angle: -90,
            position: 'insideLeft',
            fill: Colors.VERMILION4,
            dy: -10,
            style: { textAnchor: 'middle', fontSize: windowWidth < 500 ? '11px' : '13px' }
          }}
          tick={{ fill: Colors.GRAY3, fontSize: windowWidth < 500 ? '10px' : '12px' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, maxProb * 1.1]}
          tickFormatter={(value) => value.toExponential(1)}
          label={{
            value: 'Probability density',
            angle: 90,
            position: 'insideRight',
            fill: Colors.CERULEAN4,
            style: { textAnchor: 'middle', fontSize: windowWidth < 500 ? '11px' : '13px' }
          }}
          tick={{ fill: Colors.GRAY3, fontSize: windowWidth < 500 ? '10px' : '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* 95% HPD intervals - shown as light shaded background */}
        {hpd95 && hpd95.map((range, i) => (
          <ReferenceArea
            key={`hpd95-${i}`}
            yAxisId="right"
            x1={range.min}
            x2={range.max}
            y1={0}
            y2={maxProb * 1.05}
            fill="#32A467"
            fillOpacity={0.15}
            stroke="#32A467"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ))}

        {/* 68% HPD intervals - shown as darker shaded background */}
        {hpd68 && hpd68.map((range, i) => (
          <ReferenceArea
            key={`hpd68-${i}`}
            yAxisId="right"
            x1={range.min}
            x2={range.max}
            y1={0}
            y2={maxProb * 1.05}
            fill={Colors.BLUE4}
            fillOpacity={0.15}
            stroke={Colors.BLUE4}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* Probability density - render this FIRST so it goes underneath - animation disabled for performance */}
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="y"
          name="Probability"
          stroke={Colors.CERULEAN4}
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#colorProbability)"
          isAnimationActive={true}
        />

        <Line
          yAxisId="left"
          dataKey="radiocarbon"
          stroke="none"
          dot={false}
          isAnimationActive={false}
          name="Calibration Curve"
        />
        <Customized
  component={(props) => (
    <CustomVariableWidthLine {...props} data={combinedData} />
  )}
/>

        {/* Maximum probability marker */}
        {calibratedYearsBP && (
          <ReferenceLine
            yAxisId="right"
            x={calibratedYearsBP}
            stroke={Colors.GREEN4}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Max Probability',
              position: 'top',
              fill: Colors.GREEN4,
              fontSize: 12
            }}
          />
        )}

        {/* C14 age marker */}
        {c14AgeBP && (
          <ReferenceLine
            yAxisId="left"
            y={c14AgeBP}
            stroke={Colors.VERMILION4}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Measured 14C Age',
              position: 'insideBottomLeft',
              fill: Colors.VERMILION4,
              fontSize: 12
            }}
          />
        )}
      </ComposedChart>
    );
  }, [combinedData, xDomain, windowWidth, isTransitioning, showBCECE, maxProb, radiocarbonMin, radiocarbonMax,
    CustomTooltip, hpd95, hpd68, calibratedYearsBP, c14AgeBP, uncertainty]);

  // Memoize button handlers to prevent unnecessary renders
  const handleProbabilityViewClick = useCallback(() => {
    setShowCalibrationCurve(false);
  }, []);

  const handleCalibrationViewClick = useCallback(() => {
    setShowCalibrationCurve(true);
  }, []);

  // Memoize the render of controls to prevent unnecessary renders
  const renderControls = useMemo(() => {
    return (
      <div style={{
        marginBottom: '15px',
        display: 'flex',
        flexDirection: windowWidth < 500 ? 'column' : 'row',
        gap: windowWidth < 500 ? '10px' : '0',
        alignItems: windowWidth < 500 ? 'stretch' : 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: windowWidth < 500 ? 'center' : 'flex-start',
          marginRight: windowWidth < 500 ? '0' : '10px'
        }}>
          <BpTooltip
            content={`Toggle between Years BP and BCE/CE dating convention`}
            position="bottom"
          >
            <Button
              onClick={handleFormatToggle}
              minimal={false}
              small={true}
              disabled={isTransitioning}
              rightIcon="exchange"
              icon={showBCECE ? "calendar" : "numerical"}
              intent={showBCECE ? "primary" : "none"}
              className={isTransitioning ? "format-transitioning" : ""}
              style={{
                fontSize: '12px',
                transition: 'all 0.3s ease-in-out',
                transform: isTransitioning ? 'scale(0.95)' : 'scale(1)'
              }}
            >
              <span className="date-format-text" style={{
                display: 'inline-block',
                transition: 'transform 0.3s ease, opacity 0.3s ease',
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(3px)' : 'translateY(0)'
              }}>
                {showBCECE ? "BCE/CE" : "Years BP"}
              </span>
            </Button>
          </BpTooltip>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: windowWidth < 500 ? 'center' : 'flex-end'
        }}>
          <ButtonGroup>
            <Button
              active={!showCalibrationCurve}
              onClick={handleProbabilityViewClick}
              icon="timeline-area-chart"
              small={windowWidth < 500}
            >
              {windowWidth < 500 ? "Probability" : "Probability Only"}
            </Button>
            <Button
              active={showCalibrationCurve}
              onClick={handleCalibrationViewClick}
              icon="timeline-line-chart"
              small={windowWidth < 500}
            >
              {windowWidth < 500 ? "Calibration" : "Show Calibration Curve"}
            </Button>
          </ButtonGroup>
        </div>
      </div>
    );
  }, [windowWidth, handleFormatToggle, isTransitioning, showBCECE, showCalibrationCurve,
    handleProbabilityViewClick, handleCalibrationViewClick]);

  return (!distribution || !Array.isArray(distribution) || distribution.length === 0) ? (
    <div style={{ textAlign: 'center', padding: '20px' }}>Loading calibration data...</div>
  ) : (
    <div>
      {renderControls}

      <ResponsiveContainer
        key={`${min}-${max}-${maxProb}`}
        width="100%"
        height={windowWidth < 600 ? 300 : 400}
      >
        {showCalibrationCurve ? renderCombinedView() : renderProbabilityOnly()}
      </ResponsiveContainer>
    </div>
  );
};

export default CalibrationChart;