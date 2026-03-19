
import React from 'react';
import { useStore } from '../store/useStore';
import { Badge } from '../components/ui/Common';
import { AlertCircle, Calendar, FileText, Upload, CheckCircle2 } from 'lucide-react';

export const MyReports = () => {
  const reports = useStore(s => s.reports);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900">Prestação de Contas</h2>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
           <AlertCircle className="w-4 h-4 text-amber-500" /> Prazo: 5 dias úteis após o retorno.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report) => (
          <div key={report.id} className={`bg-white p-8 rounded-[35px] border ${report.isOverdue && report.status === 'PENDENTE' ? 'border-red-200 ring-4 ring-red-50' : 'border-slate-100'} flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-xl transition-all`}>
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-3xl ${report.isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <FileText size={32} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-black text-slate-900 text-lg leading-none">{report.id}</p>
                  <Badge variant={report.isOverdue ? 'red' : report.status === 'PENDENTE' ? 'amber' : 'blue'}>{report.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase">{report.destiny} • Retorno: {report.date}</p>
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                 <Calendar size={14} /> Prazo Final: <span className={report.isOverdue ? 'text-red-600' : 'text-slate-800'}>{report.deadline}</span>
              </div>
              {report.status === 'PENDENTE' ? (
                <button className="bg-slate-900 text-white text-xs font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-blue-600 transition-all">
                  <Upload size={16} /> Enviar Comprovantes
                </button>
              ) : (
                <div className="text-[10px] text-green-600 font-black flex items-center gap-2 bg-green-50 px-5 py-2.5 rounded-full border border-green-100">
                  <CheckCircle2 size={16} /> Recebido pela FADEX
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
