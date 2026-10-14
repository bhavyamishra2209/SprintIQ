import React, { useState, useMemo } from 'react'
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
  Search,
  Filter,
  LayoutGrid,
  List,
  Bug,
  Bookmark,
  CheckSquare,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

export default function DashboardView({
  graphData,
  projectStatus,
  sprints = [],
  onNavigateToGraph,
  onNavigateToImpact,
  onSelectTask,
  projectName = 'Project Alpha',
}) {
  const [workloadSprintFilter, setWorkloadSprintFilter] = useState('all')

  // Jira Scrum & Sprints Hub state
  const [scrumSprintFilter, setScrumSprintFilter] = useState('all')
  const [scrumStatusFilter, setScrumStatusFilter] = useState('all')
  const [scrumTypeFilter, setScrumTypeFilter] = useState('all')
  const [scrumSearch, setScrumSearch] = useState('')
  const [scrumViewMode, setScrumViewMode] = useState('table') // 'table' | 'board'

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

  // Developer initials for avatar bubbles
  const getInitials = (name) => {
    if (!name) return 'UN'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Issue Type Badge (Story, Bug, Task)
  const renderIssueTypeBadge = (type = 'Task') => {
    const t = (type || 'Task').toLowerCase()
    if (t.includes('bug')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '4px',
            background: '#fee2e2',
            color: '#b91c1c',
            fontSize: '0.68rem',
            fontWeight: 600,
          }}
          title="Jira Bug"
        >
          <Bug size={12} />
          <span>Bug</span>
        </span>
      )
    }
    if (t.includes('story')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '4px',
            background: '#dbeafe',
            color: '#1d4ed8',
            fontSize: '0.68rem',
            fontWeight: 600,
          }}
          title="Jira Story"
        >
          <Bookmark size={12} />
          <span>Story</span>
        </span>
      )
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 7px',
          borderRadius: '4px',
          background: '#ecfdf5',
          color: '#047857',
          fontSize: '0.68rem',
          fontWeight: 600,
        }}
        title="Jira Task"
      >
        <CheckSquare size={12} />
        <span>Task</span>
      </span>
    )
  }

  // Priority badge (High, Medium, Low)
  const renderPriorityBadge = (priority = 'Medium') => {
    const p = (priority || 'Medium').toLowerCase()
    let bg = '#f8fafc'
    let color = '#64748b'
    let label = priority || 'Medium'

    if (p.includes('high') || p.includes('urgent')) {
      bg = '#fef2f2'
      color = '#ef4444'
    } else if (p.includes('med')) {
      bg = '#fffbeb'
      color = '#d97706'
    } else if (p.includes('low')) {
      bg = '#f0fdf4'
      color = '#10b981'
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
          color,
          background: bg,
          padding: '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${color}33`,
        }}
      >
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }} />
        {label}
      </span>
    )
  }

  // Available sprint tabs with live counts
  const sprintFilterTabs = useMemo(() => {
    const tabs = [
      { id: 'all', name: 'All Sprints', count: nodes.length, state: 'all' },
    ]
    displaySprints.forEach((sp) => {
      const count = nodes.filter((n) => n.sprint_name === sp.name).length
      tabs.push({
        id: sp.name,
        name: sp.name,
        count,
        state: sp.state || 'active',
        sprintObj: sp,
      })
    })
    const unassignedCount = nodes.filter((n) => !n.sprint_name).length
    if (unassignedCount > 0) {
      tabs.push({
        id: '__backlog__',
        name: 'Backlog Stream',
        count: unassignedCount,
        state: 'backlog',
      })
    }
    return tabs
  }, [displaySprints, nodes])

  // Filtered Scrum tasks
  const filteredScrumTasks = useMemo(() => {
    return nodes
      .filter((task) => {
        // Sprint filter
        if (scrumSprintFilter !== 'all') {
          if (scrumSprintFilter === '__backlog__') {
            if (task.sprint_name) return false
          } else {
            if (task.sprint_name !== scrumSprintFilter) return false
          }
        }
        // Status filter
        if (scrumStatusFilter !== 'all') {
          if (task.status !== scrumStatusFilter) return false
        }
        // Issue type filter
        if (scrumTypeFilter !== 'all') {
          const type = (task.issue_type || 'task').toLowerCase()
          if (!type.includes(scrumTypeFilter.toLowerCase())) return false
        }
        // Search term
        if (scrumSearch.trim()) {
          const query = scrumSearch.toLowerCase().trim()
          const matchKey = (task.key || '').toLowerCase().includes(query)
          const matchTitle = (task.title || '').toLowerCase().includes(query)
          const matchAssignee = (task.assignee_name || '').toLowerCase().includes(query)
          if (!matchKey && !matchTitle && !matchAssignee) return false
        }
        return true
      })
      .sort((a, b) => {
        const numA = parseInt(a.key?.split('-')[1] || '0', 10)
        const numB = parseInt(b.key?.split('-')[1] || '0', 10)
        if (numA && numB) return numA - numB
        return (a.earliest_start_hours || 0) - (b.earliest_start_hours || 0)
      })
  }, [nodes, scrumSprintFilter, scrumStatusFilter, scrumTypeFilter, scrumSearch])

  // Sprint task counts scoped by current sprint selection
  const scopedSprintTasks = useMemo(() => {
    if (scrumSprintFilter === 'all') return nodes
    if (scrumSprintFilter === '__backlog__') return nodes.filter((n) => !n.sprint_name)
    return nodes.filter((n) => n.sprint_name === scrumSprintFilter)
  }, [nodes, scrumSprintFilter])

  const scopedDone = scopedSprintTasks.filter((t) => t.status === 'done').length
  const scopedInProg = scopedSprintTasks.filter((t) => t.status === 'in_progress').length
  const scopedTodo = scopedSprintTasks.filter((t) => t.status === 'todo').length
  const scopedBlocked = scopedSprintTasks.filter((t) => t.status === 'blocked').length
  const scopedTotalHours = scopedSprintTasks.reduce((acc, t) => acc + (t.estimate_hours || 4), 0)
  const scopedTotalPts = scopedSprintTasks.reduce((acc, t) => acc + (t.story_points || 0), 0)
  const scopedPct = scopedSprintTasks.length > 0 ? Math.round((scopedDone / scopedSprintTasks.length) * 100) : 0

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

      {/* Jira Sprints & Scrum Work Center */}
      <div className="jira-hub-card">
        {/* Hub Header & Controls */}
        <div className="jira-hub-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Jira Sprints & Scrum Work Center
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Live Backlog
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Track all Jira sprints, scrum stories, bugs, and real-time statuses without leaving the dashboard
              </p>
            </div>
          </div>

          {/* Right Controls: Search & View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search key, title, dev..."
                value={scrumSearch}
                onChange={(e) => setScrumSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* View Mode Toggle: Table vs Board */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-surface-elevated)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setScrumViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: scrumViewMode === 'table' ? 'var(--primary)' : 'transparent',
                  color: scrumViewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={14} />
                <span>Backlog List</span>
              </button>
              <button
                type="button"
                onClick={() => setScrumViewMode('board')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: scrumViewMode === 'board' ? 'var(--primary)' : 'transparent',
                  color: scrumViewMode === 'board' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={14} />
                <span>Scrum Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sprint Tabs Bar */}
        <div className="jira-sprint-tabs">
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
            Sprints:
          </span>
          {sprintFilterTabs.map((tab) => {
            const isActive = scrumSprintFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScrumSprintFilter(tab.id)}
                className={`jira-sprint-tab-btn ${isActive ? 'active' : ''}`}
              >
                <span>{tab.name}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-elevated)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
                {tab.state === 'active' && tab.id !== 'all' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#86efac' : '#22c55e' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Sprint Summary & Status Filter Chips */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '2px' }}>
              Status:
            </span>
            {[
              { id: 'all', label: 'All', count: scopedSprintTasks.length },
              { id: 'todo', label: 'To Do', count: scopedTodo },
              { id: 'in_progress', label: 'In Progress', count: scopedInProg },
              { id: 'blocked', label: 'Blocked', count: scopedBlocked },
              { id: 'done', label: 'Done', count: scopedDone },
            ].map((st) => {
              const isSelected = scrumStatusFilter === st.id
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setScrumStatusFilter(st.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: isSelected ? '#eff6ff' : 'var(--bg-surface-elevated)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{st.label}</span>
                  <span style={{ fontSize: '0.66rem', opacity: 0.85 }}>({st.count})</span>
                </button>
              )
            })}

            {/* Type Filter */}
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>
              Type:
            </span>
            <select
              value={scrumTypeFilter}
              onChange={(e) => setScrumTypeFilter(e.target.value)}
              style={{
                fontSize: '0.74rem',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Types</option>
              <option value="story">Stories</option>
              <option value="task">Tasks</option>
              <option value="bug">Bugs</option>
            </select>
          </div>

          {/* Quick Sprint Context Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Progress: <strong>{scopedPct}%</strong> ({scopedDone}/{scopedSprintTasks.length})
            </span>
            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${scopedPct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
            </div>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {scopedTotalHours}h total · {scopedTotalPts} pts
            </span>
          </div>
        </div>

        {/* View Content: Backlog Table OR Scrum Kanban Board */}
        {filteredScrumTasks.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={24} style={{ color: 'var(--status-warning)', margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>No Jira issues match the current filter</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Try adjusting the search query, sprint selection, or status filter.
            </div>
            <button
              type="button"
              onClick={() => {
                setScrumSprintFilter('all')
                setScrumStatusFilter('all')
                setScrumTypeFilter('all')
                setScrumSearch('')
              }}
              style={{
                marginTop: '12px',
                fontSize: '0.76rem',
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                cursor: 'pointer',
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : scrumViewMode === 'table' ? (
          /* Table View */
          <div className="jira-table-container">
            <table className="jira-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Type</th>
                  <th style={{ width: '110px' }}>Key</th>
                  <th>Summary</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '100px' }}>Sprint</th>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th style={{ width: '90px' }}>Estimate</th>
                  <th style={{ width: '150px' }}>Assignee</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScrumTasks.map((task) => (
                  <tr key={task.id}>
                    {/* Type */}
                    <td>{renderIssueTypeBadge(task.issue_type)}</td>

                    {/* Key */}
                    <td>
                      <button
                        type="button"
                        onClick={() => (onSelectTask ? onSelectTask(task.id) : onNavigateToGraph && onNavigateToGraph())}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#2563eb',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          textDecoration: 'none',
                        }}
                        title="Click to locate in Digital Twin Graph"
                      >
                        <span>{task.key || task.id.slice(0, 8)}</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>

                    {/* Summary */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {task.title}
                        </span>
                        {task.is_critical && (
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#ffe4e6',
                              color: '#e11d48',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title="On project critical path"
                          >
                            <Flame size={10} /> Critical
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`badge badge-${task.status}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Sprint */}
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.sprint_name || 'Backlog'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>{renderPriorityBadge(task.priority)}</td>

                    {/* Estimate */}
                    <td>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {task.estimate_hours || 4}h
                        {task.story_points ? ` (${task.story_points}pt)` : ''}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span className="jira-avatar-sm">
                          {getInitials(task.assignee_name)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {task.assignee_name || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => (onSelectTask ? onSelectTask(task.id) : onNavigateToGraph && onNavigateToGraph())}
                          style={{
                            padding: '3px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                          }}
                          title="Highlight in Digital Twin Graph"
                        >
                          Twin
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToImpact && onNavigateToImpact(task.id)}
                          style={{
                            padding: '3px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface-elevated)',
                            color: '#e11d48',
                            cursor: 'pointer',
                          }}
                          title="Run Impact Analysis on this ticket"
                        >
                          Impact
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Scrum Board Kanban View (4 Columns) */
          <div className="jira-scrum-board">
            {[
              { id: 'todo', title: 'To Do', color: '#64748b', bg: '#f1f5f9' },
              { id: 'in_progress', title: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
              { id: 'blocked', title: 'Blocked / Attention', color: '#dc2626', bg: '#fef2f2' },
              { id: 'done', title: 'Done', color: '#16a34a', bg: '#f0fdf4' },
            ].map((col) => {
              const colTasks = filteredScrumTasks.filter((t) => t.status === col.id)
              const colHours = colTasks.reduce((acc, t) => acc + (t.estimate_hours || 4), 0)

              return (
                <div key={col.id} className="scrum-col">
                  {/* Column Header */}
                  <div className="scrum-col-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {col.title}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: col.bg,
                        color: col.color,
                      }}
                    >
                      {colTasks.length} ({colHours}h)
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="scrum-col-cards">
                    {colTasks.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        No {col.title.toLowerCase()} issues
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="scrum-card"
                          onClick={() => (onSelectTask ? onSelectTask(task.id) : onNavigateToGraph && onNavigateToGraph())}
                          title="Click to inspect in Digital Twin"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#2563eb',
                              }}
                            >
                              {task.key || task.id.slice(0, 8)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {task.is_critical && (
                                <Flame size={12} style={{ color: 'var(--status-critical)' }} title="Critical Path" />
                              )}
                              {renderPriorityBadge(task.priority)}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              marginBottom: '8px',
                              lineHeight: '1.25',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {task.title}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span className="jira-avatar-sm">
                                {getInitials(task.assignee_name)}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {renderIssueTypeBadge(task.issue_type)}
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: 'var(--bg-surface-elevated)',
                                }}
                              >
                                {task.estimate_hours || 4}h
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
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
