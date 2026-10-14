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

    // Identify downstream tasks blocked by the absent developer's tasks
    const downstreamIds = new Set()
    edges.forEach((e) => {
      if (directIds.has(e.source)) {
        downstreamIds.add(e.target)
      }
    })

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
                  <div style={{ width: '12px', height: '8px', background: '#3b82f6', borderRadius: '2px' }} />
                  <span>Simulated Shift</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Comparing Baseline Plan vs Scenario ({executedScenario.developer} absent for {executedScenario.days} days):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nodes.slice(0, 7).map((node, i) => {
                const isAssigned = node.assignee_name === executedScenario.developer
                const delayShift = isAssigned || i > 3 ? executedScenario.days * 2.5 : 0

                return (
                  <div key={node.id} style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '14px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {node.key || `T-0${i + 1}`} {node.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: isAssigned ? '#2563eb' : 'var(--text-muted)' }}>
                        {node.assignee_name || 'Unassigned'} {isAssigned && '• (On Leave)'}
                      </div>
                    </div>

                    <div style={{ position: 'relative', height: '22px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                      {/* Baseline Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${i * 11}%`,
                          width: '26%',
                          height: '100%',
                          background: '#cbd5e1',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                      {/* Scenario Shifted Bar */}
                      {delayShift > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${Math.min(72, i * 11 + delayShift)}%`,
                            width: '26%',
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
