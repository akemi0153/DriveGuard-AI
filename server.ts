import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple file-based database
const DB_FILE = path.join(process.cwd(), "db.json");

// Default state definition
interface AppState {
  disks: Record<string, DiskSpace>;
  settings: {
    alertThreshold: number;
    alertEmail: string;
    driveThresholds: Record<string, number>;
    pollingEnabled: boolean;
  };
  alerts: Alert[];
}

interface DiskSpace {
  machineId: string;
  driveLetter: string;
  totalSpace: number; // bytes
  usedSpace: number; // bytes
  lastUpdated: string; // ISO date
  historical: { time: string; used: number }[];
  directories?: { path: string; sizeBytes: number }[];
}

interface Alert {
  id: string;
  timestamp: string;
  machineId: string;
  driveLetter: string;
  message: string;
  type: 'warning' | 'critical' | 'resolved';
}

function loadDB(): AppState {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.settings && !parsed.settings.driveThresholds) {
        parsed.settings.driveThresholds = {};
      }
      return parsed;
    } catch (e) {
      console.error("Error reading DB file:", e);
    }
  }
  return {
    disks: {},
    settings: {
      alertThreshold: 90,
      alertEmail: "",
      driveThresholds: {},
      pollingEnabled: true,
    },
    alerts: [],
  };
}

function saveDB(state: AppState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing DB file:", e);
  }
}

// Ensure mock data for the preview
function initializeMockData() {
  const state = loadDB();
  if (Object.keys(state.disks).length === 0) {
    const mockMachineId = "SRV-PROD-01";
    const totalC = 500 * 1024 * 1024 * 1024; // 500GB
    const totalD = 2 * 1024 * 1024 * 1024 * 1024; // 2TB

    state.disks = {
      [`${mockMachineId}-C:`]: {
        machineId: mockMachineId,
        driveLetter: "C:",
        totalSpace: totalC,
        usedSpace: totalC * 0.92, // 92% used
        lastUpdated: new Date().toISOString(),
        historical: Array.from({length: 12}).map((_, i) => ({
          time: new Date(Date.now() - (11 - i) * 3600000).toISOString(),
          used: totalC * (0.85 + (i * 0.006))
        }))
      },
      [`${mockMachineId}-D:`]: {
        machineId: mockMachineId,
        driveLetter: "D:",
        totalSpace: totalD,
        usedSpace: totalD * 0.45, // 45% used
        lastUpdated: new Date().toISOString(),
        historical: Array.from({length: 12}).map((_, i) => ({
          time: new Date(Date.now() - (11 - i) * 3600000).toISOString(),
          used: totalD * 0.45
        }))
      }
    };
    
    // Add mock alert
    state.alerts.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      machineId: mockMachineId,
      driveLetter: "C:",
      message: `C: drive is at 92% capacity (Threshold: ${state.settings.alertThreshold}%)`,
      type: 'critical'
    });
    
    saveDB(state);
  }
}
initializeMockData();

// API ROUTES ////////////////////////////////////////////////////////

// Get overview of all disks
app.get("/api/disks", (req, res) => {
  const state = loadDB();
  res.json(Object.values(state.disks));
});

// Windows Agent submits telemetry here
app.post("/api/telemetry", (req, res) => {
  const { machineId, driveLetter, totalSpace, usedSpace, directories } = req.body;
  if (!machineId || !driveLetter || totalSpace === undefined || usedSpace === undefined) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const state = loadDB();
  const id = `${machineId}-${driveLetter}`;
  const now = new Date().toISOString();
  
  const existing = state.disks[id];
  const historical = existing ? existing.historical : [];
  
  // Keep last 24 data points
  historical.push({ time: now, used: usedSpace });
  if (historical.length > 24) historical.shift();

  state.disks[id] = {
    machineId,
    driveLetter,
    totalSpace,
    usedSpace,
    lastUpdated: now,
    historical,
    directories,
  };

  // Check thresholds
  const usagePercent = (usedSpace / totalSpace) * 100;
  
  // Get threshold - checking if directories have local threshold overrides or just use drive, falling back to global
  // In a robust implementation, we might check dir thresholds, but here we'll use drive threshold
  const threshold = state.settings.driveThresholds[id] !== undefined ? state.settings.driveThresholds[id] : state.settings.alertThreshold;

  if (usagePercent > threshold) {
    const alertMessage = `${driveLetter} drive on ${machineId} is at ${usagePercent.toFixed(1)}% capacity (Threshold: ${threshold}%).`;
    
    // Only alert if we haven't alerted for this drive very recently to prevent spam
    const recentAlert = state.alerts.find(
      a => a.machineId === machineId && a.driveLetter === driveLetter && 
      (new Date().getTime() - new Date(a.timestamp).getTime() < 3600000) // 1 hour ago
    );

    if (!recentAlert) {
      state.alerts.unshift({
        id: crypto.randomUUID(),
        timestamp: now,
        machineId,
        driveLetter,
        message: alertMessage,
        type: usagePercent > 95 ? 'critical' : 'warning'
      });
      console.log("ALERT GENERATED:", alertMessage);
      
      // We would send an email here using configured SMTP
      if (state.settings.alertEmail) {
         console.log(`[Email Simulation] Sent to ${state.settings.alertEmail}: ${alertMessage}`);
      }
    }
  }

  // Keep max 50 alerts
  if (state.alerts.length > 50) {
    state.alerts = state.alerts.slice(0, 50);
  }

  saveDB(state);
  res.json({ success: true, received: true });
});

// Get recent alerts
app.get("/api/alerts", (req, res) => {
  const state = loadDB();
  res.json(state.alerts);
});

// Settings API
app.get("/api/settings", (req, res) => {
  const state = loadDB();
  res.json(state.settings);
});

app.post("/api/settings", (req, res) => {
  const { alertThreshold, alertEmail, driveThresholds, pollingEnabled } = req.body;
  const state = loadDB();
  
  if (alertThreshold !== undefined) {
    state.settings.alertThreshold = alertThreshold;
  }
  if (alertEmail !== undefined) {
    state.settings.alertEmail = alertEmail;
  }
  if (driveThresholds !== undefined) {
    state.settings.driveThresholds = driveThresholds;
  }
  if (pollingEnabled !== undefined) {
    state.settings.pollingEnabled = pollingEnabled;
  }
  
  saveDB(state);
  res.json(state.settings);
});


// MIDDLEWARE ////////////////////////////////////////////////////////

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] API Server started at http://0.0.0.0:${PORT}`);
  });
}

startServer();
