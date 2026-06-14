import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Upload, Code2, Cpu, Zap, Shield, BarChart3, GitBranch, FileCode2 } from 'lucide-react';
import { projectsApi } from '../api/client';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'zip' | 'github'>('zip');
  const [isDragging, setIsDragging] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setUploadLogs([]);
      return;
    }

    const messages = [
      "Uploading file...",
      "Extracting archive...",
      "Reading project structure...",
      "Parsing dependencies...",
      "Analyzing files...",
      "Waiting for backend response..."
    ];

    let currentIndex = 0;
    setUploadLogs([messages[0]]);

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < messages.length) {
        setUploadLogs(prev => [...prev, messages[currentIndex]]);
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a .zip file');
      return;
    }
    setIsLoading(true);
    try {
      const project = await projectsApi.uploadZip(file);
      toast.success('Project uploaded! Analysis starting...');
      navigate(`/projects/${project.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleGithubClone = async () => {
    if (!githubUrl.startsWith('https://github.com/')) {
      toast.error('Enter a valid GitHub URL (https://github.com/...)');
      return;
    }
    setIsLoading(true);
    try {
      const project = await projectsApi.cloneGithub(githubUrl);
      toast.success('Cloning repository...');
      navigate(`/projects/${project.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Clone failed');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: 'Risk Scoring', desc: 'Deterministic 0–100 score from code metrics — no LLM hallucinations', color: 'text-primary-400' },
    { icon: GitBranch, title: 'Dependency Graph', desc: 'Interactive zoomable visualization of all module dependencies', color: 'text-violet-400' },
    { icon: Shield, title: 'Security Analysis', desc: 'Detects hardcoded secrets, API keys, and weak authentication patterns', color: 'text-emerald-400' },
    { icon: Zap, title: 'AI Recommendations', desc: 'GPT-powered plain-English remediation advice for each risky file', color: 'text-amber-400' },
    { icon: FileCode2, title: 'Debt Detection', desc: 'God classes, long methods, circular deps, and duplicate code', color: 'text-orange-400' },
    { icon: Cpu, title: 'Export Report', desc: 'One-click PDF/DOCX executive report with full analysis summary', color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-8">
              <Cpu className="w-4 h-4" />
              AI-Powered Legacy Code Intelligence
            </div>

            <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
              <span className="gradient-text">LegacyLens</span>
              <br />
              <span className="text-slate-200">Migration Risk Analyzer</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-4">
              Upload any Java or Python repository. Get a complete migration readiness report —
              risk scores, dependency graphs, security analysis, and AI recommendations — in minutes.
            </p>
            <p className="text-sm text-slate-500">
              No code sent to the cloud. Scores computed deterministically from code metrics.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-2xl mx-auto px-4 pb-20"
      >
        <div className="glass-card p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('zip')}
              className={activeTab === 'zip' ? 'tab-btn-active' : 'tab-btn-inactive'}
            >
              <Upload className="w-4 h-4" />
              Upload ZIP
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={activeTab === 'github' ? 'tab-btn-active' : 'tab-btn-inactive'}
            >
              <Code2 className="w-4 h-4" />
              GitHub URL
            </button>
          </div>

          {activeTab === 'zip' ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById('zip-input')?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-primary-500 bg-primary-500/5 scale-[1.02]'
                  : 'border-slate-700 hover:border-primary-500/50 hover:bg-slate-800/30'
              }`}
            >
              <input
                id="zip-input"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              {isLoading ? (
                <div className="flex flex-col items-start gap-3 w-full max-w-sm mx-auto bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold text-primary-400">Processing...</span>
                  </div>
                  <div className="w-full space-y-2 text-left">
                    {uploadLogs.map((log, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-xs font-mono text-slate-400"
                      >
                        <span className="text-primary-500 mt-0.5">{'>'}</span> {log}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-200 mb-2">
                    Drop your ZIP here or click to browse
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports .zip archives of Java and Python projects (max 100MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="input-field"
                  onKeyDown={e => e.key === 'Enter' && handleGithubClone()}
                />
              </div>
              <button
                onClick={handleGithubClone}
                disabled={isLoading || !githubUrl}
                className="btn-primary w-full justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cloning repository...
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    Analyze Repository
                  </>
                )}
              </button>
            </div>
          )}

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-500 text-center">
            💡 Try a sample: upload the bundled{' '}
            <code className="text-primary-400">sample_repo.zip</code> from the{' '}
            <code>backend/sample_repo</code> folder for an instant demo
          </div>
        </div>
      </motion.div>

      {/* Feature Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-center text-slate-300 mb-10"
        >
          Everything you need to modernize with confidence
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.07 }}
              className="glass-card-hover p-6"
            >
              <feat.icon className={`w-7 h-7 mb-3 ${feat.color}`} />
              <h3 className="font-semibold text-slate-200 mb-1">{feat.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
