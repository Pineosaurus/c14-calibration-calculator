# Radiocarbon (¹⁴C) Calibration Web Application

A responsive, visually appealing web application built with React that converts conventional radiocarbon dates (¹⁴C years BP) into dendrochronologically calibrated calendar dates.

## Features

- Convert radiocarbon dates (years BP) to calendar dates
- Apply measurement uncertainty and optional reservoir corrections
- Visual probability distribution of calibrated results
- Multiple calendar range search modes:
  - Search by ¹⁴C Age: Recommended option that sorts by radiocarbon age for accurate boundary detection
  - Full Curve: Uses the entire calibration curve (0-55,000 BP) to find all possible matches
- Export results as a pdf or share a link to a result
- Built-in documentation and help
- Support for dates between 0-55,000 years BP

## Development

### Prerequisites

- Node.js
- npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open `http://localhost:3000`

### Running Tests

```bash
npm test
```

## Technologies Used

- React.js
- Blueprint.js for UI components
- Recharts for data visualization
