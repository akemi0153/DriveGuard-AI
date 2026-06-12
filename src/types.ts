export interface DiskSpace {
  machineId: string;
  driveLetter: string;
  totalSpace: number;
  usedSpace: number;
  lastUpdated: string;
  historical: { time: string; used: number }[];
  directories?: { path: string; sizeBytes: number }[];
}

export interface Alert {
  id: string;
  timestamp: string;
  machineId: string;
  driveLetter: string;
  message: string;
  type: 'warning' | 'critical' | 'resolved';
}

export interface Settings {
  alertThreshold: number;
  alertEmail: string;
  driveThresholds: Record<string, number>;
  pollingEnabled: boolean;
}
