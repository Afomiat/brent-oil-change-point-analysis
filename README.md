# Brent Crude Oil Price Change Point Analysis & Dynamic Dashboard

**Birhan Energies Strategic Advisory Services**

This repository contains the complete implementation for the Bayesian change point detection and event study of Brent Crude oil prices (1987–2022), along with a web-based interactive analytics dashboard.

---

## 1. Project Overview

The global crude oil market is subject to extreme volatility caused by macroeconomic forces, geopolitical conflicts, international sanctions, and OPEC policy shifts. 

This project aims to:
1. **Analyze Time Series Properties**: Examine raw Brent oil prices and log returns for stationarity, trend components, and volatility clustering.
2. **Perform Bayesian Change Point Detection**: Construct a model in PyMC to locate structural breaks and quantify mean price shifts across different historical regimes.
3. **Conduct Event Studies**: Correlate identified change points with a structured database of 15 key global shocks (1990-2022) and measure their short-term and long-term impacts.
4. **Deploy an Interactive Dashboard**: Deliver a lightweight Flask REST API backend and a responsive glassmorphic React frontend allowing stakeholders to explore the data dynamically.

---

## 2. Key Analytical Findings

- **Primary Structural Break**: Located at **March 31, 2005** with high posterior probability.
- **Regime 1 Mean Price ($\mu_1$)**: **$21.50 / barrel** (1987 to March 2005).
- **Regime 2 Mean Price ($\mu_2$)**: **$75.69 / barrel** (April 2005 to November 2022).
- **Quantified Impact**: An increase of **+$54.19 / barrel** (+252% shift).
- **Underlying Drivers**: The mid-2000s marked the start of the "Commodity Supercycle" driven by rapid demand growth in emerging economies (particularly China and India), historically low OPEC spare capacity, and persistent geopolitical risk premiums (the post-9/11 War on Terror).

---

## 3. Project Structure

```
├── .github/
│   └── workflows/
│       └── unittests.yml       # CI/CD pipeline (python tests & frontend build)
├── data/
│   ├── BrentOilPrices.csv      # Daily historical Brent oil prices (1987-2022)
│   └── events.csv              # Structured list of 15 key historical events
├── src/
│   └── backend/
│       └── app.py              # Flask REST API backend serving price/event statistics
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # React dashboard dashboard UI with Recharts
│   │   ├── index.css           # Glassmorphic dark theme styling system
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── notebooks/
│   ├── eda.ipynb               # Exploratory time series diagnostics
│   └── change_point_analysis.ipynb # PyMC Bayesian change point model notebook
├── reports/
│   ├── foundation.md           # Task 1 report (workflow, assumptions, ADF tests)
│   ├── change_point_summary.txt # Summary details of PyMC model variables
│   └── figures/                # Saved charts and verification screenshots
├── scripts/
│   └── run_backend.py          # Script to launch Flask backend
├── tests/
│   └── test_backend.py         # Unit tests for backend endpoints and data loaders
├── requirements.txt            # Python virtualenv dependencies
└── README.md                   # Project documentation
```

---

## 4. Setup and Installation

### Backend API Server Setup (Python)
1. Ensure Python 3.11 is installed on your system.
2. Initialize and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   pip install flask flask-cors
   ```
4. Run the API backend server:
   ```bash
   python scripts/run_backend.py
   ```
   *The server will start at `http://127.0.0.1:5000`.*

### Frontend Dashboard Setup (React + Vite)
1. Install Node.js (v20+ recommended).
2. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
3. Install frontend dependencies:
   ```bash
   npm install --legacy-peer-deps
   npm install react-is --legacy-peer-deps
   ```
4. Launch the local React dev server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173/` in your browser to explore the dashboard.*

---

## 5. Running Tests & CI/CD

### Local Unit Tests:
Run the backend tests locally with:
```bash
python -m unittest tests/test_backend.py
```

### GitHub Actions CI/CD Pipeline:
A GitHub Action is configured in `.github/workflows/unittests.yml`. It runs automatically on pushes and pull requests to:
- Set up python and run unit tests.
- Set up Node, install dependencies, and build the React app.
- Steps are conditional, meaning they safely skip test runs on earlier task branches (`task1`, `task2`) where those scripts are not yet implemented.
