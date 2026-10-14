import React, { useState, useMemo } from 'react'
import {
  FlaskConical,
  UserX,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'

export default function WhatIfView({ graphData }) {
  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []

  // Extract unique active developers from project tasks
  const availableDevelopers = useMemo(() => {
    const set = new Set()
    nodes.forEach((n) => n.assignee_name && set.add(n.assignee_name))
    return set.size > 0 ? Array.from(set) : ['Alice Chen', 'Bob Smith', 'Charlie Dave']
  }, [nodes])

  // Form input states
  const [scenarioType, setScenarioType] = useState('dev_absence')
  const [selectedDev, setSelectedDev] = useState(availableDevelopers[0] || 'Alice Chen')
  const [absenceDays, setAbsenceDays] = useState(5)

  // Simulation execution result state
  const [executedScenario, setExecutedScenario] = useState({
    developer: availableDevelopers[0] || 'Alice Chen',
    days: 5,
    type: 'dev_absence',
    executedAt: new Date(),
  })

  // Compute simulation outcomes based on the executed scenario
  const simulationResults = useMemo(() => {
    const dev = executedScenario.developer
    const days = executedScenario.days

    // Identify tasks assigned directly to the absent developer
    const directlyAffected = nodes.filter((n) => n.assignee_name === dev)
    const directIds = new Set(directlyAffected.map((n) => n.id))

    // Multi-hop BFS to find all downstream tasks blocked by the absent developer's tasks
    const downstreamIds = new Set()
    const queue = Array.from(directIds)
    while (queue.length > 0) {
      const curr = queue.shift()
      edges.forEach((e) => {
        if (e.source === curr && !directIds.has(e.target) && !downstreamIds.has(e.target)) {
          downstreamIds.add(e.target)
          queue.push(e.target)
        }
      })
    }

    // Check if any affected task is on the critical path
    const hasCriticalTaskAffected = directlyAffected.some((n) => n.is_critical)
    const finishDelayDays = hasCriticalTaskAffected ? days : Math.max(1, Math.floor(days * 0.6))

    // Baseline finish calculation
    const baseDate = new Date(2025, 4, 16) // May 16, 2025
    const scenarioDate = new Date(baseDate)
    scenarioDate.setDate(baseDate.getDate() + finishDelayDays)

    const rebalanceDate = new Date(baseDate)
    rebalanceDate.setDate(baseDate.getDate() + Math.ceil(finishDelayDays * 0.4))

    const baselineHours = Math.round(graphData?.total_duration_hours || 120)
    const additionalHours = days * 6

    const risk = finishDelayDays > 5 ? 'High' : finishDelayDays > 2 ? 'Medium' : 'Low'

    return {
      directlyAffected,
      directIds,
      downstreamIds,
      downstreamCount: downstreamIds.size,
      finishDelayDays,
      baseDateFormatted: baseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      scenarioDateFormatted: scenarioDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      rebalanceDateFormatted: rebalanceDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      baselineHours,
      scenarioHours: baselineHours + additionalHours,
      rebalanceHours: baselineHours + Math.round(additionalHours * 0.5),
      risk,
    }
  }, [executedScenario, nodes, edges, graphData])

  // Naturally sort all project tasks by key suffix (e.g. SCRUM2-1, SCRUM2-2, ... SCRUM2-20)
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const numA = parseInt(a.key?.split('-')[1] || '0', 10)
      const numB = parseInt(b.key?.split('-')[1] || '0', 10)
      if (numA && numB) return numA - numB
      return (a.earliest_start_hours || 0) - (b.earliest_start_hours || 0)
    })
  }, [nodes])

  // Trigger running the simulation
  const handleRunSimulation = () => {
    setExecutedScenario({
      developer: selectedDev,
      days: absenceDays,
      type: scenarioType,
      executedAt: new Date(),
    })
  }

  // Reset back to baseline 0-day delay
  const handleReset = () => {
    setAbsenceDays(0)
    setExecutedScenario({
      developer: selectedDev,
      days: 0,
      type: scenarioType,
      executedAt: new Date(),
    })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">What-If Simulation</h1>
          <p className="page-subtitle">
            Simulate real-world project scenarios, developer absences, and evaluate outcome variations
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '24px' }}>
        {/* Left Column: Timeline & Comparison Results */}
        <div>
          {/* Active Outcome Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-lg)',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} className="text-primary" />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e3a8a' }}>
                  Simulation Output: {executedScenario.developer} absent for {executedScenario.days} days
                </div>
                <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '2px' }}>
                  Result: Pushes completion by <strong>+{simulationResults.finishDelayDays} days</strong> ({simulationResults.scenarioDateFormatted}) · {simulationResults.directlyAffected.length} tasks directly delayed.
                </div>
              </div>
            </div>
            <span className={`badge ${simulationResults.risk === 'High' ? 'badge-blocked' : simulationResults.risk === 'Medium' ? 'badge-todo' : 'badge-done'}`}>
              Risk: {simulationResults.risk}
            </span>
          </div>

          {/* Scenario Execution Horizon (Gantt) */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <div className="card-title">
                <FlaskConical size={18} className="text-primary" />
                <span>Scenario Execution Horizon (Gantt Shift)</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '8px', background: '#cbd5e1', borderRadius: '2px' }} />
                  <span>Baseline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '8px', background: '#93c5fd', border: '1px solid #2563eb', borderRadius: '2px' }} />
                  <span>Direct Delay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '8px', background: '#fde047', border: '1px solid #ca8a04', borderRadius: '2px' }} />
                  <span>Cascade Delay</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Comparing Baseline Plan vs Scenario ({executedScenario.developer} absent for {executedScenario.days} days):
              </p>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing all {sortedNodes.length} tasks (Scrollable)
              </span>
            </div>

            {/* Scrollable container covering exact same space as before */}
            <div
              className="scrollable-gantt"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '340px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}
            >
              {sortedNodes.map((node, i) => {
                const isAssigned = (simulationResults.directIds || new Set()).has(node.id)
                const isCascade = (simulationResults.downstreamIds || new Set()).has(node.id)
                const isDelayed = isAssigned || isCascade

                // Horizon percentages
                const totalHorizon = Math.max(1, (graphData?.total_duration_hours || 184) + (executedScenario.days * 8 * 1.2))
                const startHrs = node.earliest_start_hours || (i * 7)
                const durHrs = Math.max(6, node.estimate_hours || 8)

                const baseLeftPct = Math.min(68, Math.max(1, (startHrs / totalHorizon) * 75))
                const baseWidthPct = Math.min(26, Math.max(10, (durHrs / totalHorizon) * 75))

                const shiftHours = executedScenario.days * 8 * 0.45
                const shiftPct = Math.min(24, Math.max(8, (shiftHours / totalHorizon) * 75))
                const shiftedLeftPct = Math.min(74, baseLeftPct + shiftPct)

                return (
                  <div key={node.id} style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '14px', alignItems: 'center' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${node.key || `T-0${i + 1}`} ${node.title}`}
                      >
                        {node.key || `T-0${i + 1}`} {node.title}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isAssigned ? '#2563eb' : isCascade ? '#ca8a04' : 'var(--text-muted)' }}>
                        {node.assignee_name || 'Unassigned'} {isAssigned ? '• (On Leave)' : isCascade ? '• (Blocked)' : ''}
                      </div>
                    </div>

                    <div style={{ position: 'relative', height: '22px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                      {/* Baseline Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${baseLeftPct}%`,
                          width: `${baseWidthPct}%`,
                          height: '100%',
                          background: '#cbd5e1',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                      {/* Scenario Shifted Bar */}
                      {isDelayed && executedScenario.days > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${shiftedLeftPct}%`,
                            width: `${baseWidthPct}%`,
                            height: '100%',
                            background: isAssigned ? '#93c5fd' : '#fde047',
                            border: `1px solid ${isAssigned ? '#2563eb' : '#ca8a04'}`,
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            color: isAssigned ? '#1e3a8a' : '#713f12',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          +{executedScenario.days}d
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scenario Comparison Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={18} className="text-primary" />
                <span>Scenario Comparison Metrics</span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Metric</th>
                  <th style={{ padding: '10px 12px' }}>Current Plan (Baseline)</th>
                  <th style={{ padding: '10px 12px', color: 'var(--primary)', fontWeight: 700 }}>
                    Scenario 1 (Absence: {executedScenario.days}d)
                  </th>
                  <th style={{ padding: '10px 12px', color: 'var(--status-done)', fontWeight: 600 }}>
                    Scenario 2 (Rebalance)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>Finish Date</td>
                  <td style={{ padding: '12px' }}>{simulationResults.baseDateFormatted}</td>
                  <td style={{ padding: '12px', color: simulationResults.finishDelayDays > 0 ? '#dc2626' : 'var(--text-primary)', fontWeight: 600 }}>
                    {simulationResults.scenarioDateFormatted} (+{simulationResults.finishDelayDays}d)
                  </td>
                  <td style={{ padding: '12px', color: 'var(--status-done)' }}>
                    {simulationResults.rebalanceDateFormatted} (+{Math.ceil(simulationResults.finishDelayDays * 0.4)}d)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>Total Effort</td>
                  <td style={{ padding: '12px' }}>{simulationResults.baselineHours} hrs</td>
                  <td style={{ padding: '12px', color: '#d97706', fontWeight: 600 }}>
                    {simulationResults.scenarioHours} hrs (+{simulationResults.scenarioHours - simulationResults.baselineHours}h)
                  </td>
                  <td style={{ padding: '12px', color: 'var(--status-done)' }}>
                    {simulationResults.rebalanceHours} hrs
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', fontWeight: 600 }}>Risk Index</td>
                  <td style={{ padding: '12px', color: 'var(--status-done)' }}>Low</td>
                  <td style={{ padding: '12px' }}>
                    <span className={simulationResults.risk === 'High' ? 'badge badge-blocked' : simulationResults.risk === 'Medium' ? 'badge-todo' : 'badge-done'}>
                      {simulationResults.risk}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-done">Low</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Configure Scenario (From Wireframe 4) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FlaskConical size={18} className="text-primary" />
              <span>Configure Scenario</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleReset} title="Reset to 0 days">
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Scenario Type
              </label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.86rem',
                }}
              >
                <option value="dev_absence">Developer Absence (Leave)</option>
                <option value="task_slip">Task Delay / Blocker</option>
                <option value="scope_addition">Scope / Story Points Increase</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Select Developer
              </label>
              <select
                value={selectedDev}
                onChange={(e) => setSelectedDev(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                }}
              >
                {availableDevelopers.map((dev) => (
                  <option key={dev} value={dev}>
                    {dev}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Absence Period (Working Days)
                </label>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {absenceDays} days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={absenceDays}
                onChange={(e) => setAbsenceDays(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            {/* Quick Details of the Selection */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div>
                <strong>Developer:</strong> {selectedDev}
              </div>
              <div>
                <strong>Assigned Tasks:</strong>{' '}
                {nodes.filter((n) => n.assignee_name === selectedDev).length} tasks in project
              </div>
              <div>
                <strong>Simulated Delay:</strong> +{absenceDays} working days ({absenceDays * 8}h)
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '8px', width: '100%', padding: '10px' }}
              onClick={handleRunSimulation}
            >
              <Play size={15} />
              <span>Run Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
