import { motion } from 'framer-motion';
import type { DashboardSummary } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileCode2, AlertTriangle, Activity, Bug } from 'lucide-react';
import ScoreGauge from '../shared/ScoreGauge';
import RiskBadge from '../shared/RiskBadge';

interface DashboardProps {
  data: DashboardSummary;
}

const RISK_COLORS = {
  Low: '#22c55e',
  Medium: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function Dashboard({ data }: DashboardProps) {
  const { project, risk_distribution, top_risky_files } = data;

  const pieData = [
    { name: 'Low', value: risk_distribution.low, color: RISK_COLORS.Low },
    { name: 'Medium', value: risk_distribution.medium, color: RISK_COLORS.Medium },
    { name: 'High', value: risk_distribution.high, color: RISK_COLORS.High },
    { name: 'Critical', value: risk_distribution.critical, color: RISK_COLORS.Critical },
  ].filter(d => d.value > 0);

  const summaryCards = [
    {
      icon: FileCode2,
      label: 'Total Files',
      value: project.total_files.toString(),
      color: 'text-primary-400',
      bg: 'bg-primary-500/10 border-primary-500/20',
      description: 'The total number of source code files successfully parsed and analyzed in this repository.',
    },
    {
      icon: Activity,
      label: 'Avg Risk Score',
      value: project.avg_risk_score.toFixed(1),
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      description: 'The mean of all per-file risk scores (0–100), where higher values indicate files more likely to break during migration.',
    },
    {
      icon: AlertTriangle,
      label: 'Critical Modules',
      value: risk_distribution.critical.toString(),
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      description: 'The absolute count of files flagged as CRITICAL risk due to extreme complexity, circular dependencies, or secrets.',
    },
    {
      icon: Bug,
      label: 'Debt Score',
      value: project.overall_debt_score.toFixed(1),
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      description: 'An aggregated score reflecting the volume of technical debt, God classes, and convoluted logic in the codebase.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="glass-card p-5 relative group cursor-pointer hover:z-50"
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="absolute top-4 right-4 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] uppercase tracking-widest flex items-center gap-1 font-semibold border border-slate-700/50 rounded-full px-2 py-0.5 bg-slate-900/50">
                <span className="text-xs pb-[1px]">ⓘ</span> Info
              </span>
            </div>

            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-800/95 backdrop-blur border border-slate-600/50 rounded-lg text-[11px] text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl z-50 text-center pointer-events-none leading-relaxed">
              {card.description}
            </div>

            <p className="text-2xl font-bold text-slate-100">{card.value}</p>
            <p className="text-sm text-slate-400 mt-0.5 border-b border-dashed border-slate-600/50 inline-block">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Score Gauges + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Gauges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Project Health Scores
          </h3>
          <div className="flex items-center justify-around flex-wrap gap-6">
            <ScoreGauge
              score={project.migration_readiness_score}
              label="Migration Readiness"
              size="lg"
              inverse={true}
              description="An overall percentage evaluating how easily this codebase can be migrated or refactored, based on dependencies and architecture."
            />
            <ScoreGauge
              score={project.overall_security_score}
              label="Security Score"
              size="md"
              inverse={true}
              description="A composite score reflecting the absence of hardcoded secrets and known vulnerabilities in the code."
            />
            <ScoreGauge
              score={project.avg_risk_score}
              label="Avg Risk"
              size="md"
              description="The mean risk level across all files. Higher risk indicates more complex, deeply coupled, or problematic code."
            />
            <ScoreGauge
              score={project.overall_debt_score}
              label="Debt Score"
              size="md"
              description="A measure of accumulated technical debt (e.g. God classes, poor modularity). Higher is worse."
            />
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Risk Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                      style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '13px',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} files (${((value / project.total_files) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-500">
              No files analyzed yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Top Risky Files Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Top Risk Files
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Language</th>
                <th>Risk</th>
                <th>LOC</th>
                <th>Complexity</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {top_risky_files.map((file, i) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                >
                  <td>
                    <div className="max-w-xs truncate font-mono text-xs text-slate-300"
                         title={file.relative_path}>
                      {file.relative_path}
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      file.language === 'java'
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {file.language}
                    </span>
                  </td>
                  <td>
                    <RiskBadge level={file.risk_level} score={file.risk_score} />
                  </td>
                  <td className="text-slate-400">{file.loc.toLocaleString()}</td>
                  <td className="text-slate-400">{file.cyclomatic_complexity.toFixed(1)}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {file.has_god_class && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">God Class</span>
                      )}
                      {file.has_circular_dep && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">Circular</span>
                      )}
                      {file.has_hardcoded_secrets && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">Secrets</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {top_risky_files.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-8">
                    No files analyzed yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
