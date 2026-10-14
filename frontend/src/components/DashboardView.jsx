import React, { useState } from 'react'
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Flame,
  GitCommit,
  Layers,
} from 'lucide-react'

export default function DashboardView({
  graphData,
  projectStatus,
  sprints = [],
  onNavigateToGraph,
  onNavigateToImpact,
  projectName = 'Project Alpha',
}) {
  const [workloadSprintFilter, setWorkloadSprintFilter] = useState('all')

  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []
  const criticalPath = graphData?.critical_path || []
  const totalDuration = graphData?.total_duration_hours || 0
  const hasCycles = graphData?.has_cycles || false

  // Dynamic sprints calculation from backend and graph nodes
  const taskSprintNames = Array.from(new Set(nodes.map((n) => n.sprint_name).filter(Boolean)))
  const displaySprints =
    sprints.length > 0
      ? sprints
      : taskSprintNames.map((name, i) => ({ id: `task-sp-${i}`, name, state: 'active' }))

  const availableSprintNames = Array.from(
    new Set([
      ...sprints.map((s) => s.name),
      ...taskSprintNames,
    ])
  )

  const activeSprintTasks =
    workloadSprintFilter === 'all'
      ? nodes
      : nodes.filter((n) => n.sprint_name === workloadSprintFilter)

  // Baseline 2-week sprint capacity (10 working days * 8h/day = 80 hours)
  const sprintCapacityPerDev = 80
  const capacityPerDev =
    workloadSprintFilter === 'all'
      ? Math.max(1, availableSprintNames.length) * sprintCapacityPerDev
      : sprintCapacityPerDev

  // Computed metrics
  const doneTasks = nodes.filter((n) => n.status === 'done')
  const inProgressTasks = nodes.filter((n) => n.status === 'in_progress')
  const todoTasks = nodes.filter((n) => n.status === 'todo')
  const blockedTasks = nodes.filter((n) => n.status === 'blocked')

  const totalTasksCount = nodes.length
  const completionRate = totalTasksCount > 0 ? Math.round((doneTasks.length / totalTasksCount) * 100) : 0

  // Calculate health index
  let healthScore = 100
  if (hasCycles) healthScore -= 30
  if (blockedTasks.length > 0) healthScore -= blockedTasks.length * 10
  healthScore = Math.max(25, Math.min(100, healthScore))

  // Risk Level
  let riskLevel = 'LOW'
  let riskClass = 'var(--status-done)'
  if (hasCycles || blockedTasks.length > 1) {
    riskLevel = 'HIGH'
    riskClass = 'var(--status-blocked)'
  } else if (criticalPath.length > 4 || blockedTasks.length === 1) {
    riskLevel = 'MEDIUM'
    riskClass = 'var(--status-warning)'
  }

  // Developer assignment distribution scoped by active sprint filter
  const assignees = {}
  activeSprintTasks.forEach((n) => {
    const name = n.assignee_name || 'Unassigned'
    assignees[name] = (assignees[name] || 0) + (n.estimate_hours || 4)
  })

  // Critical path nodes list
  const criticalNodes = nodes.filter((n) => n.is_critical)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview and decision intelligence for {projectName}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onNavigateToGraph}>
            <GitCommit size={15} />
            <span>Inspect Digital Twin</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNavigateToImpact}>
            <Flame size={15} />
            <span>Run Impact Test</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* 1. Project Health */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Project Health</span>
            <div className="kpi-icon" style={{ color: healthScore > 70 ? 'var(--status-done)' : 'var(--status-warning)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: healthScore > 70 ? 'var(--status-done)' : 'var(--status-warning)' }}>
            {healthScore}%
          </div>
          <div className="kpi-subtext highlight-good">
            {healthScore > 70 ? '● Stable & On Track' : '▲ Attention Needed'}
          </div>
        </div>

        {/* 2. Sprint Progress */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Sprint Progress</span>
            <div className="kpi-icon">
              <Activity size={16} />
            </div>
          </div>
          <div className="kpi-value">{completionRate}%</div>
          <div className="kpi-subtext">
            <span>{doneTasks.length} of {totalTasksCount} tasks complete</span>
          </div>
        </div>

        {/* 3. Critical Path Duration */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Critical Duration</span>
            <div className="kpi-icon" style={{ color: 'var(--status-critical)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-critical)' }}>
            {Math.round(totalDuration)} <span style={{ fontSize: '1rem', fontWeight: 500 }}>hrs</span>
          </div>
          <div className="kpi-subtext">
            <span>{criticalNodes.length} bottlenecks on critical path</span>
          </div>
        </div>

        {/* 4. Total Tasks */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Tasks</span>
            <div className="kpi-icon">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="kpi-value">{totalTasksCount}</div>
          <div className="kpi-subtext">
            <span style={{ color: 'var(--status-in-progress)' }}>{inProgressTasks.length} in progress</span>
            <span>·</span>
            <span style={{ color: 'var(--status-todo)' }}>{todoTasks.length} to do</span>
          </div>
        </div>

        {/* 5. Team Capacity */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Team Allocation</span>
            <div className="kpi-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="kpi-value">{Object.keys(assignees).length}</div>
          <div className="kpi-subtext">
            <span>Active team contributors</span>
          </div>
        </div>

        {/* 6. Risk Index */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Risk Index</span>
            <div className="kpi-icon" style={{ color: riskClass }}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: riskClass }}>
            {riskLevel}
          </div>
          <div className="kpi-subtext">
            <span>{hasCycles ? 'Dependency loop present' : blockedTasks.length > 0 ? `${blockedTasks.length} blocked tasks` : 'No blockers'}</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Project Timeline & Sprint Stages */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <Calendar size={18} className="text-primary" />
            <span>Sprint Roadmap & Execution Horizon</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {displaySprints.length > 0 ? `${displaySprints.length} Sprints Synced` : 'Continuous Flow'}
          </span>
        </div>

        {displaySprints.length > 0 ? (
          <div className="sprint-stepper">
            {displaySprints.map((sp, idx) => {
              const isClosed = sp.state === 'closed'
              const isActive = sp.state === 'active'
              const nodeClass = isClosed ? 'step-node done' : isActive ? 'step-node active' : 'step-node'
              return (
                <div key={sp.id || idx} className={nodeClass}>
                  <div className="step-circle">{isClosed ? '✓' : idx + 1}</div>
                  <div className="step-connector" />
                  <div className="step-title">{sp.name}</div>
                  <div
                    className="step-status"
                    style={{
                      color: isClosed ? 'var(--status-done)' : isActive ? '#60a5fa' : 'var(--text-muted)',
                    }}
                  >
                    {isClosed ? 'Completed' : isActive ? 'Active & In Progress' : 'Upcoming'}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            No agile sprints detected on this Jira board. Tasks are organized in the continuous Backlog / Kanban stream.
          </div>
        )}
      </div>

      {/* Two Columns: Critical Path Pipeline & Top Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left: Critical Path Bottlenecks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Flame size={18} style={{ color: 'var(--status-critical)' }} />
              <span>Critical Path Pipeline</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onNavigateToGraph}>
              View Graph <ArrowRight size={14} />
            </button>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Tasks directly determining the final completion date. Any delay in these items delays the entire project.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {criticalNodes.length > 0 ? (
              criticalNodes.map((task, idx) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: '4px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        color: 'var(--status-critical)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {task.key || `T-0${idx + 1}`}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Assignee: {task.assignee_name || 'Unassigned'} · Estimate: {task.estimate_hours || 4}h
                      </div>
                    </div>
                  </div>
                  <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No critical path bottlenecks detected or graph contains cycles.
              </div>
            )}
          </div>
        </div>

        {/* Right: Team Workload & Activity */}
        <div className="card">
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div className="card-title">
              <Users size={18} className="text-primary" />
              <span>Team Workload Allocation</span>
            </div>
            {availableSprintNames.length > 0 && (
              <select
                value={workloadSprintFilter}
                onChange={(e) => setWorkloadSprintFilter(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                <option value="all">All Sprints ({capacityPerDev}h cap)</option>
                {availableSprintNames.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp} (80h cap · 2 wks)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(assignees).map(([devName, hours]) => {
              const percentage = Math.round((hours / capacityPerDev) * 100)
              const isOverloaded = percentage > 100
              const isHigh = percentage > 80 && percentage <= 100
              const barWidth = Math.min(100, percentage)
              return (
                <div key={devName}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      marginBottom: '5px',
                    }}
                  >
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{devName}</span>
                    <span
                      style={{
                        fontWeight: isOverloaded ? 600 : 500,
                        color: isOverloaded ? '#ef4444' : isHigh ? '#f59e0b' : 'var(--text-secondary)',
                      }}
                    >
                      {hours}h / {capacityPerDev}h ({percentage}%)
                      {isOverloaded && (
                        <span
                          style={{
                            marginLeft: '6px',
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            fontWeight: 600,
                          }}
                        >
                          Overloaded
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '7px',
                      background: '#e2e8f0',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: isOverloaded
                          ? 'linear-gradient(90deg, #f97316, #ef4444)'
                          : isHigh
                          ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                          : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {(() => {
            const entries = Object.entries(assignees)
            const overloaded = entries.filter(([_, h]) => h / capacityPerDev > 1.0)
            const isAllOverloaded = overloaded.length === entries.length && entries.length > 0
            const isAnyOverloaded = overloaded.length > 0

            if (isAllOverloaded) {
              return (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    fontSize: '0.8rem',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span>
                    <strong>Capacity Deficit:</strong> All team members exceed planned capacity ({capacityPerDev}h). Consider scope reduction or shifting tasks to subsequent sprints.
                  </span>
                </div>
              )
            }

            if (isAnyOverloaded) {
              return (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span>
                    <strong>Allocation Imbalance:</strong> {overloaded.map(([name]) => name).join(', ')} exceed capacity. Rebalance workload to members with available bandwidth.
                  </span>
                </div>
              )
            }

            return (
              <div
                style={{
                  marginTop: '20px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Activity size={18} className="text-primary" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Optimal Balance:</strong> Team workloads are evenly distributed within healthy capacity limits.
                </span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Bottom Section: Top Risks (From Wireframe 1) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={18} style={{ color: 'var(--status-warning)' }} />
            <span>Top Identified Project Risks</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--status-critical)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#b91c1c' }}>
                Downstream Dependency Bottleneck
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Tasks on the critical path have tight buffers. Any slip in foundational services affects downstream delivery.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Clock size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#b45309' }}>
                Jira Sync Freshness
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Last synced at: {projectStatus?.last_synced_at ? new Date(projectStatus.last_synced_at).toLocaleTimeString() : 'Recently'}. Regular sync ensures accurate twin prediction.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldAlert size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1d4ed8' }}>
                Capacity Buffer
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Current sprint load is within safe margins. Developer availability is healthy across scheduled items.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
