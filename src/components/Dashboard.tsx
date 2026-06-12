import React from 'react';
import { DiskSpace } from '../types';
import { formatBytes } from '../lib/utils';
import { Server, HardDrive, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface Props {
  disks: DiskSpace[];
}

export default function Dashboard({ disks }: Props) {
  const totalStorage = disks.reduce((acc, current) => acc + current.totalSpace, 0);
  const usedStorage = disks.reduce((acc, current) => acc + current.usedSpace, 0);
  const percentUsed = totalStorage ? (usedStorage / totalStorage) * 100 : 0;
  
  const criticalDisks = disks.filter(d => (d.usedSpace / d.totalSpace) > 0.90);

  // Aggregate historical data across all disks
  const aggregatedHistory: any = {};
  disks.forEach(disk => {
    disk.historical.forEach(h => {
      const timeStr = format(new Date(h.time), 'HH:mm');
      if (!aggregatedHistory[timeStr]) {
         aggregatedHistory[timeStr] = { time: timeStr, total: 0, used: 0 };
      }
      aggregatedHistory[timeStr].total += disk.totalSpace;
      // Normalizing data points if there's minor discrepancy in tracking counts
      if (aggregatedHistory[timeStr].used === 0) {
        // Initial setup for the timestamp
      }
    });
  });
  
  // Real logic for cumulative used over time: requires mapping time buckets
  // Let's do a simple aggregation: picking the first disk's historical timestamps as baseline
  const timelineData = disks.length > 0 ? disks[0].historical.map((h, i) => {
     let sumUsed = 0;
     let sumTotal = 0;
     disks.forEach(d => {
       const dh = d.historical[i] || d.historical[d.historical.length - 1]; // fallback to last known if mismatched
       if (dh) sumUsed += dh.used;
       sumTotal += d.totalSpace;
     });
     return {
       time: format(new Date(h.time), 'HH:mm'),
       UsagePercentage: sumTotal ? ((sumUsed / sumTotal) * 100).toFixed(2) : 0,
       RawUsed: sumUsed
     };
  }) : [];


  return (
    <div className="space-y-6 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 text-white">
           <div className="flex items-center justify-between mb-1">
              <h3 className="text-slate-400 text-sm uppercase tracking-widest font-semibold flex-1">Total Monitored Disks</h3>
              <HardDrive className="h-5 w-5 text-blue-400" />
           </div>
           <p className="text-4xl font-bold mb-4 tracking-tighter">{disks.length}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 text-white">
           <div className="flex items-center justify-between mb-1">
              <h3 className="text-slate-400 text-sm uppercase tracking-widest font-semibold flex-1">Aggregate Usage</h3>
              <Server className="h-5 w-5 text-blue-400" />
           </div>
           <p className="text-4xl font-bold mb-4 tracking-tighter">{formatBytes(usedStorage)} <span className="text-lg text-slate-500">/ {formatBytes(totalStorage)}</span></p>
           <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full ${percentUsed > 90 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`} style={{ width: `${percentUsed}%` }}></div>
           </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 text-white">
           <div className="flex items-center justify-between mb-1">
              <h3 className="text-slate-400 text-sm uppercase tracking-widest font-semibold flex-1">Critical Warnings</h3>
              <AlertTriangle className={`h-5 w-5 ${criticalDisks.length > 0 ? 'text-red-400' : 'text-green-400 animate-pulse'}`} />
           </div>
           <p className={`text-4xl font-bold mb-4 tracking-tighter ${criticalDisks.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{criticalDisks.length}</p>
           {criticalDisks.length > 0 && <p className="text-xs text-slate-500">{criticalDisks.length} drive(s) approaching critical threshold</p>}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 text-white">
        <h3 className="text-xl font-semibold mb-6">Aggregate Usage Trend (%)</h3>
        <div className="h-72 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
               <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
               <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} domain={[0, 100]} />
               <Tooltip 
                 contentStyle={{ backgroundColor: 'rgba(12, 17, 29, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px -1px rgb(0 0 0 / 0.5)' }}
                 labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                 itemStyle={{ color: '#38bdf8' }}
               />
               <Area type="monotone" dataKey="UsagePercentage" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsage)" />
             </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
