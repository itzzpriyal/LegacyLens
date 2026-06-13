import { motion } from 'framer-motion';
import type { SecuritySummary } from '../../types';
import ScoreGauge from '../shared/ScoreGauge';
import { SeverityBadge } from '../shared/RiskBadge';
import { Shield, Key, Lock, AlertOctagon } from 'lucide-react';

interface SecurityDashboardProps {
  data: SecuritySummary;
}

const TYPE_META: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  hardcoded_secret: { label: 'Hardcoded Secrets', icon: Lock, color: '#ef4444' },
  api_key: { label: 'API Keys', icon: Key, color: '#f97316' },
  weak_auth: { label: 'Weak Auth', icon: AlertOctagon, color: '#eab308' },
};

export default function SecurityDashboard({ data }: SecurityDashboardProps) {
  const { overall_security_score, total_findings, findings, by_type, by_severity } = data;

  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
  };

  return (
    <div className="space-y-6">
      {/* Score + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <ScoreGauge score={overall_security_score} label="Security Score" size="lg" inverse={true} />
          <p className="text-xs text-slate-500 mt-4 text-center max-w-32">
            100 = fully secure. Deductions per finding severity.
          </p>
        </motion.div>

        {/* By severity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            By Severity
          </h3>
          <div className="space-y-3">
            {severityOrder.map(sev => {
              const count = by_severity[sev] || 0;
              const max = Math.max(...severityOrder.map(s => by_severity[s] || 0), 1);
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16 capitalize">{sev}</span>
                  <div className="flex-1 progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(count / max) * 100}%`,
                        background: severityColors[sev],
                        boxShadow: count > 0 ? `0 0 8px ${severityColors[sev]}60` : 'none',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-300 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* By type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            By Type ({total_findings} total)
          </h3>
          <div className="space-y-4">
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const count = by_type[type] || 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
                  >
                    <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">{meta.label}</p>
                    <p className="text-lg font-bold" style={{ color: meta.color }}>{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Findings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Security Findings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {findings.slice(0, 50).map((finding, i) => (
                <motion.tr
                  key={finding.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.02 }}
                >
                  <td>
                    <span className="font-mono text-xs text-slate-400 truncate block max-w-[180px]" title={finding.file_path}>
                      {finding.file_path.split('/').pop()}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const meta = TYPE_META[finding.finding_type];
                      return meta ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: meta.color }}>
                          <meta.icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{finding.finding_type}</span>
                      );
                    })()}
                  </td>
                  <td><SeverityBadge severity={finding.severity} /></td>
                  <td className="text-slate-400 text-xs max-w-xs">{finding.description}</td>
                  <td className="text-slate-500 text-xs">{finding.line_number || '—'}</td>
                </motion.tr>
              ))}
              {findings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 py-8">
                    <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No security issues detected!
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
