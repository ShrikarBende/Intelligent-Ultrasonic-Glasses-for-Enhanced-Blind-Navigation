# Blind Glasses Navigation System

This project is a navigation system designed for "Blind Glasses" that calculates walking routes and provides real-time turn-by-turn instructions. It integrates with Firebase Realtime Database to sync locations and instructions with front-end clients or IoT devices.

## Project Structure

- `frontend/`: Contains the web interface (`index.html`, `script.js`).
- `path.ipynb`: A Python Jupyter Notebook that reads the user's start/end locations from Firebase, fetches walking routes from the OSRM (Open Source Routing Machine) API, and updates Firebase with step-by-step navigation instructions.
- `config_blindglasses.json`: Firebase Admin SDK service account credentials. *(Note: This file is intentionally ignored by git for security reasons).*

## Setup Instructions

### 1. Python Dependencies
To run the Jupyter Notebook, install the required Python packages:

```bash
pip install requests firebase-admin geopy jupyter
```

### 2. Firebase Configuration
You need a Firebase Service Account key to authenticate the backend script:
1. Go to your Firebase Console.
2. Generate a new private key from **Project Settings > Service Accounts**.
3. Save the file as `config_blindglasses.json` in the root directory.

### 3. Running the Project
- Open `path.ipynb` in Jupyter Notebook or VS Code to run the navigation backend.
- Open `frontend/index.html` in your browser (or serve it via a local web server) to view the frontend.
