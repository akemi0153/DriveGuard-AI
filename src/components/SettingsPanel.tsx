import React, { useState, useEffect } from 'react';
import { Settings, DiskSpace } from '../types';
import { Save, Bell, Mail, HardDrive, Activity } from 'lucide-react';

interface Props {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  disks: DiskSpace[];
}

export default function SettingsPanel({ settings, onUpdate, disks }: Props) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Sync prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (e) {
      setMessage('Error saving settings.');
    }
    setIsSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none overflow-hidden max-w-3xl relative z-10 text-white">
      <div className="p-6 border-b border-white/10 bg-transparent">
         <h3 className="text-xl font-semibold text-white">Alert Configuration</h3>
         <p className="text-sm text-slate-400 mt-1">Configure thresholds and notification channels.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Bell className="w-4 h-4 text-slate-400" />
              Critical Alert Threshold (%)
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="50" max="99" 
                value={localSettings.alertThreshold}
                onChange={(e) => setLocalSettings({...localSettings, alertThreshold: parseInt(e.target.value)})}
                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-lg font-bold text-white w-12 text-right">
                {localSettings.alertThreshold}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              You will be notified when any drive capacity exceeds this percentage.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Alert Email Address
            </label>
            <input 
              type="email" 
              placeholder="admin@company.com"
              value={localSettings.alertEmail}
              onChange={(e) => setLocalSettings({...localSettings, alertEmail: e.target.value})}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
            />
            <p className="text-xs text-slate-500 mt-2">
              Alerts are aggregated to prevent spam. (Note: Email simulation in preview).
            </p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
              <HardDrive className="w-4 h-4 text-slate-400" />
              Drive-Specific Thresholds
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Override the global alert threshold for individual drives. Wait for Agent telemetry to populate drives here.
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {disks.length === 0 ? (
                <div className="text-sm text-slate-500 italic bg-white/5 p-4 rounded-lg border border-white/5">No drives monitored yet.</div>
              ) : (
                disks.map(disk => {
                  const id = `${disk.machineId}-${disk.driveLetter}`;
                  const threshold = localSettings.driveThresholds?.[id] ?? localSettings.alertThreshold;
                  
                  return (
                    <div key={id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{disk.machineId}</span>
                          <span className="text-xs font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">{disk.driveLetter}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-1">
                        <input 
                          type="range" 
                          min="50" max="99" 
                          value={threshold}
                          onChange={(e) => {
                            setLocalSettings({
                              ...localSettings, 
                              driveThresholds: {
                                ...localSettings.driveThresholds,
                                [id]: parseInt(e.target.value)
                              }
                            });
                          }}
                          className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                        />
                        <span className="text-sm font-bold text-white w-10 text-right">
                          {threshold}%
                        </span>
                        <button 
                         onClick={() => {
                           const newThresholds = { ...localSettings.driveThresholds };
                           delete newThresholds[id];
                           setLocalSettings({ ...localSettings, driveThresholds: newThresholds });
                         }}
                         disabled={localSettings.driveThresholds?.[id] === undefined}
                         className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                         title="Reset to global"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-4">
              <Activity className="w-4 h-4 text-slate-400" />
              Background Polling
            </label>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">Real-time Telemetry Polling</p>
                <p className="text-xs text-slate-500 mt-1">Automatically fetch the latest metrics every 10 seconds.</p>
              </div>
              <button
                type="button"
                onClick={() => setLocalSettings({...localSettings, pollingEnabled: !localSettings.pollingEnabled})}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${localSettings.pollingEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localSettings.pollingEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
           {message && (
             <span className={`text-sm font-medium ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
               {message}
             </span>
           )}
           <div className={message ? '' : 'ml-auto'}>
             <button 
               onClick={handleSave}
               disabled={isSaving}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
             >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}
