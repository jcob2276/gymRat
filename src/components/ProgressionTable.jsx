import { BENCH_PROGRESSION } from '../data/workoutPlan';
import { Trophy } from 'lucide-react';

export default function ProgressionTable() {
  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-neutral-900 p-4 border-b border-neutral-800 flex items-center gap-2">
        <Trophy className="text-primary" size={18} />
        <h3 className="font-black text-white uppercase text-sm tracking-tight">Progresja Bench (12 Tyg.)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-neutral-900/50 text-neutral-500 uppercase font-black">
              <th className="p-3">Tydz.</th>
              <th className="p-3">Dzień A (Ciężko)</th>
              <th className="p-3">Dzień D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {BENCH_PROGRESSION.map((row, idx) => (
              <tr key={idx} className={row.isPR ? 'bg-primary/10' : ''}>
                <td className="p-3 font-bold text-neutral-400">{row.week}</td>
                <td className="p-3 text-white font-medium">{row.target}</td>
                <td className="p-3 text-neutral-500">{row.light}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
