import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates and downloads a PDF of the calibration results
 * @param {Object|HTMLElement} results - The calibration results object or HTML element to convert
 * @param {string} filename - Optional custom filename for the PDF
 */
export const exportCalibrationToPDF = async (results, filename) => {
  // If results is an HTML element, we're doing an element-to-PDF conversion
  if (results instanceof HTMLElement) {
    return exportElementToPDF(results, filename);
  }
  
  // Regular single calibration result
  const {
    input,
    calibrated_years_BP,
    range_1sigma,
    range_2sigma,
    hpd68_ranges,
    hpd95_ranges,
    curveMetadata
  } = results;

  // Helper function to format calendar years as BCE/CE
  const formatCalendarYear = (yearsBP) => {
    const yearAD = 1950 - yearsBP;
    return yearAD < 0 ? Math.abs(yearAD) + " BCE" : yearAD + " CE";
  };

  try {
    // Create PDF document with specific settings for better text rendering
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    pdf.setCharSpace(0);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    
    // Create text data for our report
    const createResultsData = () => {
      return [
        {
          label: 'Maximum probability calendar age:',
          value: `${calibrated_years_BP} BP (${formatCalendarYear(calibrated_years_BP)})`
        },
        {
          label: 'Overall range (1-sigma):',
          value: `${formatCalendarYear(range_1sigma.max)} to ${formatCalendarYear(range_1sigma.min)}`
        },
        {
          label: 'Overall range (2-sigma):',
          value: `${formatCalendarYear(range_2sigma.max)} to ${formatCalendarYear(range_2sigma.min)}`
        }
      ];
    };
    
    // Set up content
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Radiocarbon Calibration Results", margin, margin);
    
    // Add timestamp
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, margin + 8);
    
    // Input parameters
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Input Parameters:", margin, margin + 20);
    
    pdf.setFont("helvetica", "normal");
    let inputText = `${input.radiocarbon_age} ± ${input.uncertainty} BP (${input.curve})`;
    if (input.reservoir_correction > 0) {
      inputText += `, Reservoir Correction: ${input.reservoir_correction} years`;
    }
    pdf.text(inputText, margin, margin + 28);
    
    // Capture just the chart for image
    const chartElement = document.querySelector('.chart-container');
    if (chartElement) {
      const chartCanvas = await html2canvas(chartElement, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true // Try to prevent memory leaks
      });
      
      // Calculate chart dimensions to fit page width
      const chartImgWidth = pageWidth - (margin * 2);
      const chartImgHeight = (chartCanvas.height * chartImgWidth) / chartCanvas.width;
      
      // Add chart as image - compressed JPEG instead of PNG to reduce file size
      pdf.addImage(
        chartCanvas.toDataURL('image/jpeg', 0.65),
        'JPEG', 
        margin, 
        margin + 35,
        chartImgWidth, 
        chartImgHeight
      );
      
      // Clean up to reduce memory usage
      chartCanvas.remove();
      
      // Add results as actual text below chart
      let yPosition = margin + 40 + chartImgHeight;
      
      // Detailed Results heading
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Result Summary", margin, yPosition);
      yPosition += 8;
      
      // Create data for results
      const resultsData = createResultsData();
      pdf.setFontSize(11);
      
      // Render each result row manually
      resultsData.forEach(row => {
        pdf.setFont("helvetica", "bold");
        pdf.text(row.label, margin, yPosition);
        
        pdf.setFont("helvetica", "normal");
        pdf.text(row.value, margin + 65, yPosition);
        
        yPosition += 7;
      });
      
      yPosition += 5;
      
      // HPD ranges - 68.2% - manually separate the title into individual words for proper spacing
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      
      // Use array of words to avoid spacing issues
      const prob68Title = "68.2% probability (1-sigma):";
      pdf.text(prob68Title, margin, yPosition);
      yPosition += 7;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      
      if (hpd68_ranges && hpd68_ranges.length > 0) {
        hpd68_ranges.forEach((range, i) => {
          const rangeText = hpd68_ranges.length > 1 
            ? `Range ${i+1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`
            : `${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`;
            
          pdf.text(rangeText, margin + 5, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.text(`${formatCalendarYear(range_1sigma.max)} to ${formatCalendarYear(range_1sigma.min)}`, margin + 5, yPosition);
        yPosition += 6;
      }
      
      yPosition += 3;
      
      // HPD ranges - 95.4% - manually separate the title into individual words for proper spacing
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      
      // Use single text string
      const prob95Title = "95.4% probability (2-sigma):";
      pdf.text(prob95Title, margin, yPosition);
      yPosition += 7;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      
      if (hpd95_ranges && hpd95_ranges.length > 0) {
        hpd95_ranges.forEach((range, i) => {
          const rangeText = hpd95_ranges.length > 1 
            ? `Range ${i+1}: ${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`
            : `${formatCalendarYear(range.max)} to ${formatCalendarYear(range.min)}`;
            
          pdf.text(rangeText, margin + 5, yPosition);
          yPosition += 6;
        });
      } else {
        pdf.text(`${formatCalendarYear(range_2sigma.max)} to ${formatCalendarYear(range_2sigma.min)}`, margin + 5, yPosition);
        yPosition += 6;
      }
      
      // Add citation with footer
      yPosition += 10;
      
      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
      
      pdf.setFontSize(9);
      pdf.text(`Calibration based on ${curveMetadata.fullName} dataset`, margin, yPosition);
      yPosition += 5;
      
      // Add citation with text splitting to handle potential wrapping
      // Add citation without splitting text to maintain proper spacing
      const citation = `Citation: ${curveMetadata.citation}`;
      pdf.text(citation, margin, yPosition);
    }
    
    // Save PDF with a formatted filename
    const pdfFilename = filename || `Calibration-${input.radiocarbon_age}BP-${input.uncertainty}-${input.curve}.pdf`;
    pdf.save(pdfFilename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

/**
 * Exports an HTML element to PDF
 * @param {HTMLElement} element - The HTML element to export
 * @param {string} filename - The filename for the PDF
 */
const exportElementToPDF = async (element, filename = 'calibration-results.pdf') => {
  try {
    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: true // Try to prevent memory leaks
    });
    
    // Initialize PDF with proper dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    
    // Calculate image dimensions to fit page width
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Check if content needs multiple pages
    if (imgHeight > pageHeight - (margin * 2)) {
      // Content is too tall for a single page
      // Calculate how many pages we need
      const pageCount = Math.ceil(imgHeight / (pageHeight - (margin * 2)));
      
      // Calculate height of each page segment
      const pageContentHeight = canvas.height / pageCount;
      
      // Create pages
      for (let i = 0; i < pageCount; i++) {
        // Add a new page after the first page
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate the source rectangle from the canvas
        const sourceY = i * pageContentHeight;
        const sourceHeight = Math.min(pageContentHeight, canvas.height - sourceY);
        
        // Create a temporary canvas for this segment
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the segment to the temporary canvas
        tempCtx.drawImage(
          canvas, 
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        // Calculate destination height proportionally
        const destHeight = (sourceHeight * imgWidth) / canvas.width;
        
        // Add the segment to the PDF
        pdf.addImage(
          tempCanvas.toDataURL('image/jpeg', 0.75),
          'JPEG',
          margin,
          margin,
          imgWidth,
          destHeight
        );
        
        // Clean up
        tempCanvas.remove();
      }
    } else {
      // Content fits on a single page
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.75),
        'JPEG',
        margin,
        margin,
        imgWidth,
        imgHeight
      );
    }
    
    // Save PDF
    pdf.save(filename);
    
    // Clean up
    canvas.remove();
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};