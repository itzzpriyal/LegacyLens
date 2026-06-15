import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Settings, Key, Eye, EyeOff, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic (Proxy/Bedrock)' },
  { id: 'gemini', name: 'Google Gemini (Proxy)' },
  { id: 'groq', name: 'Groq (Llama3)' },
  { id: 'mistral', name: 'Mistral AI' },
  { id: 'together', name: 'Together AI' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const uid = user?.id || 'guest';
  const [provider, setProvider] = useState(() => localStorage.getItem(`legacylens_llm_provider_${uid}`) || 'openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem(`legacylens_api_key_${uid}_${provider}`) || '');
  }, [provider, uid]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    localStorage.setItem(`legacylens_llm_provider_${uid}`, newProvider);
  };

  const handleSave = () => {
    localStorage.setItem(`legacylens_api_key_${uid}_${provider}`, apiKey);
    setSaved(true);
    toast.success(`${PROVIDERS.find(p => p.id === provider)?.name} API key saved to browser storage`);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem(`legacylens_api_key_${uid}_${provider}`);
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

        {/* API Key configuration */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-slate-200">LLM Provider Configuration</h2>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300/80 leading-relaxed">
              The API key is stored only in your browser's local storage.
              It is used solely for generating AI recommendations — all risk, debt, and security scores
              are computed locally without any LLM calls.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Provider
              </label>
              <select
                value={provider}
                onChange={handleProviderChange}
                className="input-field w-full text-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] pr-10"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                ))}
              </select>
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
                  placeholder="Enter API key..."
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
          </div>

          <div className="flex items-center gap-3 pt-2">
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
