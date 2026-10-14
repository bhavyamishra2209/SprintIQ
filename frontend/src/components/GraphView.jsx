import React, { useState, useMemo } from 'react'
import {
  ExternalLink,
  Filter,
  Flame,
  Layers,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  GitCommit,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

export default function GraphView({
  graphData,
  selectedTaskId,
  onSelectTask,
  onRunImpact,
  upstreamTasks = [],
  downstreamTasks = [],
}) {
  const [filterSprint, setFilterSprint] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterAssignee, setFilterAssignee] = useState('ALL')
  const [filterSearch, setFilterSearch] = useState('')
  const [highlightCritical, setHighlightCritical] = useState(true)

  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []
  const criticalPath = graphData?.critical_path || []
  const hasCycles = graphData?.has_cycles || false

  // Unique lists for filter dropdowns
  const sprints = useMemo(() => {
    const set = new Set()
    nodes.forEach((n) => n.sprint_name && set.add(n.sprint_name))
    return Array.from(set)
  }, [nodes])

  const assignees = useMemo(() => {
    const set = new Set()
    nodes.forEach((n) => n.assignee_name && set.add(n.assignee_name))
    return Array.from(set)
  }, [nodes])

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterSprint !== 'ALL' && n.sprint_name !== filterSprint) return false
      if (filterStatus !== 'ALL' && n.status !== filterStatus) return false
      if (filterAssignee !== 'ALL' && n.assignee_name !== filterAssignee) return false
      if (filterSearch) {
        const q = filterSearch.toLowerCase()
        const matchesKey = n.key && n.key.toLowerCase().includes(q)
        const matchesTitle = n.title && n.title.toLowerCase().includes(q)
        if (!matchesKey && !matchesTitle) return false
      }
      return true
    })
  }, [nodes, filterSprint, filterStatus, filterAssignee, filterSearch])

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes])

  // Visible edges
  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
  }, [edges, filteredNodeIds])

  // Layout calculation: Assign columns (ranks) via topological level
  const { nodePositions, canvasWidth, canvasHeight } = useMemo(() => {
    const positions = {}
    if (nodes.length === 0) return { nodePositions: positions, canvasWidth: 900, canvasHeight: 500 }

    // Compute in-degree and adjacency
    const adj = {}
    const inDegree = {}
    nodes.forEach((n) => {
      adj[n.id] = []
      inDegree[n.id] = 0
    })

    edges.forEach((e) => {
      if (adj[e.source] && inDegree[e.target] !== undefined) {
        adj[e.source].push(e.target)
        inDegree[e.target] += 1
      }
    })

    // Compute level/column for each node
    const level = {}
    const queue = []
    nodes.forEach((n) => {
      if (inDegree[n.id] === 0) {
        level[n.id] = 0
        queue.push(n.id)
      }
    })

    // Handle cycles fallback
    if (queue.length === 0 && nodes.length > 0) {
      nodes.forEach((n, idx) => {
        level[n.id] = idx % 4
      })
    } else {
      while (queue.length > 0) {
        const u = queue.shift()
        const currentLevel = level[u] || 0
        for (const v of adj[u] || []) {
          const nextLevel = Math.max(level[v] || 0, currentLevel + 1)
          level[v] = nextLevel
          inDegree[v] -= 1
          if (inDegree[v] <= 0) {
            queue.push(v)
          }
        }
      }
      // Any remaining nodes with cycle
      nodes.forEach((n) => {
        if (level[n.id] === undefined) level[n.id] = 1
      })
    }

    // Group nodes by level
    const columns = {}
    nodes.forEach((n) => {
      const col = level[n.id] || 0
      if (!columns[col]) columns[col] = []
      columns[col].push(n)
    })

    const colWidth = 220
    const rowHeight = 110
    const startX = 60
    const startY = 60

    let maxCol = 0
    let maxRow = 0

    Object.keys(columns).forEach((colIdx) => {
      const c = parseInt(colIdx, 10)
      if (c > maxCol) maxCol = c
      const colNodes = columns[c]
      if (colNodes.length > maxRow) maxRow = colNodes.length

      colNodes.forEach((node, rowIdx) => {
        positions[node.id] = {
          x: startX + c * colWidth,
          y: startY + rowIdx * rowHeight,
          width: 170,
          height: 72,
        }
      })
    })

    const computedWidth = Math.max(900, startX + (maxCol + 1) * colWidth + 80)
    const computedHeight = Math.max(480, startY + maxRow * rowHeight + 80)

    return { nodePositions: positions, canvasWidth: computedWidth, canvasHeight: computedHeight }
  }, [nodes, edges])

  // Selected Task data
  const selectedNode = nodes.find((n) => n.id === selectedTaskId)

  // Direct predecessors and successors of selected node
  const directPredecessors = useMemo(() => {
    if (!selectedTaskId) return []
    const predIds = edges.filter((e) => e.target === selectedTaskId).map((e) => e.source)
    return nodes.filter((n) => predIds.includes(n.id))
  }, [selectedTaskId, edges, nodes])

  const directSuccessors = useMemo(() => {
    if (!selectedTaskId) return []
    const succIds = edges.filter((e) => e.source === selectedTaskId).map((e) => e.target)
    return nodes.filter((n) => succIds.includes(n.id))
  }, [selectedTaskId, edges, nodes])

  const resetFilters = () => {
    setFilterSprint('ALL')
    setFilterStatus('ALL')
    setFilterAssignee('ALL')
    setFilterSearch('')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dependency Graph (Digital Twin)</h1>
          <p className="page-subtitle">
            Interactive topological DAG representation, critical path analysis, and impact tracing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${highlightCritical ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setHighlightCritical(!highlightCritical)}
          >
            <Flame size={15} />
            <span>{highlightCritical ? 'Critical Path Highlighted' : 'Show Critical Path'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="graph-viewport">
        {/* Top Controls Toolbar */}
        <div className="graph-toolbar">
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Zoom & Layout:
          </span>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters} title="Reset View">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Comprehensive Legend */}
        <div className="graph-legend" style={{ flexWrap: 'wrap', gap: '10px 14px' }}>
          <div className="legend-item" title="Task Completed">
            <div className="legend-dot" style={{ background: 'var(--status-done)' }} />
            <span>Done</span>
          </div>
          <div className="legend-item" title="Task Currently in Progress">
            <div className="legend-dot" style={{ background: 'var(--status-in-progress)' }} />
            <span>In Progress</span>
          </div>
          <div className="legend-item" title="Task To Do">
            <div className="legend-dot" style={{ background: 'var(--status-todo)' }} />
            <span>To Do</span>
          </div>
          <div className="legend-item" title="Selected Task">
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', border: '2px solid var(--primary)', background: '#eff6ff' }} />
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Selected</span>
          </div>
          <div className="legend-item" title="Prerequisites that must complete before the selected task">
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', border: '2px solid var(--accent-purple)', background: '#faf5ff' }} />
            <span>Upstream (Prereq)</span>
          </div>
          <div className="legend-item" title="Tasks directly or indirectly blocked by the selected task">
            <div style={{ width: '12px', height: '10px', borderRadius: '2px', border: '2px solid var(--status-warning)', background: '#fffbeb' }} />
            <span>Downstream (Blocked)</span>
          </div>
          <div className="legend-item" title="Bottlenecks on the longest path determining project completion">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '14px', height: '2px', background: 'var(--status-critical)' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-critical)' }} />
            </div>
            <span style={{ color: 'var(--status-critical)', fontWeight: 600 }}>Critical Path</span>
          </div>
        </div>

        {/* SVG Canvas */}
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <svg
            className="graph-svg"
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          >
            <defs>
              {/* Regular Arrowhead */}
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="rgba(148, 163, 184, 0.45)" />
              </marker>

              {/* Critical Path Arrowhead */}
              <marker
                id="arrowhead-critical"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#f43f5e" />
              </marker>

              {/* Downstream Arrowhead */}
              <marker
                id="arrowhead-impact"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Render Edges */}
            {filteredEdges.map((edge, idx) => {
              const srcPos = nodePositions[edge.source]
              const tgtPos = nodePositions[edge.target]
              if (!srcPos || !tgtPos) return null

              const x1 = srcPos.x + srcPos.width
              const y1 = srcPos.y + srcPos.height / 2
              const x2 = tgtPos.x
              const y2 = tgtPos.y + tgtPos.height / 2

              const dx = (x2 - x1) * 0.5
              const dPath = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

              const isEdgeCritical = highlightCritical && edge.is_critical
              const isSelectedEdge =
                selectedTaskId && (edge.source === selectedTaskId || edge.target === selectedTaskId)

              return (
                <path
                  key={`${edge.source}-${edge.target}-${idx}`}
                  d={dPath}
                  className={`graph-edge ${isEdgeCritical ? 'critical' : ''} ${isSelectedEdge ? 'highlighted' : ''}`}
                  markerEnd={isEdgeCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
                />
              )
            })}

            {/* Render Nodes */}
            {filteredNodes.map((node) => {
              const pos = nodePositions[node.id]
              if (!pos) return null

              const isSelected = node.id === selectedTaskId
              const isCritical = highlightCritical && node.is_critical
              const isDownstream = downstreamTasks.includes(node.id)
              const isUpstream = upstreamTasks.includes(node.id)

              // Status colors for clean minimal theme
              let statusBorder = '#cbd5e1'
              let statusFill = '#ffffff'
              let badgeBg = '#f1f5f9'
              let badgeColor = '#475569'

              if (node.status === 'done') {
                statusBorder = '#86efac'
                badgeBg = '#dcfce7'
                badgeColor = '#16a34a'
              } else if (node.status === 'in_progress') {
                statusBorder = '#93c5fd'
                badgeBg = '#dbeafe'
                badgeColor = '#2563eb'
              } else if (node.status === 'blocked') {
                statusBorder = '#fca5a5'
                badgeBg = '#fee2e2'
                badgeColor = '#dc2626'
              }

              return (
                <g
                  key={node.id}
                  className={`node-card ${isSelected ? 'selected' : ''} ${isCritical ? 'critical' : ''} ${isDownstream ? 'downstream' : ''} ${isUpstream ? 'upstream' : ''}`}
                  onClick={() => onSelectTask(node.id)}
                  transform={`translate(${pos.x}, ${pos.y})`}
                >
                  {/* Card Background - Clean White with Crisp Edges */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx="6"
                    fill={statusFill}
                    stroke={
                      isSelected
                        ? 'var(--primary)'
                        : isCritical
                        ? 'var(--status-critical)'
                        : isDownstream
                        ? 'var(--status-warning)'
                        : isUpstream
                        ? 'var(--accent-purple)'
                        : statusBorder
                    }
                    strokeWidth={isSelected || isCritical ? '2' : '1'}
                  />

                  {/* Header: Key & Status indicator */}
                  <text
                    x="12"
                    y="22"
                    fill="#1e293b"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                  >
                    {node.key || 'TASK'}
                  </text>

                  {/* Estimate Tag */}
                  <rect
                    x={pos.width - 45}
                    y="10"
                    width="35"
                    height="16"
                    rx="4"
                    fill="#f1f5f9"
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                  <text
                    x={pos.width - 28}
                    y="21"
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {node.estimate_hours ? `${node.estimate_hours}h` : '4h'}
                  </text>

                  {/* Title (Truncated) */}
                  <text
                    x="12"
                    y="42"
                    fill="#0f172a"
                    fontSize="11.5"
                    fontFamily="var(--font-sans)"
                    fontWeight="600"
                  >
                    {node.title.length > 20 ? node.title.substring(0, 19) + '…' : node.title}
                  </text>

                  {/* Assignee Footer */}
                  <text
                    x="12"
                    y="58"
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="var(--font-sans)"
                  >
                    {node.assignee_name || 'Unassigned'}
                  </text>

                  {/* Critical Path Indicator */}
                  {isCritical && (
                    <circle
                      cx={pos.width - 10}
                      cy={pos.height - 10}
                      r="4"
                      fill="var(--status-critical)"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Bottom Section: Filters & Task Details Drawer (From Wireframe 2) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '24px',
          marginTop: '24px',
        }}
      >
        {/* Filters Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Filter size={17} className="text-primary" />
              <span>Graph Filters</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search Filter */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Search Task Key / Title
              </label>
              <input
                type="text"
                placeholder="e.g. ALPHA-1, Auth, API..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Sprint Filter */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Filter by Sprint
              </label>
              <select
                value={filterSprint}
                onChange={(e) => setFilterSprint(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Sprints ({sprints.length})</option>
                {sprints.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Filter by Assignee
              </label>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Team Members ({assignees.length})</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing {filteredNodes.length} of {nodes.length} nodes · {filteredEdges.length} dependencies
            </div>
          </div>
        </div>

        {/* Selected Task Details Drawer (From Wireframe 2) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <GitCommit size={18} className="text-primary" />
              <span>Task Details & Impact</span>
            </div>
            {selectedNode && (
              <span className={`badge badge-${selectedNode.status}`}>
                {selectedNode.status.replace('_', ' ')}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {selectedNode.key || 'TASK'}
                  </span>
                  {selectedNode.is_critical && (
                    <span className="badge badge-critical">Critical Path</span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.15rem', marginTop: '4px', color: '#ffffff' }}>
                  {selectedNode.title}
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  background: 'var(--bg-surface-elevated)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignee</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedNode.assignee_name || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sprint</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedNode.sprint_name || 'Backlog'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estimate</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedNode.estimate_hours || 4} hrs
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Earliest Window</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {selectedNode.earliest_start_hours || 0}h → {selectedNode.earliest_finish_hours || 4}h
                  </div>
                </div>
              </div>

              {/* Predecessors & Successors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '6px' }}>
                    Prerequisites ({directPredecessors.length})
                  </div>
                  {directPredecessors.length > 0 ? (
                    directPredecessors.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectTask(p.id)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          marginBottom: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <strong>{p.key}:</strong> {p.title}
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No upstream prerequisites</span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--status-warning)', marginBottom: '6px' }}>
                    Blocks Downstream ({directSuccessors.length})
                  </div>
                  {directSuccessors.length > 0 ? (
                    directSuccessors.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectTask(s.id)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          marginBottom: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <strong>{s.key}:</strong> {s.title}
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No downstream dependents</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => onRunImpact(selectedNode.id)}
                >
                  <Flame size={15} />
                  <span>Analyze Downstream Ripple</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => alert(`Opening Jira issue ${selectedNode.key || selectedNode.id} in Jira Cloud...`)}
                  title="Open in Jira"
                >
                  <ExternalLink size={15} />
                  <span>Jira</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <GitCommit size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No task currently selected</p>
              <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                Click any task node in the graph above to inspect its dependencies and run downstream ripple analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
