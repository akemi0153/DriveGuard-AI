import React, { useState, useEffect } from 'react';
import { Settings, DiskSpace, Alert } from './types';
import Dashboard from './components/Dashboard';
import DisksList from './components/DisksList';
import AlertsPanel from './components/AlertsPanel';
import SettingsPanel from './components/SettingsPanel';
import AgentScript from './components/AgentScript';
import FileInspector from './components/FileInspector';
import ReportsPanel from './components/ReportsPanel';
import { HardDrive, Activity, AlertTriangle, Settings as SettingsIcon, TerminalSquare, FolderSearch, Sun, Moon, FileText } from 'lucide-react';

type Tab = 'dashboard' | 'disks' | 'alerts' | 'inspector' | 'reports' | 'settings' | 'agent';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [disks, setDisks] = useState<DiskSpace[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<Settings>({ alertThreshold: 90, alertEmail: '', driveThresholds: {}, pollingEnabled: true });

  const fetchData = async () => {
    try {
      const [disksRes, alertsRes, settingsRes] = await Promise.all([
        fetch('/api/disks'),
        fetch('/api/alerts'),
        fetch('/api/settings')
      ]);
      
      if (disksRes.ok) setDisks(await disksRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }
  };

  useEffect(() => {
    fetchData();

    // Source Protection
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Prevent Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
      }
      // Prevent Ctrl+U
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
      // Prevent Ctrl+S, Ctrl+P
      if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.key === 'P' || e.key === 'p')) {
         e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (settings.pollingEnabled) {
       interval = setInterval(fetchData, 10000); // Poll every 10s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.pollingEnabled]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'disks', label: 'Drives', icon: HardDrive },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'inspector', label: 'File Inspector', icon: FolderSearch },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Configuration', icon: SettingsIcon },
    { id: 'agent', label: 'Deploy Agent', icon: TerminalSquare },
  ];

  return (
    <div className={`min-h-screen bg-[#0c111d] flex flex-col font-sans text-white relative overflow-x-hidden ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* Background Mesh Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <HardDrive className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">DriveGuard <span className="text-blue-400">AI</span></h1>
            </div>
            
            <button
               onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
               className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
               title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Navigation */}
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-4 sm:pb-0 sm:h-12 items-end custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap rounded-t-lg
                    ${isActive 
                      ? 'border-blue-500 text-white bg-white/5' 
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.id === 'alerts' && alerts.filter(a => a.type === 'critical').length > 0 && (
                     <span className="ml-1.5 flex h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
         {activeTab === 'dashboard' && <Dashboard disks={disks} />}
         {activeTab === 'disks' && <DisksList disks={disks} settings={settings} onUpdateSettings={setSettings} />}
         {activeTab === 'alerts' && <AlertsPanel alerts={alerts} />}
         {activeTab === 'inspector' && <FileInspector />}
         {activeTab === 'reports' && <ReportsPanel disks={disks} />}
         {activeTab === 'settings' && <SettingsPanel settings={settings} onUpdate={setSettings} disks={disks} />}
         {activeTab === 'agent' && <AgentScript />}
      </main>
    </div>
  );
}
