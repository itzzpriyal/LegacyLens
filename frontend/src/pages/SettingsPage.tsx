import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Settings, Key, Eye, EyeOff, CheckCircle2, Info } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('legacylens_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('legacylens_api_key', apiKey);
    setSaved(true);
    toast.success('API key saved to browser storage');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('legacylens_api_key');
    toast.success('API key cleared');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Settings</h1>
            <p className="text-sm text-slate-500">Configure LegacyLens preferences</p>
          </div>
        </div>

        {/* OpenAI API Key */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-slate-200">OpenAI API Key</h2>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300/80 leading-relaxed">
              The API key is stored only in your browser's local storage and is never sent to our servers.
              It is used solely for generating AI recommendations — all risk, debt, and security scores
              are computed locally without any LLM calls.
            </p>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input-field pr-12 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!apiKey}
              className="btn-primary"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                'Save API Key'
              )}
            </button>
            {apiKey && (
              <button onClick={handleClear} className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/30">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Info block */}
        <div className="glass-card p-6 mt-4 space-y-3">
          <h2 className="font-semibold text-slate-200">What requires an API key?</h2>
          <div className="space-y-2">
            {[
              { item: 'Risk Score (0–100)', needs: false },
              { item: 'Technical Debt Detection', needs: false },
              { item: 'Security Findings', needs: false },
              { item: 'Dependency Graph', needs: false },
              { item: 'Migration Roadmap (phased plan)', needs: false },
              { item: 'AI File Recommendations', needs: true },
              { item: 'AI Executive Narrative', needs: true },
              { item: 'PDF / DOCX Export (without AI text)', needs: false },
            ].map(({ item, needs }) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${needs ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-slate-300">{item}</span>
                <span className={`ml-auto text-xs ${needs ? 'text-amber-400' : 'text-emerald-500'}`}>
                  {needs ? 'Needs API key' : 'No API key needed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
