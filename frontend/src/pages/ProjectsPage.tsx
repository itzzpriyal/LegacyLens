import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronRight, Clock, CheckCircle2, Loader2, XCircle, FileCode2 } from 'lucide-react';
import type { Project } from '../types';
import { projectsApi } from '../api/client';
import RiskBadge from '../components/shared/RiskBadge';

const STATUS_ICONS = {
  pending: Clock,
  ingesting: Loader2,
  analyzing: Loader2,
  scoring: Loader2,
  ai_processing: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLORS = {
  pending: 'text-slate-500',
  ingesting: 'text-blue-400',
  analyzing: 'text-primary-400',
  scoring: 'text-amber-400',
  ai_processing: 'text-violet-400',
  complete: 'text-emerald-400',
  failed: 'text-red-400',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await projectsApi.list();
      setProjects(data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    if (!confirm('Delete this project and its analysis?')) return;
    try {
      await projectsApi.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} analysis sessions</p>
        </div>
        <Link to="/" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-16 text-center"
        >
          <FileCode2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-400 mb-2">No projects yet</h2>
          <p className="text-sm text-slate-600 mb-6">Upload a repository to get your first migration risk report</p>
          <Link to="/" className="btn-primary">
            <Plus className="w-4 h-4" />
            Analyze a Repository
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {projects.map((project, i) => {
            const StatusIcon = STATUS_ICONS[project.status] || Clock;
            const statusColor = STATUS_COLORS[project.status] || 'text-slate-500';
            const isSpinning = !['complete', 'failed', 'pending'].includes(project.status);

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/projects/${project.id}`}
                  className="glass-card-hover flex items-center gap-4 p-5 group"
                >
                  {/* Status indicator */}
                  <div className={`flex-shrink-0 ${statusColor}`}>
                    <StatusIcon className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  </div>

                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-200">{project.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 capitalize">
                        {project.source_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {new Date(project.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {project.status === 'complete' && (
                        <>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-500">{project.total_files} files</span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-500">
                            Readiness: {project.migration_readiness_score.toFixed(1)}/100
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Risk badge */}
                  {project.status === 'complete' && (
                    <div className="flex-shrink-0">
                      <RiskBadge
                        level={
                          project.avg_risk_score > 80 ? 'Critical' :
                          project.avg_risk_score > 60 ? 'High' :
                          project.avg_risk_score > 30 ? 'Medium' : 'Low'
                        }
                        score={project.avg_risk_score}
                      />
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="flex-shrink-0 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
