import React, { useState, useRef } from 'react';
import { Dialog, Classes, Tabs, Tab, H3, H5, H4 } from "@blueprintjs/core";
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const HelpDialog = ({ isOpen, onClose }) => {
  const [activeTabId, setActiveTabId] = useState("usage");
  // Set a fixed content height instead of dynamically measuring
  const [contentHeight] = useState(500);
  const contentRefs = {
    usage: useRef(null),
    methodology: useRef(null),
    reservoir: useRef(null),
    limitations: useRef(null),
    math: useRef(null)
  };
  
  const handleTabChange = (newTabId) => {
    setActiveTabId(newTabId);
  };
  
  return (
    <Dialog
      id="help-dialog"
      isOpen={isOpen}
      onClose={onClose}
      title="Radiocarbon Calibration Help & Documentation"
      className="bp4-dark help-dialog"
      style={{ width: '800px', maxWidth: '90vw' }}
    >
      <div className={Classes.DIALOG_BODY}>
        <Tabs 
          id="help-tabs" 
          selectedTabId={activeTabId}
          onChange={handleTabChange}
          animate={false}
          className="help-tabs"
        >
          <Tab
            id="usage"
            title="Usage Guide"
            panel={
              <div 
                ref={contentRefs.usage} 
                className="help-panel-content"
                style={{ 
                  height: contentHeight, 
                  overflow: 'auto',
                  padding: '0 5px'
                }}
              >
                <div>
                  <H3>Using the Calibration Tool</H3>
                  
                  <H5>Basic Operation</H5>
                  <ol>
                    <li>Enter your conventional radiocarbon age (in years BP, Before Present).</li>
                    <li>Enter the measurement uncertainty (standard deviation) in years.</li>
                    <li>Optionally, enter a reservoir correction if applicable.</li>
                    <li>Click the "Calibrate" button to see results.</li>
                    <li>Use the share or pdf button in the upper right hand corner to share results.</li>
                  </ol>
                  
                  <H5>Understanding the Results</H5>
                  <ul>
                    <li><strong>Calibrated Date:</strong> The most likely calendar date range based on your radiocarbon date.</li>
                    <li><strong>Probability Distribution:</strong> A graphical representation showing the probability of different calendar dates.</li>
                    <li><strong>1σ (68%) and 2σ (95%) ranges:</strong> Calendar date ranges with 68% and 95% confidence levels.</li>
                  </ul>
                  
                  <H5>Input Restrictions</H5>
                  <ul>
                    <li>This tool supports dates between 0 and 50,000 years BP.</li>
                    <li>Uncertainty must be a positive value.</li>
                    <li>Reservoir correction is optional (leave as 0 if not applicable).</li>
                  </ul>
                </div>
              </div>
            }
          />
          
          <Tab
            id="methodology"
            title="Method"
            panel={
              <div 
                ref={contentRefs.methodology} 
                className="help-panel-content"
                style={{ 
                  height: contentHeight, 
                  overflow: 'auto',
                  padding: '0 5px'
                }}
              >
                <div>
                  <H3>Radiocarbon Calibration Methodology</H3>
                  
                  <H5>What is Calibration?</H5>
                  <p>
                    Radiocarbon dating assumes constant atmospheric ¹⁴C levels, but these levels have fluctuated over time.
                    Calibration corrects for these fluctuations by comparing radiocarbon dates to dates established
                    through dendrochronology (tree-ring dating) and other independent dating methods.
                  </p>
                  
                  <H5>Calibration Curve</H5>
                  <p>
                    This application uses the IntCal20 calibration dataset, which is the internationally accepted
                    standard for converting radiocarbon ages to calendar ages. The curve was developed through
                    analysis of tree rings (dendrochronology), lake and marine sediments, speleothems, and corals.
                  </p>
                  
                  <H5>Probability Distributions</H5>
                  <p>
                    The calibration process doesn't produce a single calendar date but a probability distribution.
                    This distribution shows the likelihood of different calendar dates corresponding to your
                    radiocarbon date. The width of this distribution depends on both your measurement uncertainty
                    and the shape of the calibration curve in that region.
                  </p>
                  
                  <div style={{ marginTop: '15px', fontSize: '12px' }}>
                    <strong>Citation:</strong> Reimer, P., Austin, W., Bard, E. et al. (2020). "The IntCal20 Northern Hemisphere Radiocarbon Age Calibration Curve (0–55 cal kBP)." Radiocarbon, 62(4), 725-757.
                  </div>
                </div>
              </div>
            }
          />
          
          <Tab
            id="reservoir"
            title="Reservoir"
            panel={
              <div 
                ref={contentRefs.reservoir} 
                className="help-panel-content"
                style={{ 
                  height: contentHeight, 
                  overflow: 'auto',
                  padding: '0 5px'
                }}
              >
                <div>
                  <H3>Understanding Reservoir Effects</H3>
                  
                  <H5>What are Reservoir Effects?</H5>
                  <p>
                    Reservoir effects occur when the carbon in a sample comes from a reservoir with a different ¹⁴C content
                    than the atmosphere. This is common in:
                  </p>
                  <ul>
                    <li><strong>Marine samples:</strong> Oceans have an apparent age of several hundred years due to the mixing of old deep waters.</li>
                    <li><strong>Freshwater samples:</strong> Lakes and rivers can contain dissolved ancient carbonates, making samples appear older.</li>
                    <li><strong>Dietary effects:</strong> Animals (including humans) that consume marine or freshwater resources.</li>
                  </ul>
                  
                  <H5>Applying Reservoir Corrections</H5>
                  <p>
                    The reservoir correction is typically expressed as ΔR (Delta-R), which is the difference between
                    the reservoir age of the local region and the global marine reservoir age. This value is subtracted
                    from your radiocarbon age before calibration.
                  </p>
                  
                  <H5>Finding Appropriate Correction Values</H5>
                  <p>
                    Reservoir corrections vary geographically and over time. For marine samples, published regional ΔR values
                    should be used. For humans and animals with mixed diets, corrections based on stable isotope analysis (δ¹³C, δ¹⁵N)
                    may be appropriate.
                  </p>
                  
                  <div style={{ marginTop: '15px', fontSize: '12px' }}>
                    For marine reservoir corrections by region, see the Marine Reservoir Correction Database: http://calib.org/marine/
                  </div>
                </div>
              </div>
            }
          />
          
          <Tab
            id="math"
            title="Math"
            panel={
              <div
                ref={contentRefs.math}
                className="help-panel-content"
                style={{ 
                  height: contentHeight, 
                  overflow: 'auto',
                  padding: '0 5px'
                }}
              >
                <div>
                  <H3>How the Math Works</H3>
                  <p>
                    This application uses a combination of radiocarbon calibration data and statistical methods to
                    transform measured radiocarbon ages into calendar ages.
                  </p>
                  <H5>1. Interpolation</H5>
                  <p>
                    We linearly interpolate between known points on the calibration curve to estimate the expected
                    radiocarbon age for any given calendar year. This helps handle calibration data with coarse intervals.
                  </p>
                  <H5>2. Probability Calculation</H5>
                  <p>
                    For each year in the potential range, we calculate a probability density based on the normal
                    (Gaussian) distribution of both the measurement uncertainty and the calibration curve's own
                    uncertainty.
                  </p>
                  <H5>3. Summation and Normalization</H5>
                  <p>
                    We sum up the probabilities across all possible calendar years and then normalize them so that
                    the total probability equals 1. This yields a continuous probability distribution over calendar years.
                  </p>
                  <H5>4. Highest Posterior Density (HPD)</H5>
                  <p>
                    We identify the date ranges that contain a specified percentage (e.g., 68% or 95%) of the total
                    probability mass. These ranges are reported as the calibrated age intervals.
                  </p>
                  <H3 style={{ marginTop: '30px' }}>Detailed Implementation</H3>
<div style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.5' }}>

  <p>
    Below is a step-by-step demonstration of how to convert a radiocarbon age to a calendar age using the 
    IntCal20 calibration curve. Our running example has:
  </p>
  <ul>
    <li><strong>Radiocarbon Age:</strong> 5000 BP</li>
    <li><strong>Uncertainty (1σ):</strong> ±300 years</li>
    <li><strong>Reservoir Effect <InlineMath>{'R'}</InlineMath>:</strong> 0</li>
    <li><strong>Calibration Curve:</strong> IntCal20</li>
  </ul>

  <h4>1. Correct the Measured <InlineMath>{`^{14}C`}</InlineMath> Age</h4>
  <p>
    If there is a reservoir correction <InlineMath>{'R'}</InlineMath>, compute:
  </p>
  <BlockMath>{'\\text{CorrectedAge} = \\text{MeasuredAge} - R'}</BlockMath>
  <p>
    In our example, <InlineMath>{'R = 0'}</InlineMath>, so <InlineMath>{'\\text{CorrectedAge} = 5000'}</InlineMath>.
  </p>

  <h4>2. For Each Candidate Calendar Year</h4>
  <p>
    Consider a range of possible calendar years—for instance, 0 BP to 12,000 BP. For each integer year 
    <InlineMath>{'\\text{calBP}'}</InlineMath>, we retrieve (or interpolate) from the calibration curve:
  </p>
  <BlockMath>{'c14BPCurve(\\text{calBP}), \\quad ErrorCurve(\\text{calBP})'}</BlockMath>

  <h4>3. Combine Errors in Quadrature</h4>
  <p>
    For each candidate calendar year, the total standard deviation 
    <InlineMath>{'\\sigma_{\\text{total}}'}</InlineMath> is:
  </p>
  <BlockMath>{'\\sigma_{\\text{total}} = \\sqrt{(\\sigma_{\\text{lab}})^2 + (\\sigma_{\\text{curve}})^2}'}</BlockMath>
  <p>
    In the example, <InlineMath>{'\\sigma_{\\text{lab}} = 300'}</InlineMath>. The calibration curve’s uncertainty 
    <InlineMath>{'\\sigma_{\\text{curve}}'}</InlineMath> depends on the year <InlineMath>{'\\text{calBP}'}</InlineMath>.
  </p>

  <h4>4. Compute the Probability Density</h4>
  <p>
    For each <InlineMath>{'\\text{calBP}'}</InlineMath>, compare 
    <InlineMath>{'\\text{CorrectedAge}'}</InlineMath> to 
    <InlineMath>{'c14BPCurve(\\text{calBP})'}</InlineMath>. The probability density is given by the Gaussian:
  </p>
  <BlockMath>{String.raw`
p(\text{calBP}) =
  \frac{1}{\sigma_{\text{total}}\sqrt{2\pi}}
  \exp\biggl[
    -\tfrac{1}{2}
    \bigl(
      \tfrac{\text{CorrectedAge} - c14BPCurve(\text{calBP})}{\sigma_{\text{total}}}
    \bigr)^2
  \biggr].
`}</BlockMath>

  <h4>5. Normalize Probabilities</h4>
  <p>
    Sum the raw probabilities over all <InlineMath>{'\\text{calBP}'}</InlineMath>:
  </p>
  <BlockMath>{'P_{\\text{sum}} = \\sum_{\\text{calBP}} p(\\text{calBP})'}</BlockMath>
  <p>
    Then define the normalized probability:
  </p>
  <BlockMath>{'p_{\\text{norm}}(\\text{calBP}) = \\frac{p(\\text{calBP})}{P_{\\text{sum}}}'}</BlockMath>
  <p>
    This ensures the total probability is 1 over the entire range of <InlineMath>{'\\text{calBP}'}</InlineMath>.
  </p>

  <h4>6. Find the Maximum Probability (Mode)</h4>
  <p>
    Identify the calendar year <InlineMath>{'\\text{calBP}_{\\max}'}</InlineMath> that yields the largest 
    <InlineMath>{'p_{\\text{norm}}(\\text{calBP})'}</InlineMath>:
  </p>
  <BlockMath>{'\\text{Mode} = \\arg\\max_{\\text{calBP}} p_{\\text{norm}}(\\text{calBP})'}</BlockMath>
  <p>
    In the example, the mode is about <InlineMath>{'5728'}</InlineMath> BP, corresponding to ~3778 BCE.
  </p>

  <h4>7. Highest Posterior Density (HPD) Intervals</h4>
  <p>
    For a specified confidence level (e.g., 68.2% or 95.4%):
  </p>
  <ol>
    <li>Sort years by descending <InlineMath>{'p_{\\text{norm}}'}</InlineMath>.</li>
    <li>Add them cumulatively until reaching the desired fraction (e.g., 0.682 for 1σ).</li>
    <li>Re-sort those selected years by ascending age, grouping consecutive years into intervals.</li>
  </ol>
  <p>
    These intervals are the minimal HPD regions covering the specified probability.
  </p>

  <h4>8. Convert BP to BCE (Optional)</h4>
  <p>
    Converting from BP to BCE/BC is done by:
  </p>
  <BlockMath>{'\\text{BCE} = \\text{calBP} - 1950'}</BlockMath>
  <p>
    For example, <InlineMath>{'5728'}</InlineMath> BP → ~3778 BCE.
  </p>

  <h4>Putting It All Together</h4>
  <p>
    Using the example inputs:
  </p>
  <ul>
    <li><strong>Radiocarbon Age:</strong> 5000 BP</li>
    <li><strong>Uncertainty (1σ):</strong> ±300</li>
    <li><strong>Reservoir Effect <InlineMath>{'R'}</InlineMath>:</strong> 0</li>
    <li><strong>Calibration Curve:</strong> IntCal20</li>
  </ul>
  <p>
    We compute <InlineMath>{'\\text{CorrectedAge} = 5000'}</InlineMath>, then evaluate probabilities for 
    <InlineMath>{'\\text{calBP}'}</InlineMath> from 0–12,000, normalize, find the peak (~5728 BP), and derive 
    HPD intervals for 68.2% (1σ) and 95.4% (2σ). An example outcome might be:
  </p>
  <ul>
    <li><strong>Most Probable (Mode) Age:</strong> 5728 BP (≈ 3778 BCE)</li>
    <li><strong>1σ (68.2%) HPD Intervals:</strong> 4224–4197 BCE, 4164–4125 BCE, 4112–4097 BCE, 4065–3503 BCE, 3429–3380 BCE</li>
    <li><strong>2σ (95.4%) HPD Intervals:</strong> 4444–4416 BCE, 4404–3023 BCE</li>
  </ul>
  <p>
    These steps mirror standard single-date radiocarbon calibration workflows (such as OxCal’s basic mode) 
    but omit advanced Bayesian models.
  </p>
  <h4>Definitions of Variables and Symbols</h4>
  <ul>
    <li>
      <strong><InlineMath>{'\\text{BP}'}</InlineMath> (Before Present):</strong> 
      &nbsp;“Present” is conventionally set to AD 1950. So, an age in BP is the number of years before AD 1950.
    </li>
    <li>
      <strong>Measured Radiocarbon Age (e.g., 5000 BP):</strong> 
      &nbsp;A raw <InlineMath>{`^{14}C`}</InlineMath> age measurement reported in years BP.
    </li>
    <li>
      <strong>Uncertainty (<InlineMath>{'\\sigma_{lab}'}</InlineMath>):</strong> 
      &nbsp;The lab measurement’s standard deviation (one sigma).
    </li>
    <li>
      <strong>Reservoir Effect <InlineMath>{'R'}</InlineMath>:</strong> 
      &nbsp;A correction (in years) applied if the sample’s environment causes systematic differences from the standard global <InlineMath>{`^{14}C`}</InlineMath> baseline.
    </li>
    <li>
      <strong>Calibration Curve (IntCal20):</strong> 
      &nbsp;A dataset mapping calendar years (<InlineMath>{'\\text{calBP}'}</InlineMath>) to expected radiocarbon ages (<InlineMath>{'c14BPCurve(\\text{calBP})'}</InlineMath>) and their uncertainties (<InlineMath>{'ErrorCurve(\\text{calBP})'}</InlineMath>).
    </li>
    <li>
      <strong><InlineMath>{'\\text{calBP}'}</InlineMath> (Calendar Years Before Present):</strong> 
      &nbsp;An integer year in actual calendar time, also counted relative to AD 1950. This is what we want to infer from the measured radiocarbon age.
    </li>
    <li>
      <strong><InlineMath>{'c14BPCurve(\\text{calBP})'}</InlineMath>:</strong> 
      &nbsp;The calibration curve’s expected radiocarbon age at a specific calendar year <InlineMath>{'\\text{calBP}'}</InlineMath>.
    </li>
    <li>
      <strong><InlineMath>{'ErrorCurve(\\text{calBP})'}</InlineMath>:</strong> 
      &nbsp;The calibration curve’s standard deviation at <InlineMath>{'\\text{calBP}'}</InlineMath>.
    </li>
    <li>
      <strong>Total Standard Deviation <InlineMath>{'\\sigma_{\\text{total}}'}</InlineMath>:</strong> 
      &nbsp;Combines lab uncertainty and calibration curve uncertainty by adding them in quadrature:
      &nbsp;<InlineMath>{'\\sigma_{\\text{total}} = \\sqrt{ (\\sigma_{\\text{lab}})^2 + (\\sigma_{\\text{curve}})^2 }'}</InlineMath>.
    </li>
    <li>
      <strong>Gaussian Probability Density <InlineMath>{'p(\\text{calBP})'}</InlineMath>:</strong> 
      &nbsp;The likelihood of each candidate <InlineMath>{'\\text{calBP}'}</InlineMath> given the corrected radiocarbon age, modeled by a normal distribution.
    </li>
    <li>
      <strong>Summation <InlineMath>{'\\sum'}</InlineMath>:</strong> 
      &nbsp;Greek capital sigma, denotes a sum over all candidate calendar years.
    </li>
    <li>
      <strong>Normalized Probability <InlineMath>{'p_{\\text{norm}}(\\text{calBP})'}</InlineMath>:</strong> 
      &nbsp;The raw probabilities divided by the sum over all <InlineMath>{'\\text{calBP}'}</InlineMath> values, ensuring the total probability integrates (or sums) to 1.
    </li>
    <li>
      <strong>Mode:</strong> 
      &nbsp;The single most probable calendar year that maximizes <InlineMath>{'p_{\\text{norm}}'}</InlineMath>.
    </li>
    <li>
      <strong>HPD (Highest Posterior Density) Intervals:</strong> 
      &nbsp;Ranges of calendar years containing a specified fraction (e.g., 68.2% or 95.4%) of the total probability, chosen so that every included year has higher probability density than any excluded year.
    </li>
    <li>
      <strong>Convert BP to BCE:</strong> 
      &nbsp;<InlineMath>{'\\text{BCE} = \\text{calBP} - 1950'}</InlineMath>; e.g., 5728 BP ≈ 3778 BCE.
    </li>
    <li>
      <strong>Greek Letters:</strong>
      <ul style={{ listStyle: 'circle', marginLeft: '20px' }}>
        <li><strong><InlineMath>{'\\sigma'}</InlineMath> (sigma):</strong> Standard deviation.</li>
        <li><strong><InlineMath>{'\\pi'}</InlineMath> (pi):</strong> The constant 3.14159..., used in the Gaussian’s normalization factor (<InlineMath>{'\\sqrt{2\\pi}'}</InlineMath>).</li>
        <li><strong><InlineMath>{'\\Sigma'}</InlineMath> (capital sigma):</strong> Summation (<InlineMath>{'\\sum'}</InlineMath>).</li>
      </ul>
    </li>
  </ul>

</div>
                </div>
              </div>
            }
          />
          <Tab
            id="limitations"
            title="Limits"
            panel={
              <div 
                ref={contentRefs.limitations} 
                className="help-panel-content"
                style={{ 
                  height: contentHeight, 
                  overflow: 'auto',
                  padding: '0 5px'
                }}
              >
                <div>
                  <H3>Limitations and Considerations</H3>
                  
                  <H5>Date Range Limitations</H5>
                  <p>
                    This tool supports dates between 0 and 50,000 years BP. For older dates, specialized calibration
                    curves and considerations would be necessary.
                  </p>
                  
                  <H5>Calibration Plateaus</H5>
                  <p>
                    Some periods of the calibration curve are relatively flat (plateaus), which means a single radiocarbon
                    date can correspond to a wide range of calendar dates. During these periods, precise dating is more difficult.
                  </p>
                  
                  <H5>Sample Considerations</H5>
                  <p>
                    The accuracy of calibration depends on proper sample selection, pretreatment, and measurement. Issues like
                    contamination, reservoir effects, and measurement errors must be properly addressed before calibration.
                  </p>
                  
                  <H5>Simplified Implementation</H5>
                  <p>
                    This web application provides a simplified implementation of radiocarbon calibration. For research
                    publications or critical dating applications, specialized calibration software like OxCal, CALIB, or
                    BCal should be used, and results should be reviewed by dating specialists.
                  </p>
                </div>
              </div>
            }
          />
        </Tabs>
      </div>
    </Dialog>
  );
};

export default HelpDialog;