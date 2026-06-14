import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DebtSummary, DebtCategory } from '../../types';
import ScoreGauge from '../shared/ScoreGauge';
import { SeverityBadge } from '../shared/RiskBadge';
import { Bug, Layers, RotateCcw, Copy, Key, Hash } from 'lucide-react';

interface DebtDashboardProps {
  data: DebtSummary;
}

const CATEGORY_META: Record<DebtCategory, { label: string; icon: typeof Bug; color: string }> = {
  god_class: { label: 'God Classes', icon: Layers, color: '#a855f7' },
  long_method: { label: 'Long Methods', icon: Hash, color: '#f97316' },
  circular_dep: { label: 'Circular Dependencies', icon: RotateCcw, color: '#ef4444' },
  duplicate_code: { label: 'Duplicate Code', icon: Copy, color: '#eab308' },
  hardcoded_value: { label: 'Hardcoded Values', icon: Key, color: '#22c55e' },
};

export default function DebtDashboard({ data }: DebtDashboardProps) {
  const { overall_debt_score, items, by_category } = data;

  const chartData = Object.entries(by_category).map(([cat, count]) => ({
    name: CATEGORY_META[cat as DebtCategory]?.label || cat,
    count,
    color: CATEGORY_META[cat as DebtCategory]?.color || '#6366f1',
  }));

  return (
    <div className="space-y-6">
      {/* Score + Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <ScoreGauge score={overall_debt_score} label="Technical Debt Score" size="lg" />
          
          <div className="mt-6 border-t border-slate-800/60 pt-4 text-left w-full space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Technical Debt</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Technical debt represents the accumulation of poorly designed, duplicated, or overly complex code. If left unchecked, it makes future updates slower and more difficult. 
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-400 mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span>0 - 20</span>
                <span className="text-emerald-400 font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span>21 - 50</span>
                <span className="text-amber-400 font-medium">Needs Attention</span>
              </div>
              <div className="flex items-center justify-between">
                <span>51+</span>
                <span className="text-red-400 font-medium">Critical Risk</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Issues by Category
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" barSize={20}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '10px',
                    color: '#f1f5f9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500">
              No debt items detected
            </div>
          )}
        </motion.div>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(Object.entries(CATEGORY_META) as [DebtCategory, typeof CATEGORY_META.god_class][]).map(([cat, meta], i) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-4 text-center"
          >
            <div
              className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2"
              style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
            >
              <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
            </div>
            <p className="text-xl font-bold text-slate-100">{by_category[cat] || 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{meta.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Debt Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Debt Items ({items.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Category</th>
                <th>Description</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 50).map((item, i) => {
                const meta = CATEGORY_META[item.category as DebtCategory];
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.02 }}
                  >
                    <td>
                      <span className="font-mono text-xs text-slate-400 truncate block max-w-[200px]" title={item.file_path}>
                        {item.file_path.split('/').pop()}
                      </span>
                    </td>
                    <td>
                      {meta && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span style={{ color: meta.color }}>{meta.label}</span>
                        </span>
                      )}
                    </td>
                    <td className="text-slate-400 text-xs max-w-xs">{item.description}</td>
                    <td><SeverityBadge severity={item.severity} /></td>
                  </motion.tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500 py-8">No debt items detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
