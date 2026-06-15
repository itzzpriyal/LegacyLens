interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  inverse?: boolean; // true = higher score is better (readiness, security)
  description?: string;
}

function getColor(score: number, inverse: boolean): string {
  const effective = inverse ? score : 100 - score;
  if (effective >= 70) return '#22c55e';
  if (effective >= 40) return '#eab308';
  if (effective >= 20) return '#f97316';
  return '#ef4444';
}

const SIZES = {
  sm: { r: 28, stroke: 5, fontSize: 'text-lg', labelSize: 'text-xs', wh: 'w-16 h-16' },
  md: { r: 38, stroke: 6, fontSize: 'text-2xl', labelSize: 'text-xs', wh: 'w-24 h-24' },
  lg: { r: 52, stroke: 8, fontSize: 'text-3xl', labelSize: 'text-sm', wh: 'w-32 h-32' },
};

export default function ScoreGauge({ score, label, size = 'md', inverse = false, description }: ScoreGaugeProps) {
  const s = SIZES[size];
  const color = getColor(score, inverse);
  const circumference = 2 * Math.PI * s.r;
  const filled = (score / 100) * circumference;
  const viewSize = (s.r + s.stroke + 4) * 2;

  return (
    <div 
      className="flex flex-col items-center gap-2 group cursor-help relative" 
      title={description}
    >
      {description && (
        <div className="absolute -top-3 -right-3 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity z-10 bg-[#020008] rounded-full">
          <span className="text-[12px] pb-[1px] flex items-center justify-center w-5 h-5 border border-slate-700/50 rounded-full">ⓘ</span>
        </div>
      )}
      <div className={`${s.wh} relative`}>
        <svg
          viewBox={`0 0 ${viewSize} ${viewSize}`}
          className="w-full h-full -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={viewSize / 2}
            cy={viewSize / 2}
            r={s.r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={s.stroke}
          />
          {/* Score arc */}
          <circle
            cx={viewSize / 2}
            cy={viewSize / 2}
            r={s.r}
            fill="none"
            stroke={color}
            strokeWidth={s.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${s.fontSize} text-slate-100`}>{Math.round(score)}</span>
        </div>
      </div>
      <span className={`${s.labelSize} font-medium text-slate-400 text-center`}>{label}</span>
    </div>
  );
}
