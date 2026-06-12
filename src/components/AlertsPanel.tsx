import React from 'react';
import { Alert } from '../types';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  alerts: Alert[];
}

export default function AlertsPanel({ alerts }: Props) {
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-none overflow-hidden max-w-3xl relative z-10 text-white">
      <div className="p-6 border-b border-white/10 bg-transparent flex justify-between items-center">
         <div>
           <h3 className="text-xl font-semibold text-white">Recent Alerts</h3>
           <p className="text-sm text-slate-400 mt-1">Status logs and threshold notifications.</p>
         </div>
      </div>

      <div className="divide-y divide-white/10 max-h-[600px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
             <CheckCircle2 className="w-12 h-12 text-green-500/20 mb-3" />
             <p>All clear. No recent alerts.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="p-4 hover:bg-white/5 transition-colors flex gap-4">
              <div className="mt-1">
                 {alert.type === 'critical' ? (
                   <AlertTriangle className="w-5 h-5 text-red-400" />
                 ) : alert.type === 'warning' ? (
                   <Info className="w-5 h-5 text-yellow-400" />
                 ) : (
                   <CheckCircle2 className="w-5 h-5 text-green-400" />
                 )}
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <p className={`text-sm font-semibold ${alert.type === 'critical' ? 'text-red-400' : 'text-slate-200'}`}>
                     {alert.machineId} | {alert.driveLetter}
                   </p>
                   <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                   </span>
                 </div>
                 <p className="text-sm text-slate-400 mt-1.5">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
