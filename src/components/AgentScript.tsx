import React, { useState } from 'react';
import { Terminal, Copy, CheckCircle2, FileCode2, Download } from 'lucide-react';

export default function AgentScript() {
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [activeScript, setActiveScript] = useState<'python' | 'powershell'>('python');
  const webHookUrl = `${window.location.origin}/api/telemetry`;

  const pythonScriptContent = `import os
import json
import socket
import urllib.request
import ctypes

WEBHOOK_URL = "${webHookUrl}"
DRIVES_TO_MONITOR = ["C:\\\\", "D:\\\\"]  # Update to monitor specific drives
DIRECTORIES_TO_MONITOR = []  # E.g. ["C:\\\\Program Files"] to recursively scan specific folders

def get_drive_space(drive):
    free_bytes = ctypes.c_ulonglong(0)
    total_bytes = ctypes.c_ulonglong(0)
    try:
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(ctypes.c_wchar_p(drive), None, ctypes.pointer(total_bytes), ctypes.pointer(free_bytes))
        return int(total_bytes.value), int(total_bytes.value - free_bytes.value)
    except Exception:
        return 0, 0

def get_dir_size(path):
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    try:
                        total_size += os.path.getsize(fp)
                    except Exception:
                        pass
    except Exception:
        pass
    return total_size

def run_agent():
    machine_id = socket.gethostname()
    
    # Pre-calculate targeted directory sizes
    dir_stats = []
    for d in DIRECTORIES_TO_MONITOR:
        if os.path.exists(d):
            dir_stats.append({"path": d, "sizeBytes": get_dir_size(d)})

    # Gather data for each drive independently
    for drive in DRIVES_TO_MONITOR:
        if not os.path.exists(drive):
            continue
            
        total, used = get_drive_space(drive)
        if total == 0:
            continue
            
        # Match directory stats to this specific drive
        drive_dirs = [ds for ds in dir_stats if ds['path'].upper().startswith(drive.upper())]
            
        data = {
            "machineId": machine_id,
            "driveLetter": drive.replace("\\\\", ""),
            "totalSpace": total,
            "usedSpace": used,
            "directories": drive_dirs
        }
        
        try:
            req = urllib.request.Request(WEBHOOK_URL, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as res:
                print(f"Sent telemetry for {drive}")
        except Exception as e:
            print(f"Failed to send telemetry for {drive}: {e}")

if __name__ == "__main__":
    run_agent()
`;

  const psScriptContent = `# Windows Drive Monitor - PowerShell Agent
# Run this on your target machine via Task Scheduler (e.g. every 5 minutes)

$webhookUrl = "${webHookUrl}"

try {
    # Get all local logical disks
    $disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"

    foreach ($disk in $disks) {
        $totalSpace = $disk.Size
        $freeSpace = $disk.FreeSpace
        $usedSpace = $totalSpace - $freeSpace

        $body = @{
            machineId = $env:COMPUTERNAME
            driveLetter = $disk.DeviceID
            totalSpace = [long]$totalSpace
            usedSpace = [long]$usedSpace
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        Write-Output "Sent telemetry for $($disk.DeviceID) from $($env:COMPUTERNAME)"
    }
} catch {
    Write-Error "Failed to send telemetry: $_"
}
`;

  const scriptContent = activeScript === 'python' ? pythonScriptContent : psScriptContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (window.self !== window.top) {
      setDownloadError("Downloads are restricted in this preview. Please click 'Open in New Tab' (top right icon) to download files.");
      setTimeout(() => setDownloadError(''), 10000);
      return;
    }
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', activeScript === 'python' ? 'agent.py' : 'monitor.ps1');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none overflow-hidden max-w-4xl relative z-10 text-white">
      <div className="p-6 border-b border-white/10 bg-transparent flex justify-between items-center">
         <div>
           <h3 className="text-xl font-semibold text-white">Deploy Agent Script</h3>
           <p className="text-sm text-slate-400 mt-1">To automatically validate and monitor files without manual checking throughout directories.</p>
         </div>
         <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
           <button 
             onClick={() => setActiveScript('python')}
             className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeScript === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
           >
             Python
           </button>
           <button 
             onClick={() => setActiveScript('powershell')}
             className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeScript === 'powershell' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
           >
             PowerShell
           </button>
         </div>
      </div>
      
      <div className="p-6">
         <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
             {activeScript === 'python' ? <FileCode2 className="w-5 h-5 text-slate-400" /> : <Terminal className="w-5 h-5 text-slate-400" />}
             {activeScript === 'python' ? 'Python Script (Includes Recursive Directory Scanning)' : 'PowerShell Script (Drive Level Only)'}
           </div>
           <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
             {downloadError && (
               <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 max-w-[300px] truncate" title={downloadError}>
                 {downloadError}
               </span>
             )}
             <div className="flex items-center gap-2">
               <button 
                 onClick={handleCopy}
                 className="flex items-center gap-2 text-sm text-white hover:bg-white/10 font-medium bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
               >
                 {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                 {copied ? 'Copied!' : 'Copy Script'}
               </button>
               <button 
                 onClick={handleDownload}
                 className="flex items-center gap-2 text-sm text-white hover:bg-blue-500/20 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
               >
                 <Download className="w-4 h-4 text-blue-400" />
                 Download
               </button>
             </div>
           </div>
        </div>
        
        <div className="relative">
          <pre className="bg-[#0c111d]/50 text-[#d4d4d4] p-4 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-white/10 max-h-[400px]">
            <code>
{scriptContent}
            </code>
          </pre>
        </div>
        
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
           <h4 className="text-blue-300 font-semibold mb-2 text-sm">Deployment Instructions</h4>
           <div className="text-blue-200/80 text-sm">
             <p className="mb-3">Follow these steps to deploy the telemetry agent across your infrastructure.</p>
             {activeScript === 'python' ? (
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Requirements:</strong> Windows, Linux, or macOS machine with <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">Python 3.x</code> installed.</li>
                  <li><strong>Download:</strong> Click the Download button above to save as <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">agent.py</code>.</li>
                  <li><strong>Configure:</strong> Open the file in a text editor to update the <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">DRIVES_TO_MONITOR</code> and <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">DIRECTORIES_TO_MONITOR</code> variables.</li>
                  <li><strong>Deploy (Windows):</strong> Open Task Scheduler {'->'} Create Task {'->'} Set Trigger to repeat (e.g. every 5 min) {'->'} Set Action to 'Start a program' with <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">python</code> as program and path to <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">agent.py</code> as argument.</li>
                  <li><strong>Deploy (Linux):</strong> Open crontab (<code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">crontab -e</code>) and add <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">*/5 * * * * python3 /path/to/agent.py</code>.</li>
                </ul>
             ) : (
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Requirements:</strong> Windows Machine with PowerShell enabled.</li>
                  <li><strong>Download:</strong> Click the Download button above and save the script to <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">C:\monitor.ps1</code>.</li>
                  <li><strong>Open Task Scheduler:</strong> Press Win+R, type <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">taskschd.msc</code>, and click "Create Basic Task...".</li>
                  <li><strong>Trigger:</strong> Name it "Drive Monitor", set trigger to "Daily", and in Advanced Settings configure it to repeat every 5-10 minutes.</li>
                  <li><strong>Action:</strong> Set action to "Start a program".</li>
                  <li><strong>Program:</strong> <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">powershell.exe</code></li>
                  <li><strong>Arguments:</strong> <code className="bg-black/30 px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-100">-ExecutionPolicy Bypass -WindowStyle Hidden -File C:\monitor.ps1</code></li>
                  <li>Save and run the task manually once to verify connectivity.</li>
                </ul>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
