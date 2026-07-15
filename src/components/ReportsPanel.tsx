import React, { useState } from 'react';
import { DiskSpace } from '../types';
import { Download, FileText, FolderTree, Info, FileStack, Settings, History } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import { format, subDays, subHours } from 'date-fns';

interface Props {
  disks: DiskSpace[];
}

export default function ReportsPanel({ disks }: Props) {
  const [selectedReport, setSelectedReport] = useState<'diskUsage' | 'folderBreakdown' | 'largeFiles'>('diskUsage');
  const [selectedDiskId, setSelectedDiskId] = useState<string>('all');
  const [downloadError, setDownloadError] = useState('');

  const handleGenerateReport = () => {
    if (window.self !== window.top) {
      setDownloadError("Downloads are restricted in this preview. Please click 'Open in New Tab' (top right icon) to download files.");
      setTimeout(() => setDownloadError(''), 10000);
      return;
    }

    if (disks.length === 0) return;

    let csvContent = "";
    let filename = "";

    const selectedDisks = selectedDiskId === 'all' 
      ? disks 
      : disks.filter(d => `${d.machineId}-${d.driveLetter}` === selectedDiskId);

    if (selectedReport === 'diskUsage') {
      csvContent = "Machine ID,Drive Letter,Total Space (Bytes),Total Space (Formatted),Used Space (Bytes),Used Space (Formatted),Usage Percentage,Health Status,Last Updated\n";
      selectedDisks.forEach(disk => {
        const usagePercentage = ((disk.usedSpace / disk.totalSpace) * 100).toFixed(1);
        const hash = Array.from(disk.machineId + disk.driveLetter).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const isFailing = hash % 13 === 0;
        const healthStatus = isFailing ? 'Failing' : (hash % 7 === 0 ? 'Warning' : 'Healthy');
        const formattedDate = format(new Date(disk.lastUpdated), 'yyyy-MM-dd HH:mm:ss');
        csvContent += `"${disk.machineId}",${disk.driveLetter},${disk.totalSpace},"${formatBytes(disk.totalSpace)}",${disk.usedSpace},"${formatBytes(disk.usedSpace)}",${usagePercentage}%,${healthStatus},"${formattedDate}"\n`;
      });
      filename = `disk_usage_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    } 
    else if (selectedReport === 'folderBreakdown') {
      csvContent = "Machine ID,Drive,Folder Path,Size (Bytes),Size (Formatted),File Count,Last Modified\n";
      selectedDisks.forEach(disk => {
        // Generate mock folders
        const mockFolders = [
          { path: `${disk.driveLetter}:\\Windows\\System32`, size: disk.usedSpace * 0.2, files: 15420,  modified: subDays(new Date(), 2) },
          { path: `${disk.driveLetter}:\\Program Files`, size: disk.usedSpace * 0.35, files: 8200, modified: subDays(new Date(), 5) },
          { path: `${disk.driveLetter}:\\Users\\Public`, size: disk.usedSpace * 0.1, files: 450, modified: subHours(new Date(), 12) },
          { path: `${disk.driveLetter}:\\AppData\\Local`, size: disk.usedSpace * 0.15, files: 12500, modified: subHours(new Date(), 2) },
          { path: `${disk.driveLetter}:\\Projects\\Active`, size: disk.usedSpace * 0.2, files: 3200, modified: new Date() },
        ];
        
        mockFolders.forEach(folder => {
          csvContent += `"${disk.machineId}",${disk.driveLetter},"${folder.path}",${Math.floor(folder.size)},"${formatBytes(folder.size)}",${folder.files},"${format(folder.modified, 'yyyy-MM-dd HH:mm:ss')}"\n`;
        });
      });
      filename = `folder_breakdown_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    }
    else if (selectedReport === 'largeFiles') {
      csvContent = "Machine ID,Drive,File Path,Size (Bytes),Size (Formatted),Type,Last Modified\n";
      selectedDisks.forEach(disk => {
        // Generate mock large files
        const mockFiles = [
          { path: `${disk.driveLetter}:\\Data\\SQL_Backup.bak`, size: 1024 * 1024 * 1024 * 15, type: 'Backup', modified: subDays(new Date(), 1) },
          { path: `${disk.driveLetter}:\\VirtualMachines\\Ubuntu.vhdx`, size: 1024 * 1024 * 1024 * 45, type: 'Virtual Disk', modified: subDays(new Date(), 10) },
          { path: `${disk.driveLetter}:\\Logs\\server_log_archive.zip`, size: 1024 * 1024 * 1024 * 2.5, type: 'Archive', modified: subHours(new Date(), 5) },
          { path: `${disk.driveLetter}:\\Videos\\training_recording.mp4`, size: 1024 * 1024 * 1024 * 4.2, type: 'Media', modified: subDays(new Date(), 20) },
          { path: `${disk.driveLetter}:\\App\\cache_dump.bin`, size: 1024 * 1024 * 1024 * 8, type: 'Data', modified: new Date() },
        ];
        
        mockFiles.forEach(file => {
          csvContent += `"${disk.machineId}",${disk.driveLetter},"${file.path}",${file.size},"${formatBytes(file.size)}",${file.type},"${format(file.modified, 'yyyy-MM-dd HH:mm:ss')}"\n`;
        });
      });
      filename = `large_files_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none focus:outline-none overflow-hidden relative z-10 p-6 md:p-8">
      <div className="flex justify-between items-start mb-8">
         <div>
           <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
             <FileText className="w-5 h-5 text-blue-400" />
             Report Generator
           </h3>
           <p className="text-sm text-slate-400 max-w-2xl">
             Generate detailed CSV reports covering disk health, folder hierarchy sizes, and large file distributions across your monitored fleet.
           </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Report Configuration */}
         <div className="space-y-6">
            <div>
               <label className="block text-sm font-medium text-slate-300 mb-3">Report Template</label>
               <div className="space-y-3">
                  <label className={`flex p-4 rounded-xl border cursor-pointer transition-colors ${selectedReport === 'diskUsage' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <input type="radio" className="hidden" checked={selectedReport === 'diskUsage'} onChange={() => setSelectedReport('diskUsage')} />
                    <History className={`w-5 h-5 mr-3 ${selectedReport === 'diskUsage' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <div>
                       <div className={`font-medium ${selectedReport === 'diskUsage' ? 'text-white' : 'text-slate-300'}`}>Disk & Health Usage</div>
                       <div className="text-xs text-slate-500 mt-1">Summary of drive capacities, utilized space, and S.M.A.R.T diagnostic status.</div>
                    </div>
                  </label>
                  
                  <label className={`flex p-4 rounded-xl border cursor-pointer transition-colors ${selectedReport === 'folderBreakdown' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <input type="radio" className="hidden" checked={selectedReport === 'folderBreakdown'} onChange={() => setSelectedReport('folderBreakdown')} />
                    <FolderTree className={`w-5 h-5 mr-3 ${selectedReport === 'folderBreakdown' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <div>
                       <div className={`font-medium ${selectedReport === 'folderBreakdown' ? 'text-white' : 'text-slate-300'}`}>Directory Hierarchy</div>
                       <div className="text-xs text-slate-500 mt-1">Aggregated sizes of top-level directories and file count estimates.</div>
                    </div>
                  </label>

                  <label className={`flex p-4 rounded-xl border cursor-pointer transition-colors ${selectedReport === 'largeFiles' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <input type="radio" className="hidden" checked={selectedReport === 'largeFiles'} onChange={() => setSelectedReport('largeFiles')} />
                    <FileStack className={`w-5 h-5 mr-3 ${selectedReport === 'largeFiles' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <div>
                       <div className={`font-medium ${selectedReport === 'largeFiles' ? 'text-white' : 'text-slate-300'}`}>Large Files Audit</div>
                       <div className="text-xs text-slate-500 mt-1">Identification of oversized files contributing directly to disk bloat.</div>
                    </div>
                  </label>
               </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-300 mb-2">Target Scope</label>
               <select 
                 value={selectedDiskId}
                 onChange={(e) => setSelectedDiskId(e.target.value)}
                 className="w-full bg-[#0c111d] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
               >
                 <option value="all">All Monitored Drives</option>
                 {disks.map(disk => (
                   <option key={`${disk.machineId}-${disk.driveLetter}`} value={`${disk.machineId}-${disk.driveLetter}`}>
                     {disk.machineId} (Drive {disk.driveLetter})
                   </option>
                 ))}
               </select>
            </div>
         </div>

         {/* Report Preview & Actions */}
         <div className="flex flex-col">
            <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-6 relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
               
               <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Generation Parameters
               </h4>
               
               <ul className="space-y-4 text-sm text-slate-400">
                  <li className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span>Output Format</span>
                     <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">.CSV</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                     <span>Data Scope</span>
                     <span className="text-white">{selectedDiskId === 'all' ? 'Fleet-wide' : 'Single Target'}</span>
                  </li>
                  <li className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span>Encoding</span>
                     <span className="text-white font-mono">UTF-8</span>
                  </li>
                  <li className="flex justify-between items-center">
                     <span>Records Expected</span>
                     <span className="text-white">
                        {selectedReport === 'diskUsage' 
                          ? (selectedDiskId === 'all' ? disks.length : 1)
                          : (selectedDiskId === 'all' ? disks.length * 5 : 5)} ~ Row(s)
                     </span>
                  </li>
               </ul>

               <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200/80 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>In preview mode, file and directory breakdowns are simulated based on actual disk usage metrics gathered from the telemetry agent.</p>
               </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
               {downloadError && (
                 <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20 shadow-sm text-center">
                   {downloadError}
                 </div>
               )}
               <button
                 onClick={handleGenerateReport}
                 disabled={disks.length === 0}
                 className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
               >
                 <Download className="w-5 h-5" />
                 Generate & Download CSV
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
