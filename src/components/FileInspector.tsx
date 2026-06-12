import React, { useState, useRef } from 'react';
import { FolderSearch, File as FileIcon, HardDrive, RefreshCw } from 'lucide-react';
import { formatBytes } from '../lib/utils';

export default function FileInspector() {
  const [files, setFiles] = useState<{name: string, size: number, path: string}[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsScanning(true);
    
    setTimeout(() => {
      const fileList = Array.from(e.target.files as FileList) as (File & { webkitRelativePath?: string })[];
      let size = 0;
      const parsedFiles = fileList.map(f => {
        size += f.size;
        return {
          name: f.name,
          size: f.size,
          path: f.webkitRelativePath || f.name
        };
      });
      
      // Sort by size descending
      parsedFiles.sort((a, b) => b.size - a.size);
      
      setFiles(parsedFiles);
      setTotalSize(size);
      setIsScanning(false);
    }, 100);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none overflow-hidden max-w-4xl relative z-10 text-white">
      <div className="p-6 border-b border-white/10 bg-transparent flex justify-between items-center">
         <div>
           <h3 className="text-xl font-semibold text-white">Manual Capacity Inspector</h3>
           <p className="text-sm text-slate-400 mt-1">Upload folders or files locally to analyze their size breakdown.</p>
         </div>
      </div>
      
      <div className="p-6">
        <div className="flex gap-4 mb-8">
           <button 
             onClick={() => folderInputRef.current?.click()}
             className="flex-1 border-2 border-dashed border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/10 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer"
           >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <FolderSearch className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Scan Folder</p>
                <p className="text-xs text-slate-400 mt-1">Select a local directory to analyze size</p>
              </div>
              {/* @ts-ignore */}
              <input type="file" webkitdirectory="" directory="" multiple className="hidden" ref={folderInputRef} onChange={handleFileChange} />
           </button>
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex-1 border-2 border-dashed border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/10 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer"
           >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <FileIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Scan Files</p>
                <p className="text-xs text-slate-400 mt-1">Select specific files to analyze size</p>
              </div>
              <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
           </button>
        </div>

        {isScanning ? (
          <div className="flex items-center justify-center py-12">
             <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
             <span className="ml-3 text-slate-300">Analyzing files...</span>
          </div>
        ) : files.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4 mt-8">
              <h4 className="text-lg font-semibold text-white">Analysis Results</h4>
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tighter text-blue-400">{formatBytes(totalSize)}</p>
                <p className="text-xs text-slate-400">{files.length} items scanned</p>
              </div>
            </div>
            
            <div className="bg-[#0c111d]/50 rounded-xl border border-white/10 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Path</th>
                    <th className="px-4 py-3 font-medium text-right w-32">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {files.slice(0, 100).map((f, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={f.name}>{f.name}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[300px]" title={f.path}>{f.path}</td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono text-xs">{formatBytes(f.size)}</td>
                    </tr>
                  ))}
                  {files.length > 100 && (
                    <tr>
                       <td colSpan={3} className="px-4 py-3 text-center text-slate-500 italic text-xs">
                         Showing top 100 largest files... (+{files.length - 100} more)
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 border border-white/5 rounded-xl bg-white/5">
             <HardDrive className="w-12 h-12 mx-auto text-slate-600 mb-3" />
             <p>No files scanned yet. Select files or a folder to preview sizes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
