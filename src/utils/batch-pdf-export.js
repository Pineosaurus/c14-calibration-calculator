import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { exportCalibrationToPDF } from './pdfExport';
import { getCalibrationData } from '../data-loader';

// Format calendar year from BP
export const formatCalendarYear = (yearsBP) => {
  const yearAD = 1950 - yearsBP;
  return yearAD < 0 ? Math.abs(yearAD) + " BCE" : yearAD + " CE";
};

// Export all results as PDF with detailed pages
export const exportAllResults = async (allResults) => {
    try {
        // Create a compound filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `radiocarbon-batch-results-${timestamp}.pdf`;

        // Create a jsPDF instance for our multi-page document
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageMargin = 15;
        
        // Create the first page with summary table
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Radiocarbon Calibration Batch Results", pageMargin, pageMargin);

        // Add timestamp
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageMargin, pageMargin + 8);

        // Set up table configs for direct PDF rendering
        const tableStartY = pageMargin + 15;
        const colWidths = [25, 20, 12, 18, 20, 24, 34, 34]; // Adjusted column widths to prevent overlap
        const rowHeight = 12; // Increased row height for better readability
        
        // Add table header with background color
        pdf.setFillColor(52, 92, 139); // Blueprint JS dark blue
        pdf.rect(pageMargin, tableStartY, pageWidth - (pageMargin * 2), rowHeight, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7); // Reduced font size for headers
        pdf.setTextColor(255, 255, 255); // White text for headers
        
        // Define headers - using standard sigma character (σ)
        const headers = [
            { text: 'Sample ID', width: colWidths[0] },
            { text: 'C14 Age (BP)', width: colWidths[1] },
            { text: '± Error', width: colWidths[2] },
            { text: 'Curve', width: colWidths[3] },
            { text: 'Calibrated (BP)', width: colWidths[4] },
            { text: 'Calendar Date', width: colWidths[5] },
            { text: '68.2% Range (1σ)', width: colWidths[6] },
            { text: '95.4% Range (2σ)', width: colWidths[7] }
        ];
        
        // Add headers with proper spacing
        let xOffset = pageMargin;
        headers.forEach(header => {
            // For sigma characters, we need to handle them specially or use alternative text
            // Some PDF encodings have issues with special characters
            const displayText = header.text
                .replace('1σ', '1-sigma')  
                .replace('2σ', '2-sigma');
                
            // Add text centered in cell
            pdf.text(displayText, xOffset + 1, tableStartY + rowHeight/2);
            xOffset += header.width;
        });
        
        // Draw the header bottom border
        pdf.setDrawColor(221, 221, 221); // #ddd color
        pdf.line(pageMargin, tableStartY + rowHeight, pageWidth - pageMargin, tableStartY + rowHeight);
        
        // Add table rows
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0); // Reset to black text for table content
        
        let currentY = tableStartY + rowHeight;
        
        allResults.forEach((result, i) => {
            // Alternate row background
            if (i % 2 === 0) {
                pdf.setFillColor(234, 241, 248); // Light blue for alternating rows (Blueprint JS theme)
                pdf.rect(pageMargin, currentY, pageWidth - (pageMargin * 2), rowHeight, 'F');
            }
            
            xOffset = pageMargin;
            
            // Sample ID
            pdf.text(String(result.input.sample_id || ''), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[0];
            
            // C14 Age
            pdf.text(String(result.input.radiocarbon_age || ''), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[1];
            
            // Error
            pdf.text(String(result.input.uncertainty || ''), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[2];
            
            // Curve
            pdf.text(String(result.curveMetadata?.name || ''), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[3];
            
            // Calibrated BP
            pdf.text(String(result.calibrated_years_BP || ''), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[4];
            
            // Calendar Date
            pdf.text(formatCalendarYear(result.calibrated_years_BP), xOffset + 1, currentY + rowHeight/2);
            xOffset += colWidths[5];
            
            // 68.2% Range (1-sigma)
            const range1Sigma = result.range_1sigma;
            if (range1Sigma) {
                // Split range text to handle wrapping if needed
                const range1Text = `${formatCalendarYear(range1Sigma.max)} to ${formatCalendarYear(range1Sigma.min)}`;
                const wrappedText1 = pdf.splitTextToSize(range1Text, colWidths[6] - 2);
                pdf.text(wrappedText1, xOffset + 1, currentY + rowHeight/2);
            }
            xOffset += colWidths[6];
            
            // 95.4% Range (2-sigma)
            const range2Sigma = result.range_2sigma;
            if (range2Sigma) {
                // Split range text to handle wrapping if needed
                const range2Text = `${formatCalendarYear(range2Sigma.max)} to ${formatCalendarYear(range2Sigma.min)}`;
                const wrappedText2 = pdf.splitTextToSize(range2Text, colWidths[7] - 2);
                pdf.text(wrappedText2, xOffset + 1, currentY + rowHeight/2);
            }
            
            // Draw row bottom border
            pdf.setDrawColor(238, 238, 238); // #eee color
            pdf.line(pageMargin, currentY + rowHeight, pageWidth - pageMargin, currentY + rowHeight);
            
            currentY += rowHeight;
        });
        
        // Add a note about the calibration curves
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(52, 92, 139); // Blueprint dark blue for notes
        pdf.text('Note: Calibration performed using the latest calibration curves (IntCal20, SHCal20, Marine20).', 
                pageMargin, currentY + 10);
        
        // Add a note about detailed pages
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0); // Reset to black
        const detailNote = "The following pages contain detailed calibration results for each sample.";
        pdf.text(detailNote, pageMargin, currentY + 20);

        // Create detailed pages for each result
        for (let i = 0; i < allResults.length; i++) {
            const result = allResults[i];

            // Add a new page
            pdf.addPage();

            // Reset text color for each page
            pdf.setTextColor(0, 0, 0);

            // Add page title
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.text(`Sample: ${result.input.sample_id}`, pageMargin, pageMargin);

            // Create sample information box
            pdf.setFillColor(234, 241, 248); // Light blue background (Blueprint JS theme)
            pdf.setDrawColor(52, 92, 139); // Blueprint JS dark blue border
            
            const infoBoxY = pageMargin + 10;
            const infoBoxHeight = 40; // Increased height for single column layout
            
            // Draw info box with border
            pdf.roundedRect(pageMargin, infoBoxY, pageWidth - (pageMargin * 2), infoBoxHeight, 2, 2, 'FD');
            
            // Set up the info rows
            const infoData = [
                { label: 'Radiocarbon Age', value: `${result.input.radiocarbon_age} ± ${result.input.uncertainty} BP` },
                { label: 'Calibration Curve', value: result.curveMetadata?.name || 'N/A' },
                { label: 'Reservoir Correction', value: result.input.reservoir_correction > 0 ? `${result.input.reservoir_correction} years` : 'None' },
                { label: 'Maximum Probability Age', value: `${result.calibrated_years_BP} BP (${formatCalendarYear(result.calibrated_years_BP)})` }
            ];
            
            // Add the info rows
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            
            let infoY = infoBoxY + 6;
            const infoColWidth = (pageWidth - (pageMargin * 2)) / 2;
            
            // Use a single column layout instead of 2x2 to avoid text overlap
            infoData.forEach((row, idx) => {
                const y = infoY + (idx * 7); // Reduced vertical spacing for more rows
                
                pdf.text(`${row.label}:`, pageMargin + 5, y);
                pdf.setFont("helvetica", "normal");
                pdf.text(row.value, pageMargin + 60, y); // Increased offset to 60mm
                pdf.setFont("helvetica", "bold");
            });
            
            // Confidence Intervals section
            let currentY = infoBoxY + infoBoxHeight + 10;
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.setTextColor(52, 92, 139); // Blueprint dark blue for section headers
            pdf.text("Confidence Intervals", pageMargin, currentY);
            
            currentY += 8;
            
            // 68.2% range (1-sigma)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.text("68.2% Probability (1-sigma)", pageMargin, currentY);
            
            currentY += 6;
            
            // Add 68.2% ranges
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            
            if (result.hpd68_ranges && result.hpd68_ranges.length > 0) {
                result.hpd68_ranges.forEach((range, idx) => {
                    const text = result.hpd68_ranges.length > 1
                        ? `Range ${idx + 1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`
                        : `${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`;
                        
                    pdf.text("• " + text, pageMargin + 5, currentY);
                    currentY += 5;
                });
            } else if (result.range_1sigma) {
                pdf.text(`${formatCalendarYear(result.range_1sigma.max)} to ${formatCalendarYear(result.range_1sigma.min)}`, 
                        pageMargin + 5, currentY);
                currentY += 5;
            }
            
            currentY += 5;
            
            // 95.4% range (2-sigma)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.text("95.4% Probability (2-sigma)", pageMargin, currentY);
            
            currentY += 6;
            
            // Add 95.4% ranges
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            
            if (result.hpd95_ranges && result.hpd95_ranges.length > 0) {
                result.hpd95_ranges.forEach((range, idx) => {
                    const text = result.hpd95_ranges.length > 1
                        ? `Range ${idx + 1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`
                        : `${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`;
                        
                    pdf.text("• " + text, pageMargin + 5, currentY);
                    currentY += 5;
                });
            } else if (result.range_2sigma) {
                pdf.text(`${formatCalendarYear(result.range_2sigma.max)} to ${formatCalendarYear(result.range_2sigma.min)}`, 
                        pageMargin + 5, currentY);
                currentY += 5;
            }
            
            currentY += 10;

            // Create a more sophisticated chart rendering similar to the actual app
            const chartCanvas = document.createElement('canvas');
            chartCanvas.width = 750;
            chartCanvas.height = 400;
            chartCanvas.style.padding = '10px';
            chartCanvas.style.marginBottom = '20px';
            chartCanvas.style.border = '1px solid #ddd';
            chartCanvas.style.borderRadius = '4px';
            chartCanvas.style.backgroundColor = 'white';
            
            // Get the context for drawing
            const ctx = chartCanvas.getContext('2d');
            
            // Chart settings
            const margin = {
                top: 40,
                right: 60,
                bottom: 60,
                left: 60
            };
            
            const chartWidth = chartCanvas.width - margin.left - margin.right;
            const chartHeight = chartCanvas.height - margin.top - margin.bottom;
            
            // Define colors similar to the app
            const colors = {
                probability: '#2B95D6',              // Blueprint blue (similar to CERULEAN4)
                probabilityFill: 'rgba(43, 149, 214, 0.2)',
                sigma68: 'rgba(0, 128, 0, 0.15)',    // Green for 68.2%
                sigma68Border: 'rgba(0, 128, 0, 0.5)',
                sigma95: 'rgba(187, 0, 0, 0.08)',    // Red for 95.4%
                sigma95Border: 'rgba(187, 0, 0, 0.3)',
                calibrationCurve: '#E76258',         // Vermilion for calibration curve
                calibrationUncertainty: 'rgba(231, 98, 88, 0.2)',
                axis: '#444444',
                grid: 'rgba(100, 100, 100, 0.15)',
                maxProbability: '#0D8050',           // Green for max probability line
                c14Age: '#A82A2A'                    // Red for C14 age line
            };
            
            // Draw a chart background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
            
            // Add a title
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Calibration Results: ${result.input.sample_id}`, chartCanvas.width / 2, 20);
            
            // Get calibration curve data for the range
            const calibrationData = getCalibrationData();
            
            if (result.distribution && result.distribution.length > 0) {
                // Find min and max values for scaling
                const xValues = result.distribution.map(p => p.x);
                const yValues = result.distribution.map(p => p.y);
                const xMin = Math.min(...xValues);
                const xMax = Math.max(...xValues);
                const yMax = Math.max(...yValues);
                
                // Buffer the x domain slightly
                const xDomainMin = Math.max(0, xMin - 200);
                const xDomainMax = xMax + 200;
                
                // Scale functions for the probability chart
                const xScale = (x) => margin.left + ((x - xDomainMin) / (xDomainMax - xDomainMin)) * chartWidth;
                const yScale = (y) => margin.top + chartHeight - ((y / yMax) * chartHeight);
                
                // Draw grid
                ctx.strokeStyle = colors.grid;
                ctx.lineWidth = 0.5;
                
                // Horizontal grid lines (5 lines)
                for (let i = 0; i <= 5; i++) {
                    const y = margin.top + (i / 5) * chartHeight;
                    ctx.beginPath();
                    ctx.moveTo(margin.left, y);
                    ctx.lineTo(margin.left + chartWidth, y);
                    ctx.stroke();
                }
                
                // Vertical grid lines (10 lines)
                for (let i = 0; i <= 10; i++) {
                    const x = margin.left + (i / 10) * chartWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top);
                    ctx.lineTo(x, margin.top + chartHeight);
                    ctx.stroke();
                }
                
                // Draw axes
                ctx.strokeStyle = colors.axis;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(margin.left, margin.top);
                ctx.lineTo(margin.left, margin.top + chartHeight);
                ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
                ctx.stroke();
                
                // Add axis labels
                ctx.font = '12px Arial';
                ctx.fillStyle = '#555555';
                ctx.textAlign = 'center';
                
                // X-axis label
                ctx.fillText('Calendar Years BP', margin.left + chartWidth / 2, chartCanvas.height - 15);
                
                // X-axis ticks and values - 6 ticks
                const tickCount = 6;
                const tickStep = (xDomainMax - xDomainMin) / (tickCount - 1);
                for (let i = 0; i < tickCount; i++) {
                    const tickValue = xDomainMax - i * tickStep; // Reversed axis
                    const x = xScale(tickValue);
                    
                    // Draw tick
                    ctx.beginPath();
                    ctx.moveTo(x, margin.top + chartHeight);
                    ctx.lineTo(x, margin.top + chartHeight + 5);
                    ctx.stroke();
                    
                    // Add label
                    ctx.fillText(Math.round(tickValue), x, margin.top + chartHeight + 20);
                }
                
                // Y-axis label (rotated)
                ctx.save();
                ctx.translate(15, margin.top + chartHeight/2);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.fillText('Probability Density', 0, 0);
                ctx.restore();
                
                // Y-axis ticks and values - use exponential notation
                for (let i = 0; i <= 5; i++) {
                    const value = (i / 5) * yMax;
                    const y = yScale(value);
                    
                    // Draw tick
                    ctx.beginPath();
                    ctx.moveTo(margin.left, y);
                    ctx.lineTo(margin.left - 5, y);
                    ctx.stroke();
                    
                    // Add label - format as exponential
                    ctx.textAlign = 'right';
                    ctx.fillText(value.toExponential(1), margin.left - 10, y + 4);
                }
                
                // Draw 95.4% HPD intervals
                if (result.hpd95_ranges && result.hpd95_ranges.length > 0) {
                    ctx.fillStyle = colors.sigma95;
                    ctx.strokeStyle = colors.sigma95Border;
                    ctx.lineWidth = 1;
                    
                    result.hpd95_ranges.forEach(range => {
                        const x1 = xScale(range.min);
                        const x2 = xScale(range.max);
                        
                        // Fill rectangle
                        ctx.fillRect(x1, margin.top, x2 - x1, chartHeight);
                        
                        // Draw border
                        ctx.strokeRect(x1, margin.top, x2 - x1, chartHeight);
                    });
                    
                    // Add label for 95.4%
                    ctx.fillStyle = '#AA0000';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText('95.4% (2σ)', margin.left + 10, margin.top + 20);
                } else if (result.range_2sigma) {
                    // If no HPD ranges, use overall range
                    ctx.fillStyle = colors.sigma95;
                    ctx.strokeStyle = colors.sigma95Border;
                    ctx.lineWidth = 1;
                    
                    const x1 = xScale(result.range_2sigma.min);
                    const x2 = xScale(result.range_2sigma.max);
                    
                    // Fill rectangle
                    ctx.fillRect(x1, margin.top, x2 - x1, chartHeight);
                    
                    // Draw border
                    ctx.strokeRect(x1, margin.top, x2 - x1, chartHeight);
                    
                    // Add label for 95.4%
                    ctx.fillStyle = '#AA0000';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText('95.4% (2σ)', margin.left + 10, margin.top + 20);
                }
                
                // Draw 68.2% HPD intervals
                if (result.hpd68_ranges && result.hpd68_ranges.length > 0) {
                    ctx.fillStyle = colors.sigma68;
                    ctx.strokeStyle = colors.sigma68Border;
                    ctx.lineWidth = 1;
                    
                    result.hpd68_ranges.forEach(range => {
                        const x1 = xScale(range.min);
                        const x2 = xScale(range.max);
                        
                        // Fill rectangle
                        ctx.fillRect(x1, margin.top, x2 - x1, chartHeight);
                        
                        // Draw border
                        ctx.strokeRect(x1, margin.top, x2 - x1, chartHeight);
                    });
                    
                    // Add label for 68.2%
                    ctx.fillStyle = '#007700';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText('68.2% (1σ)', margin.left + 10, margin.top + 35);
                } else if (result.range_1sigma) {
                    // If no HPD ranges, use overall range
                    ctx.fillStyle = colors.sigma68;
                    ctx.strokeStyle = colors.sigma68Border;
                    ctx.lineWidth = 1;
                    
                    const x1 = xScale(result.range_1sigma.min);
                    const x2 = xScale(result.range_1sigma.max);
                    
                    // Fill rectangle
                    ctx.fillRect(x1, margin.top, x2 - x1, chartHeight);
                    
                    // Draw border
                    ctx.strokeRect(x1, margin.top, x2 - x1, chartHeight);
                    
                    // Add label for 68.2%
                    ctx.fillStyle = '#007700';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText('68.2% (1σ)', margin.left + 10, margin.top + 35);
                }
                
                // Draw calibration curve if data is available
                if (calibrationData && calibrationData.IntCal20) {
                    // Filter calibration data to our range of interest
                    const curveData = calibrationData.IntCal20
                        .filter(point => point.cal_BP >= xDomainMin && point.cal_BP <= xDomainMax);
                    
                    if (curveData.length > 0) {
                        // Find radiocarbon y-scale extent
                        const radioMin = Math.min(...curveData.map(d => d.c14_BP - d.error));
                        const radioMax = Math.max(...curveData.map(d => d.c14_BP + d.error));
                        const radioRange = radioMax - radioMin;
                        
                        // Scale function for radiocarbon age
                        const radioScale = (y) => margin.top + chartHeight - ((y - radioMin) / radioRange) * chartHeight * 0.8;
                        
                        // Draw calibration curve uncertainty band
                        ctx.fillStyle = colors.calibrationUncertainty;
                        ctx.beginPath();
                        
                        // Upper boundary points
                        curveData.forEach((point, idx) => {
                            const x = xScale(point.cal_BP);
                            const y = radioScale(point.c14_BP + point.error);
                            
                            if (idx === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                        });
                        
                        // Lower boundary points in reverse
                        for (let i = curveData.length - 1; i >= 0; i--) {
                            const point = curveData[i];
                            const x = xScale(point.cal_BP);
                            const y = radioScale(point.c14_BP - point.error);
                            ctx.lineTo(x, y);
                        }
                        
                        ctx.closePath();
                        ctx.fill();
                        
                        // Draw calibration curve center line
                        ctx.strokeStyle = colors.calibrationCurve;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        
                        curveData.forEach((point, idx) => {
                            const x = xScale(point.cal_BP);
                            const y = radioScale(point.c14_BP);
                            
                            if (idx === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                        });
                        
                        ctx.stroke();
                        
                        // Draw measured C14 age if available
                        if (result.input.radiocarbon_age) {
                            const c14y = radioScale(result.input.radiocarbon_age);
                            
                            // Draw line
                            ctx.strokeStyle = colors.c14Age;
                            ctx.lineWidth = 1.5;
                            ctx.setLineDash([5, 3]);
                            ctx.beginPath();
                            ctx.moveTo(margin.left, c14y);
                            ctx.lineTo(margin.left + chartWidth, c14y);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            
                            // Label
                            ctx.fillStyle = colors.c14Age;
                            ctx.textAlign = 'right';
                            ctx.fillText(`Measured ¹⁴C Age: ${result.input.radiocarbon_age} BP`, margin.left + chartWidth - 10, c14y - 5);
                        }
                    }
                }
                
                // Draw the probability curve
                const step = Math.max(1, Math.floor(result.distribution.length / 200));
                
                // Draw filled area under probability curve
                ctx.fillStyle = colors.probabilityFill;
                ctx.beginPath();
                ctx.moveTo(xScale(result.distribution[0].x), yScale(0));
                
                for (let i = 0; i < result.distribution.length; i += step) {
                    const point = result.distribution[i];
                    ctx.lineTo(xScale(point.x), yScale(point.y));
                }
                
                // Close the path back to the x-axis
                ctx.lineTo(xScale(result.distribution[result.distribution.length - 1].x), yScale(0));
                ctx.closePath();
                ctx.fill();
                
                // Draw probability density curve
                ctx.strokeStyle = colors.probability;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xScale(result.distribution[0].x), yScale(result.distribution[0].y));
                
                for (let i = 0; i < result.distribution.length; i += step) {
                    const point = result.distribution[i];
                    ctx.lineTo(xScale(point.x), yScale(point.y));
                }
                
                ctx.stroke();
                
                // Mark max probability point
                if (result.calibrated_years_BP) {
                    // Find y-value at max probability point by interpolating
                    let maxY = 0;
                    for (const point of result.distribution) {
                        if (Math.abs(point.x - result.calibrated_years_BP) < 5) {
                            maxY = Math.max(maxY, point.y);
                        }
                    }
                    
                    // Draw vertical line at max probability
                    ctx.strokeStyle = colors.maxProbability;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 3]);
                    ctx.beginPath();
                    ctx.moveTo(xScale(result.calibrated_years_BP), margin.top);
                    ctx.lineTo(xScale(result.calibrated_years_BP), margin.top + chartHeight);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Add label
                    ctx.fillStyle = colors.maxProbability;
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Max Probability', xScale(result.calibrated_years_BP), margin.top + 15);
                    ctx.fillText(`${result.calibrated_years_BP} BP`, xScale(result.calibrated_years_BP), margin.top + 30);
                }
            }
            
            // First, we'll create and add just the chart to the PDF
            // Append to document temporarily
            document.body.appendChild(chartCanvas);
            
            // Capture the chart as canvas
            const chartImg = await html2canvas(chartCanvas, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // Calculate dimensions to fit chart on page
            const chartImgWidth = pageWidth - (pageMargin * 2);
            const chartImgHeight = (chartImg.height * chartImgWidth) / chartImg.width;
            
            // Add chart image
            pdf.addImage(
                chartImg.toDataURL('image/jpeg', 0.8),
                'JPEG',
                pageMargin,
                currentY,
                chartImgWidth,
                chartImgHeight
            );
            
            // Clean up
            chartImg.remove();
            chartCanvas.remove();
            
            // Add citation text - this will be selectable
            currentY = currentY + chartImgHeight + 10;
            
            // Add horizontal line before citation
            pdf.setDrawColor(52, 92, 139); // Blueprint blue
            pdf.line(pageMargin, currentY - 5, pageWidth - pageMargin, currentY - 5);
            
            // Add citation text
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(52, 92, 139); // Blueprint dark blue
            
            if (result.curveMetadata && result.curveMetadata.citation) {
                pdf.setFont("helvetica", "bold");
                pdf.text("Citation:", pageMargin, currentY);
                pdf.setFont("helvetica", "normal");
                
                // Split citation text to handle multiple lines if needed
                const splitCitation = pdf.splitTextToSize(
                    result.curveMetadata.citation, 
                    pageWidth - pageMargin * 2 - 20
                );
                
                pdf.text(splitCitation, pageMargin + 20, currentY);
            }
        }

        // No summary container to clean up since we're directly creating PDF content

        // Save the PDF
        pdf.save(filename);

    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export results. Please try again.');
    }
};

// Export all results as CSV
export const exportResultsAsCSV = (allResults) => {
    try {
        // Create a timestamp for the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `radiocarbon-batch-results-${timestamp}.csv`;
        
        // Prepare data for CSV export
        const csvData = allResults.map(result => {
            // Create share URL for this calibration
            const params = new URLSearchParams();
            params.set('age', result.input.radiocarbon_age);
            params.set('uncertainty', result.input.uncertainty);
            if (result.input.reservoir_correction > 0) params.set('reservoir', result.input.reservoir_correction);
            params.set('curve', result.input.curve);
            if (result.input.search_mode) params.set('mode', result.input.search_mode);
            const shareUrl = `${window.location.origin}?${params.toString()}`;
            
            // Format 68.2% ranges (1-sigma)
            let oneSignaRanges = '';
            if (result.hpd68_ranges && result.hpd68_ranges.length > 0) {
                oneSignaRanges = result.hpd68_ranges.map((range, idx) => 
                    `Range ${idx + 1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)} (${range.max}-${range.min} BP)`
                ).join('; ');
            } else if (result.range_1sigma) {
                oneSignaRanges = `${formatCalendarYear(result.range_1sigma.max)} to ${formatCalendarYear(result.range_1sigma.min)} (${result.range_1sigma.max}-${result.range_1sigma.min} BP)`;
            }
            
            // Format 95.4% ranges (2-sigma)
            let twoSigmaRanges = '';
            if (result.hpd95_ranges && result.hpd95_ranges.length > 0) {
                twoSigmaRanges = result.hpd95_ranges.map((range, idx) => 
                    `Range ${idx + 1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)} (${range.max}-${range.min} BP)`
                ).join('; ');
            } else if (result.range_2sigma) {
                twoSigmaRanges = `${formatCalendarYear(result.range_2sigma.max)} to ${formatCalendarYear(result.range_2sigma.min)} (${result.range_2sigma.max}-${result.range_2sigma.min} BP)`;
            }
            
            // Return a flat object for each row of the CSV
            return {
                'Sample ID': result.input.sample_id || '',
                'Radiocarbon Age (BP)': result.input.radiocarbon_age,
                'Uncertainty (±)': result.input.uncertainty,
                'Reservoir Correction': result.input.reservoir_correction || 0,
                'Calibration Curve': result.curveMetadata?.name || '',
                'Curve Full Name': result.curveMetadata?.fullName || '',
                'Calibrated Age (BP)': result.calibrated_years_BP,
                'Calendar Date': formatCalendarYear(result.calibrated_years_BP),
                '68.2% Range (1σ)': oneSignaRanges,
                '95.4% Range (2σ)': twoSigmaRanges,
                'Visualization URL': shareUrl
            };
        });
        
        // Convert to CSV string
        const csv = Papa.unparse(csvData, {
            quotes: true, // Add quotes around all fields
            header: true  // Include header row
        });
        
        // Create a Blob and download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        // Add to document, click to download, then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('CSV Export error:', error);
        alert('Failed to export results as CSV. Please try again.');
    }
};
