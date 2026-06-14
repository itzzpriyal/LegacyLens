import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, GitBranch, Bug, Shield, Map, Sparkles,
  FileDown, ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Cpu
} from 'lucide-react';
import type { Project, DashboardSummary, DependencyGraph, DebtSummary, SecuritySummary, MigrationRoadmap } from '../types';
import { projectsApi, analysisApi, graphApi, debtApi, securityApi, roadmapApi, aiApi, exportApi } from '../api/client';
import Dashboard from '../components/Dashboard/Dashboard';
import DependencyGraphView from '../components/DependencyGraph/DependencyGraph';
import DebtDashboard from '../components/DebtDashboard/DebtDashboard';
import SecurityDashboard from '../components/SecurityDashboard/SecurityDashboard';
import RoadmapView from '../components/Roadmap/RoadmapView';

type Tab = 'dashboard' | 'graph' | 'debt' | 'security' | 'roadmap';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-slate-400', label: 'Pending' },
  ingesting: { icon: Loader2, color: 'text-blue-400', label: 'Ingesting files...', spin: true },
  analyzing: { icon: Loader2, color: 'text-primary-400', label: 'Analyzing code...', spin: true },
  scoring: { icon: Loader2, color: 'text-amber-400', label: 'Computing scores...', spin: true },
  ai_processing: { icon: Sparkles, color: 'text-violet-400', label: 'AI processing...' },
  complete: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Analysis complete' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Analysis failed' },
};

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'graph', label: 'Dependency Graph', icon: GitBranch },
  { id: 'debt', label: 'Technical Debt', icon: Bug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
];

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [debt, setDebt] = useState<DebtSummary | null>(null);
  const [security, setSecurity] = useState<SecuritySummary | null>(null);
  const [roadmap, setRoadmap] = useState<MigrationRoadmap | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [provider] = useState(() => localStorage.getItem('legacylens_llm_provider') || 'openai');
  const [apiKey] = useState(() => localStorage.getItem(`legacylens_api_key_${localStorage.getItem('legacylens_llm_provider') || 'openai'}`) || '');

  const fetchProject = async () => {
    if (!id) return;
    try {
      const p = await projectsApi.get(id);
      setProject(p);
      return p;
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Project not found');
      } else {
        console.error('Failed to fetch project status:', error);
      }
    }
  };

  const loadTabData = async (tab: Tab, p?: Project) => {
    const proj = p || project;
    if (!id || !proj || proj.status !== 'complete') return;
    try {
      switch (tab) {
        case 'dashboard':
          if (!dashboard) setDashboard(await analysisApi.getDashboard(id));
          break;
        case 'graph':
          if (!graph) setGraph(await graphApi.getGraph(id));
          break;
        case 'debt':
          if (!debt) setDebt(await debtApi.getDebt(id));
          break;
        case 'security':
          if (!security) setSecurity(await securityApi.getSecurity(id));
          break;
        case 'roadmap':
          if (!roadmap) setRoadmap(await roadmapApi.getRoadmap(id));
          break;
      }
    } catch {
      toast.error(`Failed to load ${tab} data`);
    }
  };

  // Poll while not complete
  useEffect(() => {
    if (!id) return;
    fetchProject().then(p => {
      if (p?.status === 'complete') {
        loadTabData('dashboard', p);
      }
    });

    const interval = setInterval(async () => {
      const p = await fetchProject();
      if (p?.status === 'complete' || p?.status === 'failed') {
        clearInterval(interval);
        setPollingInterval(null);
        if (p.status === 'complete') {
          loadTabData('dashboard', p);
        }
      }
    }, 3000);
    setPollingInterval(interval);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, project?.status]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleGenerateAI = async () => {
    if (!id) return;
    setIsGeneratingAI(true);
    try {
      const result = await aiApi.generateRecommendations(id, apiKey, provider);
      toast.success(`Generated recommendations for ${result.updated} files`);
      // Also get narrative
      const narrative = await aiApi.generateNarrative(id, apiKey, provider);
      if (roadmap) setRoadmap({ ...roadmap, narrative: narrative.narrative });
      // Reload dashboard
      setDashboard(null);
      setTimeout(() => loadTabData('dashboard'), 100);
    } catch {
      toast.error('Failed to generate AI recommendations');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.pending;
  const isProcessing = !['complete', 'failed'].includes(project.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-6 flex-wrap"
      >
        <div>
          <Link to="/projects" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Projects
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className={`flex items-center gap-1.5 text-sm ${statusCfg.color}`}>
              <statusCfg.icon className={`w-4 h-4 ${(statusCfg as { spin?: boolean }).spin ? 'animate-spin' : ''}`} />
              {statusCfg.label}
            </div>
            <span className="text-slate-600">·</span>
            <span className="text-sm text-slate-500">{project.total_files} files</span>
            <span className="text-slate-600">·</span>
            <span className="text-sm text-slate-500 capitalize">{project.source_type}</span>
          </div>
        </div>

        {project.status === 'complete' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="btn-secondary"
            >
              {isGeneratingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Recommendations
            </button>
            <a
              href={exportApi.exportReport(id!, 'pdf', apiKey, provider)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <FileDown className="w-4 h-4" />
              PDF Report
            </a>
            <a
              href={exportApi.exportReport(id!, 'docx', apiKey, provider)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <FileDown className="w-4 h-4" />
              DOCX
            </a>
            <a
              href={exportApi.exportMetadata(id!)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <FileDown className="w-4 h-4" />
              Metadata ZIP
            </a>
          </div>
        )}
      </motion.div>

      {/* Loading state */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center mb-6"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 border-4 border-primary-500/20 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <Cpu className="absolute inset-0 m-auto w-7 h-7 text-primary-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">{statusCfg.label}</h2>
          <p className="text-sm text-slate-500">
            Parsing source files, computing metrics, and scoring risk. This may take a moment for large repositories.
          </p>
        </motion.div>
      )}

      {project.status === 'failed' && (
        <div className="glass-card p-6 border border-red-500/30 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Analysis Failed</span>
          </div>
          <p className="text-sm text-red-300/70">{project.error_message}</p>
        </div>
      )}

      {project.status === 'complete' && (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && dashboard && <Dashboard data={dashboard} />}
            {activeTab === 'dashboard' && !dashboard && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              </div>
            )}

            {activeTab === 'graph' && graph && <DependencyGraphView graph={graph} />}
            {activeTab === 'graph' && !graph && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              </div>
            )}

            {activeTab === 'debt' && debt && <DebtDashboard data={debt} />}
            {activeTab === 'debt' && !debt && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              </div>
            )}

            {activeTab === 'security' && security && <SecurityDashboard data={security} />}
            {activeTab === 'security' && !security && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              </div>
            )}

            {activeTab === 'roadmap' && roadmap && <RoadmapView data={roadmap} projectId={project.id} />}
            {activeTab === 'roadmap' && !roadmap && (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
