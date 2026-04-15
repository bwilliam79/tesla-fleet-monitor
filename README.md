# Tesla Fleet Monitor

A beautiful, sleek web app for monitoring multiple Tesla vehicles in real-time. Built with React and Node.js, inspired by Tesla's minimalist design language.

## Features

- **Fleet Overview Dashboard** — Real-time status of all vehicles at a glance
- **Detailed Vehicle Analytics** — Battery history, efficiency trends, and performance metrics
- **Efficiency Leaderboard** — See which car is the most efficient over the past 30 days
- **Trip History Timeline** — Track all trips across your fleet with distance, efficiency, and energy data
- **Beautiful Charts** — Interactive graphs showing battery SOC, efficiency, power draw, and range
- **Tesla-Inspired Design** — Dark theme with clean, minimalist interface

## Architecture

- **Backend**: Node.js/Express API
- **Frontend**: React with Recharts for data visualization
- **Database**: SQLite (development) / PostgreSQL (production-ready)
- **Deployment**: Docker Compose

## Getting Started

### Local Development

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Start backend (from backend directory)
npm start

# In another terminal, start frontend (from frontend directory)
npm start
```

Backend runs on `http://localhost:3001`
Frontend runs on `http://localhost:3000`

### Docker Deployment

```bash
docker compose up -d --build
```

App will be available at `http://localhost:3000`

## API Configuration

Currently running with mock data. To connect to real Tesla data via Tessie:

1. Get your Tessie API key
2. Update `backend/src/index.js` with Tessie API integration
3. Implement real data fetching in place of `mockData.js`

## Metrics Tracked

- State of Charge (SOC)
- Battery Range
- Efficiency (Wh/km)
- Temperature
- Charging State & Power
- Odometer
- Trip History

## Data Refresh

The app refreshes vehicle metrics every 15 minutes by default, with the frontend polling the backend accordingly.

## Future Enhancements

- Real Tessie API integration
- Historical trends and predictions
- Cost analysis and charging optimization
- Home integration
- Mobile-responsive design improvements
