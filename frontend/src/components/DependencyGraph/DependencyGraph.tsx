import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import type { DependencyGraph as DependencyGraphType, GraphNode as GraphNodeType, RiskLevel } from '../../types';
import { X, FileCode2, Download } from 'lucide-react';
import dagre from 'dagre';
import { toPng } from 'html-to-image';

interface DependencyGraphProps {
  graph: DependencyGraphType;
}

const RISK_NODE_COLORS: Record<RiskLevel, { bg: string; border: string; glow: string; text: string }> = {
  Low: { bg: '#052e16', border: '#22c55e', glow: '#22c55e40', text: '#86efac' },
  Medium: { bg: '#1c1917', border: '#eab308', glow: '#eab30840', text: '#fde047' },
  High: { bg: '#1c1400', border: '#f97316', glow: '#f9731640', text: '#fdba74' },
  Critical: { bg: '#1c0a0a', border: '#ef4444', glow: '#ef444440', text: '#fca5a5' },
};

function RiskNode({ data }: NodeProps) {
  const colors = RISK_NODE_COLORS[data.risk_level as RiskLevel] || RISK_NODE_COLORS.Low;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-medium max-w-[160px] cursor-pointer transition-all duration-200 hover:scale-105"
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        boxShadow: `0 0 12px ${colors.glow}`,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="truncate" title={data.label}>{data.label}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{data.risk_score?.toFixed(1)} · {data.risk_level}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { riskNode: RiskNode };

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function buildLayout(nodes: GraphNodeType[], edges: DependencyGraphType['edges'], direction = 'TB') {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const rfNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: 'riskNode',
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 40,
      },
      data: { ...node },
    };
  });

  const rfEdges: Edge[] = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { 
      stroke: '#ffffff', 
      strokeWidth: 2.5,
      filter: 'drop-shadow(0px 0px 4px rgba(255,255,255,0.6))'
    },
    animated: false,
  }));

  return { rfNodes, rfEdges };
}

export default function DependencyGraphView({ graph }: DependencyGraphProps) {
  const { rfNodes, rfEdges } = buildLayout(graph.nodes, graph.edges);
  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
  const [selected, setSelected] = useState<GraphNodeType | null>(null);
  const [hovered, setHovered] = useState<GraphNodeType | null>(null);

  useEffect(() => {
    const active = hovered || selected;
    if (!active) {
      setNodes(nds => nds.map(n => ({ ...n, style: { ...n.style, opacity: 1, transition: 'opacity 0.3s' } })));
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1, transition: 'opacity 0.3s' } })));
      return;
    }

    const connected = new Set<string>();
    connected.add(active.id);
    graph.edges.forEach(e => {
      if (e.source === active.id) connected.add(e.target);
      if (e.target === active.id) connected.add(e.source);
    });

    setNodes(nds => nds.map(n => ({
      ...n,
      style: { ...n.style, opacity: connected.has(n.id) ? 1 : 0.15, transition: 'opacity 0.3s' }
    })));

    setEdges(eds => eds.map(e => ({
      ...e,
      style: { ...e.style, opacity: (e.source === active.id || e.target === active.id) ? 1 : 0.05, transition: 'opacity 0.3s' }
    })));
  }, [hovered, selected, setNodes, setEdges, graph.edges]);

  const downloadImage = () => {
    const rfEl = document.querySelector('.react-flow') as HTMLElement;
    if (rfEl) {
      toPng(rfEl, {
        backgroundColor: '#020617',
      }).then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', 'dependency-graph.png');
        a.setAttribute('href', dataUrl);
        a.click();
      });
    }
  };

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const gn = graph.nodes.find(n => n.id === node.id);
    setSelected(prev => (prev?.id === node.id ? null : gn || null));
  }, [graph.nodes]);

  const onNodeMouseEnter = useCallback((_: unknown, node: Node) => {
    const gn = graph.nodes.find(n => n.id === node.id);
    setHovered(gn || null);
  }, [graph.nodes]);

  const onNodeMouseLeave = useCallback(() => {
    setHovered(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelected(null);
  }, []);

  const colors = RISK_NODE_COLORS;

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls position="top-right" />
        <MiniMap
          nodeColor={(node) => {
            const level = node.data?.risk_level as RiskLevel;
            return colors[level]?.border || '#6366f1';
          }}
          maskColor="rgba(15,23,42,0.7)"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-4 left-4 glass-card p-3 flex flex-col gap-2 text-xs">
        {(Object.entries(RISK_NODE_COLORS) as [RiskLevel, typeof RISK_NODE_COLORS.Low][]).map(([level, c]) => (
          <div key={level} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: c.border, boxShadow: `0 0 6px ${c.glow}` }} />
            <span style={{ color: c.text }}>{level}</span>
          </div>
        ))}
      </div>

      {/* Top right actions */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <div className="glass-card px-3 py-2 text-xs text-slate-400">
          {graph.nodes.length} nodes · {graph.edges.length} edges
        </div>
        <button
          onClick={downloadImage}
          className="glass-card px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>

      {/* Inspect Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="inspect"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute top-4 right-4 w-64 glass-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-xs font-medium text-slate-200 break-all">{selected.label}</span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Risk Score', v: selected.risk_score.toFixed(1) },
                { l: 'Risk Level', v: selected.risk_level },
                { l: 'Language', v: selected.language },
                { l: 'LOC', v: selected.loc.toLocaleString() },
                { l: 'Functions', v: selected.num_functions },
                { l: 'Classes', v: selected.num_classes },
              ].map(({ l, v }) => (
                <div key={l}>
                  <p className="text-[10px] text-slate-500">{l}</p>
                  <p className="text-xs font-medium text-slate-200">{v}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Depends on</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {graph.edges.filter(e => e.source === selected.id).length === 0 && (
                  <p className="text-[10px] text-slate-600">None</p>
                )}
                {graph.edges.filter(e => e.source === selected.id).map(e => {
                  const targetNode = graph.nodes.find(n => n.id === e.target);
                  return (
                    <div key={e.id} className="text-[10px] text-slate-300 font-mono truncate" title={targetNode?.label}>
                      {targetNode?.label.split('/').pop()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 mb-1">Depended on by</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {graph.edges.filter(e => e.target === selected.id).length === 0 && (
                  <p className="text-[10px] text-slate-600">None</p>
                )}
                {graph.edges.filter(e => e.target === selected.id).map(e => {
                  const sourceNode = graph.nodes.find(n => n.id === e.source);
                  return (
                    <div key={e.id} className="text-[10px] text-slate-300 font-mono truncate" title={sourceNode?.label}>
                      {sourceNode?.label.split('/').pop()}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
