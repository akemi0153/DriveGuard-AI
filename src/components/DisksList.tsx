import React, { useState } from 'react';
import { DiskSpace, Settings } from '../types';
import { formatBytes } from '../lib/utils';
import { Download, AlertCircle, Activity, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  disks: DiskSpace[];
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export default function DisksList({ disks, settings, onUpdateSettings }: Props) {
  const [downloadError, setDownloadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const mockDiscoveredDrives = [
    { machineId: 'SRV-DB-01', driveLetter: 'F:', totalSpaceGB: 1024, usedSpaceGB: 450 },
    { machineId: 'SRV-WEB-02', driveLetter: 'D:', totalSpaceGB: 512, usedSpaceGB: 480 },
    { machineId: 'SRV-NAS-01', driveLetter: 'Z:', totalSpaceGB: 8192, usedSpaceGB: 6000 },
    { machineId: 'DEV-WS-05', driveLetter: 'E:', totalSpaceGB: 2048, usedSpaceGB: 100 },
  ];

  const [selectedDriveIndex, setSelectedDriveIndex] = useState(0);

  const handleAddDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const drive = mockDiscoveredDrives[selectedDriveIndex];
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: drive.machineId,
          driveLetter: drive.driveLetter,
          totalSpace: drive.totalSpaceGB * 1024 * 1024 * 1024,
          usedSpace: drive.usedSpaceGB * 1024 * 1024 * 1024,
          directories: []
        })
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
    setIsAdding(false);
  };

  const handleExportCSV = () => {
    if (disks.length === 0) return;
    
    if (window.self !== window.top) {
      setDownloadError("Downloads are restricted in this preview. Please click 'Open in New Tab' (top right icon) to download files.");
      setTimeout(() => setDownloadError(''), 5000);
      return;
    }
    
    // Create CSV header
    let csvContent = "Machine ID,Drive Letter,Total Space (Bytes),Total Space (Formatted),Used Space (Bytes),Used Space (Formatted),Usage Percentage,Last Updated\n";
    
    // Add rows
    disks.forEach(disk => {
      const formattedTotal = formatBytes(disk.totalSpace);
      const formattedUsed = formatBytes(disk.usedSpace);
      const percentage = ((disk.usedSpace / disk.totalSpace) * 100).toFixed(2);
      const updated = new Date(disk.lastUpdated).toLocaleString();
      
      const row = `"${disk.machineId}","${disk.driveLetter}",${disk.totalSpace},"${formattedTotal}",${disk.usedSpace},"${formattedUsed}","${percentage}%","${updated}"\n`;
      csvContent += row;
    });

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `disk_usage_report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none focus:outline-none overflow-hidden relative z-10">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-transparent">
         <h3 className="text-xl font-semibold text-white">Monitored Drives</h3>
         <div className="flex items-center gap-3">
           {downloadError && (
             <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 max-w-[300px] truncate" title={downloadError}>
               {downloadError}
             </span>
           )}
           <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
           >
              <Download className="w-4 h-4" />
              Export CSV
           </button>
           <button 
             onClick={() => setShowAddModal(true)}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
           >
              <Plus className="w-4 h-4" />
              Add Drive
           </button>
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap text-white">
          <thead className="bg-transparent border-b border-white/10 text-slate-400 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4">Machine</th>
              <th className="px-6 py-4">Drive</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">S.M.A.R.T.</th>
              <th className="px-6 py-4 w-1/3">Capacity</th>
              <th className="px-6 py-4">Last Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {disks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  No disks monitored yet. Deploy the agent to start collecting data.
                </td>
              </tr>
            ) : (
              disks.map(disk => {
                const percent = (disk.usedSpace / disk.totalSpace) * 100;
                const isCritical = percent > 90;
                const isWarning = percent > 75 && percent <= 90;
                
                return (
                  <tr key={`${disk.machineId}-${disk.driveLetter}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{disk.machineId}</td>
                    <td className="px-6 py-4">
                       <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-sm font-bold text-white">
                         {disk.driveLetter}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      {isCritical ? (
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                           <AlertCircle className="w-3 h-3" /> Critical
                         </span>
                      ) : isWarning ? (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                           Warning
                         </span>
                      ) : (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-green-500/20 text-green-400 border border-green-500/30">
                           Healthy
                         </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                         const hash = Array.from(disk.machineId + disk.driveLetter).reduce((acc, char) => acc + char.charCodeAt(0), 0);
                         const isFailing = hash % 13 === 0;
                         const isSmartWarning = !isFailing && hash % 7 === 0;
                         
                         if (isFailing) {
                           return (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-red-500/10 text-red-400 border border-red-500/20">
                               <AlertCircle className="w-3 h-3" /> Failing
                             </span>
                           );
                         } else if (isSmartWarning) {
                           return (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                               Warning
                             </span>
                           );
                         }
                         return (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter bg-green-500/10 text-green-400 border border-green-500/20">
                             OK
                           </span>
                         );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                          <span className="text-white">{formatBytes(disk.usedSpace)}</span>
                          <span>{formatBytes(disk.totalSpace)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                           <div 
                              className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : isWarning ? 'bg-yellow-500 shadow-[0_0_10px_#eab308]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`} 
                              style={{ width: `${percent}%` }}
                           ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {format(new Date(disk.lastUpdated), 'MMM dd, HH:mm:ss')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Add Drive
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDrive} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Discovered Unmonitored Drives</label>
                  <div className="space-y-3">
                    {mockDiscoveredDrives.map((drive, idx) => (
                      <label 
                        key={idx}
                        className={`flex p-4 rounded-xl border cursor-pointer transition-colors ${selectedDriveIndex === idx ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        <input 
                          type="radio" 
                          name="drive"
                          className="hidden" 
                          checked={selectedDriveIndex === idx} 
                          onChange={() => setSelectedDriveIndex(idx)} 
                        />
                        <div className="flex-1">
                           <div className={`font-medium ${selectedDriveIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                             {drive.machineId} (Drive {drive.driveLetter})
                           </div>
                           <div className="text-xs text-slate-500 mt-1">
                             {drive.totalSpaceGB} GB Total • {drive.usedSpaceGB} GB Used
                           </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : 'Add Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
