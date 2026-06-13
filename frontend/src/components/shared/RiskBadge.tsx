import type { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  className?: string;
}

const COLORS: Record<RiskLevel, string> = {
  Low: 'badge-low',
  Medium: 'badge-medium',
  High: 'badge-high',
  Critical: 'badge-critical',
};

export default function RiskBadge({ level, score, className = '' }: RiskBadgeProps) {
  return (
    <span className={`${COLORS[level]} ${className}`}>
      {score !== undefined ? `${score.toFixed(1)} · ` : ''}
      {level}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const cls: Record<string, string> = {
    critical: 'badge-severity-critical',
    high: 'badge-severity-high',
    medium: 'badge-severity-medium',
    low: 'badge-severity-low',
  };
  return (
    <span className={`${cls[severity.toLowerCase()] || 'badge-severity-low'} ${className}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
