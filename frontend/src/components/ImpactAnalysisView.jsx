import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Flame,
  Layers,
  Sparkles,
  Sliders,
  TrendingUp,
} from 'lucide-react'

export default function ImpactAnalysisView({
  graphData,
  selectedTaskId,
  onSelectTask,
  downstreamTaskIds = [],
}) {
  const [delayDays, setDelayDays] = useState(3)
  const nodes = graphData?.nodes || []
  const criticalPath = graphData?.critical_path || []

  // Current task
  const activeTask = nodes.find((n) => n.id === selectedTaskId) || nodes[0]

  // Downstream tasks objects
  const affectedTasks = useMemo(() => {
    if (!activeTask) return []
    return nodes.filter((n) => downstreamTaskIds.includes(n.id) && n.id !== activeTask.id)
  }, [nodes, downstreamTaskIds, activeTask])

  // Is this task on critical path?
  const isOnCriticalPath = activeTask ? activeTask.is_critical : false

  // Calculated impact
  const affectedCount = affectedTasks.length
  const delayHours = delayDays * 8
  const estimatedCost = delayHours * 1500 // ₹1,500 or $18/hr
  const isFinishDateShifted = isOnCriticalPath

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Impact Analysis</h1>
          <p className="page-subtitle">
            Simulate requirement modifications, schedule slips, and evaluate downstream cascading effects
          </p>
        </div>
      </div>

      {/* Task Selector & Simulation Control */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Select Target Task to Simulate Change:
            </label>
            <select
              value={activeTask?.id || ''}
              onChange={(e) => onSelectTask(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  [{n.key || 'TASK'}] {n.title} ({n.status} - {n.assignee_name || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Simulate Schedule Slip / Additional Effort:
              </label>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-warning)' }}>
                +{delayDays} days ({delayHours} hrs)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              value={delayDays}
              onChange={(e) => setDelayDays(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Summary of Request (From Wireframe 3) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <Sliders size={18} className="text-primary" />
            <span>Summary of Request Impact</span>
          </div>
          {isOnCriticalPath ? (
            <span className="badge badge-critical">Critical Path Risk: High</span>
          ) : (
            <span className="badge badge-done">Critical Path Risk: Contained</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Affected Tasks */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Affected Tasks
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f43f5e', margin: '4px 0' }}>
              {affectedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Tasks Downstream
            </div>
          </div>

          {/* Finish Date Shift */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Finish Date Shift
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: isOnCriticalPath ? '#ef4444' : 'var(--status-done)', margin: '4px 0' }}>
              {isOnCriticalPath ? `+${delayDays} days` : '0 days (Buffer)'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isOnCriticalPath ? 'Pushes final milestone' : 'Absorbed in non-critical float'}
            </div>
          </div>

          {/* Effort Increase */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Effort Increase
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: '4px 0' }}>
              {delayHours} hrs
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Additional Engineering Effort
            </div>
          </div>

          {/* Cost Shift */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Estimated Cost Impact
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', margin: '4px 0' }}>
              ₹{estimatedCost.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Project Budget Variance
            </div>
          </div>
        </div>

        {/* Insight Banner (From Wireframe 3) */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.86rem',
            color: '#1e3a8a',
            fontWeight: 500,
          }}
        >
          <Sparkles size={18} className="text-primary" />
          <span>
            This change directly affects{' '}
            <strong>{affectedCount} downstream task{affectedCount === 1 ? '' : 's'}</strong>
            {isOnCriticalPath
              ? `, pushing the project completion date out by ${delayDays} day${delayDays === 1 ? '' : 's'}.`
              : ', but has sufficient slack to avoid delaying the final release date.'}
          </span>
        </div>
      </div>

      {/* Impact Visualization (Timeline View / Gantt) (From Wireframe 3) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar size={18} className="text-primary" />
            <span>Impact Visualization (Timeline View)</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '14px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
              <span>Current Schedule</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '14px',
                  height: '10px',
                  background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 2px, #fca5a5 2px, #fca5a5 6px)',
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#fca5a5' }}>New Schedule (After Slip)</span>
            </div>
          </div>
        </div>

        {/* Timeline Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
          {/* Target Task Bar */}
          {activeTask && (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  [{activeTask.key || 'TASK'}] {activeTask.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Target Simulating Slip</div>
              </div>

              <div
                style={{
                  position: 'relative',
                  height: '24px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {/* Current Bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: '10%',
                    width: '35%',
                    height: '100%',
                    background: 'var(--primary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  Baseline ({activeTask.estimate_hours || 4}h)
                </div>
                {/* Slip Extension */}
                <div
                  style={{
                    position: 'absolute',
                    left: '45%',
                    width: `${Math.min(45, delayDays * 5)}%`,
                    height: '100%',
                    background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 3px, #7f1d1d 3px, #7f1d1d 8px)',
                    borderRadius: '0 4px 4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  +{delayDays}d
                </div>
              </div>
            </div>
          )}

          {/* Downstream Affected Tasks Bars */}
          {affectedTasks.length > 0 ? (
            affectedTasks.map((t, idx) => {
              const baseOffset = 45 + idx * 6
              const slipWidth = 25
              return (
                <div
                  key={t.id}
                  style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: '16px' }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      [{t.key || 'TASK'}] {t.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Downstream Dependent · {t.assignee_name || 'Unassigned'}
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      height: '22px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {/* Shifted bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${Math.min(70, baseOffset + (isOnCriticalPath ? delayDays * 2 : 0))}%`,
                        width: `${slipWidth}%`,
                        height: '100%',
                        background: isOnCriticalPath
                          ? 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 3px, #b45309 3px, #b45309 8px)'
                          : 'var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        color: '#ffffff',
                        fontWeight: 600,
                      }}
                    >
                      {isOnCriticalPath ? 'Pushed Schedule' : 'Normal Schedule'}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No downstream tasks are directly blocked by this item. Changes will remain isolated.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
