import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MigrationRoadmap, SourceFile } from '../../types';
import { CheckCircle2, ChevronRight, Zap, ArrowDown } from 'lucide-react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { analysisApi } from '../../api/client';

function MigrationNode({ data }: { data: { label: string; risk_score: number; order: number } }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-red-500/40 bg-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.15)] min-w-[220px]">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
            {data.order}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Migrate</span>
        </div>
        <span className="text-xs font-mono text-slate-200 break-all">{data.label.split('/').pop()}</span>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Score</span>
          <span className="text-sm font-bold text-red-400">{data.risk_score.toFixed(1)}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { migrationNode: MigrationNode };

interface RoadmapViewProps {
  data: MigrationRoadmap;
  projectId: string;
}

const PHASE_COLORS = [
  { bg: 'from-emerald-900/30 to-emerald-800/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400', num: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { bg: 'from-blue-900/30 to-blue-800/10', border: 'border-blue-500/30', icon: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400', num: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { bg: 'from-orange-900/30 to-orange-800/10', border: 'border-orange-500/30', icon: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400', num: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { bg: 'from-red-900/30 to-red-800/10', border: 'border-red-500/30', icon: 'text-red-400', badge: 'bg-red-500/20 text-red-400', num: 'bg-red-500/20 text-red-300 border-red-500/40' },
];

export default function RoadmapView({ data, projectId }: RoadmapViewProps) {
  const { phases, narrative } = data;
  const [files, setFiles] = useState<SourceFile[]>([]);

  useEffect(() => {
    // Fetch top 50 riskiest files for the flowchart to keep it manageable
    analysisApi.getFiles(projectId, { limit: 50 }).then(res => {
      setFiles(res.files.sort((a, b) => b.risk_score - a.risk_score));
    });
  }, [projectId]);

  const { nodes, edges } = useMemo(() => {
    if (files.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 60 });

    files.forEach((f) => {
      dagreGraph.setNode(f.id, { width: 220, height: 100 });
    });

    const flowEdges: Edge[] = [];
    for (let i = 0; i < files.length - 1; i++) {
      const source = files[i].id;
      const target = files[i+1].id;
      dagreGraph.setEdge(source, target);
      flowEdges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        type: 'smoothstep',
        style: { stroke: '#ef444450', strokeWidth: 2 },
        animated: true,
      });
    }

    dagre.layout(dagreGraph);

    const flowNodes: Node[] = files.map((f, i) => {
      const nodePos = dagreGraph.node(f.id);
      return {
        id: f.id,
        type: 'migrationNode',
        position: { x: nodePos.x - 110, y: nodePos.y - 50 },
        data: { label: f.relative_path, risk_score: f.risk_score, order: i + 1 },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [files]);

  return (
    <div className="space-y-6">
      {/* Narrative */}
      {narrative && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-primary-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider">
              AI Executive Summary
            </h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{narrative}</p>
        </motion.div>
      )}

      {/* Migration Flowchart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden border border-slate-800"
      >
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-200">Recommended Migration Sequence (Top 50 Riskiest Files)</h3>
          </div>
          <span className="text-xs text-slate-500">Highest Risk → Lowest Risk</span>
        </div>
        <div className="w-full h-[500px] bg-slate-950">
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
              nodesDraggable={true}
              nodesConnectable={false}
            >
              <Background color="#1e293b" gap={20} size={1} />
              <Controls />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-500">
              Loading flowchart...
            </div>
          )}
        </div>
      </motion.div>

      {/* Progress line */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {phases.map((phase, i) => {
          const colors = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <div key={phase.phase_number} className="flex items-center gap-3 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${colors.num}`}>
                {phase.phase_number}
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{phase.name}</span>
              {i < phases.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Phase Cards */}
      <div className="space-y-4">
        {phases.map((phase, i) => {
          const colors = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <motion.div
              key={phase.phase_number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border bg-gradient-to-r p-6 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.icon}`}>
                      Phase {phase.phase_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {phase.estimated_complexity} Complexity
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{phase.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{phase.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-slate-100">{phase.files.length}</p>
                  <p className="text-xs text-slate-500">files</p>
                </div>
              </div>

              {/* File chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                {phase.files.slice(0, 20).map(file => (
                  <span
                    key={file}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-slate-900/60 text-slate-400 border border-slate-700/50 font-mono"
                  >
                    <CheckCircle2 className="w-3 h-3 text-slate-600" />
                    {file.split('/').pop()}
                  </span>
                ))}
                {phase.files.length > 20 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
                    +{phase.files.length - 20} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {phases.length === 0 && (
        <div className="glass-card p-12 text-center text-slate-500">
          No roadmap generated yet. Complete the analysis first.
        </div>
      )}
    </div>
  );
}
