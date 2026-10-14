import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Star,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Sliders,
  DollarSign,
  Cpu,
  Users,
  CheckCircle2,
} from 'lucide-react'
import {
  fetchDecisionComparison,
  commitDecisionPlan,
  simulateCustomScenario,
  DEFAULT_PROJECT_ID,
} from '../api'

export default function DecisionComparisonView({
  projectId = DEFAULT_PROJECT_ID,
  dataVersion = 0,
  onRefreshData,
  showToast,
  projectName = 'PROJECT ALPHA',
}) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState('plan_rebalance')
  const [isCommitting, setIsCommitting] = useState(false)
  const [copiedBrief, setCopiedBrief] = useState(false)

  // Interactive Sandbox State
  const [sandboxHours, setSandboxHours] = useState(40)
  const [contractorRate, setContractorRate] = useState(2200)
  const [customPlan, setCustomPlan] = useState(null)
  const [isSimulatingCustom, setIsSimulatingCustom] = useState(false)

  // Load decision comparison from backend
  const loadDecisionData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchDecisionComparison(projectId)
      setData(res)
      if (res?.recommended_plan_id) {
        setSelectedPlanId(res.recommended_plan_id)
      } else if (res?.plans?.length > 0) {
        setSelectedPlanId(res.plans[0].id)
      }
    } catch (err) {
      console.error('Failed to load decision comparison:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDecisionData()
  }, [projectId, dataVersion])

  // Commit selected plan
  const handleCommitPlan = async (planId) => {
    if (!planId) return
    setIsCommitting(true)
    try {
      const res = await commitDecisionPlan(projectId, planId)
      if (showToast) {
        showToast(res.message || 'Plan committed successfully!', 'success')
      } else {
        alert(res.message)
      }
      await loadDecisionData()
      if (onRefreshData) {
        await onRefreshData()
      }
    } catch (err) {
      const msg = `Failed to commit plan: ${err.message}`
      if (showToast) {
        showToast(msg, 'error')
      } else {
        alert(msg)
      }
    } finally {
      setIsCommitting(false)
    }
  }

  // Run Custom Scenario Sandbox
  const handleRunSandbox = async () => {
    setIsSimulatingCustom(true)
    try {
      const payload = {
        additional_dev_capacity_hours: Number(sandboxHours),
        contractor_hourly_rate_inr: Number(contractorRate),
        defer_task_ids: [],
        reassignments: [],
      }
      const res = await simulateCustomScenario(projectId, payload)
      setCustomPlan(res)
      if (showToast) {
        showToast('Custom what-if scenario calculated!', 'success')
      }
    } catch (err) {
      if (showToast) {
        showToast(`Simulation error: ${err.message}`, 'error')
      }
    } finally {
      setIsSimulatingCustom(false)
    }
  }

  // Copy Executive Brief to Clipboard
  const handleCopyBrief = () => {
    if (!data?.executive_brief) return
    navigator.clipboard.writeText(data.executive_brief)
    setCopiedBrief(true)
    setTimeout(() => setCopiedBrief(false), 3000)
    if (showToast) {
      showToast('Executive Decision Brief copied to clipboard!', 'success')
    }
  }

  if (isLoading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RotateCw size={32} className="animate-spin text-primary" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 600 }}>Computing Decision Matrix & Multi-Objective Trade-Offs...</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Evaluating Pareto efficiency across speed, confidence, cost, and team equity
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        <AlertTriangle size={36} color="var(--status-critical)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ marginBottom: '8px' }}>Unable to load decision comparison</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={loadDecisionData}>
          <RotateCw size={14} />
          <span>Retry Analysis</span>
        </button>
      </div>
    )
  }

  const plans = data?.plans || []
  const allDisplayPlans = customPlan ? [...plans, customPlan] : plans
  const activePlan = allDisplayPlans.find((p) => p.id === selectedPlanId) || allDisplayPlans[0]
  const baseline = plans.find((p) => p.id === 'baseline') || plans[0]

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Decision Comparison & Strategy Frontier</h1>
          <p className="page-subtitle">
            Multi-objective trade-off analysis comparing schedule acceleration, stochastic confidence, budget variance, and team equity
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyBrief} disabled={!data?.executive_brief}>
            {copiedBrief ? <Check size={14} color="var(--status-done)" /> : <Copy size={14} />}
            <span>{copiedBrief ? 'Copied Brief' : 'Copy Decision Brief'}</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadDecisionData} disabled={isLoading}>
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Analysis</span>
          </button>
        </div>
      </div>

      {/* Plan Selector Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${allDisplayPlans.length}, minmax(0, 1fr))`,
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {allDisplayPlans.map((p) => {
          const isSelected = selectedPlanId === p.id
          const isRec = p.is_recommended
          const isBase = p.id === 'baseline'

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              style={{
                background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                border: isSelected
                  ? '2px solid var(--primary)'
                  : isRec
                  ? '2px solid var(--status-done)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none',
              }}
            >
              {isRec && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '12px',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  RECOMMENDED
                </div>
              )}

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {p.name}
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {p.tagline}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Finish:</span>
                  <span style={{ fontWeight: 600, color: p.metrics.finish_days_delta < 0 ? 'var(--status-done)' : 'var(--text-primary)' }}>
                    {p.metrics.finish_date}
                    {p.metrics.finish_days_delta < 0 && ` (${p.metrics.finish_days_delta}d)`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>On-Time Prob:</span>
                  <span style={{ fontWeight: 600, color: p.metrics.on_time_probability_pct >= 70 ? 'var(--status-done)' : '#d97706' }}>
                    {p.metrics.on_time_probability_pct}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Budget:</span>
                  <span style={{ fontWeight: 600, color: p.metrics.cost_delta_inr < 0 ? 'var(--status-done)' : p.metrics.cost_delta_inr > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                    ₹{p.metrics.total_cost_inr.toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Rating:</span>
                  <span style={{ color: '#f59e0b', fontSize: '0.85rem', letterSpacing: '1px' }}>
                    {'★'.repeat(p.metrics.composite_stars)}
                    {'☆'.repeat(5 - p.metrics.composite_stars)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Multi-Criteria Comparison Matrix Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} className="text-primary" />
            <span>Multi-Criteria Decision Matrix</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Trade-off comparison across timeline, effort, financial cost, risk, and team equity
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>Evaluation Metric</th>
                {allDisplayPlans.map((p) => (
                  <th
                    key={p.id}
                    style={{
                      padding: '12px 14px',
                      color: p.is_recommended ? 'var(--status-done)' : p.id === selectedPlanId ? 'var(--primary)' : 'var(--text-primary)',
                      background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                    }}
                  >
                    {p.name.split('–')[0]}
                    {p.is_recommended && ' ★'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Finish Date */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--primary)" />
                    <span>Projected Finish Date</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => {
                  const delta = p.metrics.finish_days_delta
                  return (
                    <td
                      key={p.id}
                      style={{
                        padding: '12px 14px',
                        background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: delta < 0 ? 'var(--status-done)' : 'var(--text-primary)' }}>
                        {p.metrics.finish_date}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: delta < 0 ? 'var(--status-done)' : 'var(--text-muted)' }}>
                        {delta === 0 ? 'Baseline' : `${delta > 0 ? '+' : ''}${delta} calendar days`}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Total Effort */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu size={15} color="var(--primary)" />
                    <span>Total Sprint Scope Effort</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => {
                  const delta = p.metrics.effort_hours_delta
                  return (
                    <td
                      key={p.id}
                      style={{
                        padding: '12px 14px',
                        background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      }}
                    >
                      <div>{p.metrics.total_effort_hours} hrs</div>
                      <div style={{ fontSize: '0.74rem', color: delta < 0 ? 'var(--status-done)' : 'var(--text-muted)' }}>
                        {delta === 0 ? 'Zero Scope Cut' : `${delta > 0 ? '+' : ''}${delta}h buffered`}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Total Cost in INR */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} color="var(--primary)" />
                    <span>Total Financial Budget</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => {
                  const delta = p.metrics.cost_delta_inr
                  return (
                    <td
                      key={p.id}
                      style={{
                        padding: '12px 14px',
                        background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>₹{p.metrics.total_cost_inr.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.74rem', color: delta < 0 ? 'var(--status-done)' : delta > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {delta === 0
                          ? 'Baseline Budget'
                          : delta < 0
                          ? `-₹${Math.abs(delta).toLocaleString('en-IN')} saved`
                          : `+₹${delta.toLocaleString('en-IN')} contractor`}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* On-Time Probability */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} color="var(--primary)" />
                    <span>On-Time Confidence (Monte Carlo)</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => {
                  const prob = p.metrics.on_time_probability_pct
                  return (
                    <td
                      key={p.id}
                      style={{
                        padding: '12px 14px',
                        background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: prob >= 75 ? 'var(--status-done)' : prob >= 40 ? '#d97706' : '#dc2626',
                        }}
                      >
                        {prob}%
                      </span>
                    </td>
                  )
                })}
              </tr>

              {/* Team Equity / Burnout Balance */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} color="var(--primary)" />
                    <span>Team Workload Equity Score</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => (
                  <td
                    key={p.id}
                    style={{
                      padding: '12px 14px',
                      background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.metrics.team_balance_score}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / 100</span>
                  </td>
                ))}
              </tr>

              {/* Composite Score */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={15} color="#f59e0b" />
                    <span>Composite Decision Score</span>
                  </div>
                </td>
                {allDisplayPlans.map((p) => (
                  <td
                    key={p.id}
                    style={{
                      padding: '12px 14px',
                      background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>{p.metrics.composite_score}</span>
                      <span style={{ color: '#f59e0b', fontSize: '0.82rem' }}>
                        {'★'.repeat(p.metrics.composite_stars)}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Action Buttons */}
              <tr>
                <td style={{ padding: '14px', fontWeight: 600 }}>Commit Action</td>
                {allDisplayPlans.map((p) => {
                  const isBase = p.id === 'baseline'
                  const isCustom = p.id === 'custom_scenario'
                  return (
                    <td
                      key={p.id}
                      style={{
                        padding: '14px',
                        background: p.id === selectedPlanId ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      }}
                    >
                      {isBase ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', opacity: 0.6 }}
                          disabled
                        >
                          Current State
                        </button>
                      ) : isCustom ? (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ width: '100%' }}
                          onClick={handleRunSandbox}
                          disabled={isSimulatingCustom}
                        >
                          Re-Simulate
                        </button>
                      ) : (
                        <button
                          className={`btn ${p.is_recommended ? 'btn-primary' : 'btn-outline'} btn-sm`}
                          style={{ width: '100%' }}
                          onClick={() => handleCommitPlan(p.id)}
                          disabled={isCommitting}
                        >
                          {isCommitting ? 'Committing...' : `Commit ${p.name.split('–')[0].trim()}`}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Middle Section: Visual Horizon Chart & Selected Plan Action Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Visual Horizon Comparison Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BarChart3 size={18} className="text-primary" />
              <span>Finish Date Horizon Comparison (P50 vs P95 Delivery Windows)</span>
            </div>
          </div>

          <div style={{ padding: '10px 10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '170px', gap: '16px', padding: '0 10px' }}>
              {allDisplayPlans.map((p) => {
                const isSelected = selectedPlanId === p.id
                // Normalize bar height based on P95 horizon
                const maxHorizon = Math.max(...allDisplayPlans.map((x) => x.metrics.p95_horizon_hours || 150))
                const heightPct = Math.min(100, Math.max(25, ((p.metrics.p95_horizon_hours || 100) / maxHorizon) * 100))

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {Math.round(p.metrics.p95_horizon_hours)}h
                    </div>
                    <div
                      style={{
                        height: `${heightPct}%`,
                        background: isSelected
                          ? 'var(--primary)'
                          : p.is_recommended
                          ? 'var(--status-done)'
                          : 'var(--bg-surface-elevated)',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : '1px solid var(--border-subtle)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'all 0.3s ease',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        marginTop: '8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name.split('–')[0].trim()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: 'var(--status-done)', borderRadius: '2px' }} />
                <span>Recommended Optimal Plan</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
                <span>Selected Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Plan Action Items & Rationale */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sparkles size={18} className="text-primary" />
              <span>Strategy Details: {activePlan.name}</span>
            </div>
            {activePlan.is_recommended && (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                Optimal Trade-Off
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
            {activePlan.description}
          </p>

          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            ATOMIC ACTIONS COMPRISING THIS PLAN:
          </div>

          {activePlan.actions.length === 0 ? (
            <div style={{ padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Baseline plan retains status quo without modifications.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activePlan.actions.map((act, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CheckCircle2 size={14} color="var(--status-done)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '22px' }}>
                    {act.impact}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePlan.id !== 'baseline' && (
            <div style={{ marginTop: '16px' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
                onClick={() => handleCommitPlan(activePlan.id)}
                disabled={isCommitting}
              >
                {isCommitting ? 'Committing...' : `Commit ${activePlan.name} to Digital Twin`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Interactive What-If Sandbox & Comparative Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Interactive Custom Scenario Sandbox */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sliders size={18} className="text-primary" />
              <span>Interactive Decision Sandbox (Unique What-If Modeler)</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Real-time resource injection
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Simulate adding contractor engineering bandwidth to evaluate speed vs. financial cost in real-time.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
              <span>Additional Contractor Bandwidth:</span>
              <strong style={{ color: 'var(--primary)' }}>+{sandboxHours} hours</strong>
            </div>
            <input
              type="range"
              min="0"
              max="160"
              step="20"
              value={sandboxHours}
              onChange={(e) => setSandboxHours(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0h (Standard)</span>
              <span>80h (+1 full sprint dev)</span>
              <span>160h (+2 devs)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Contractor Rate (₹/hr):
              </label>
              <input
                type="number"
                value={contractorRate}
                onChange={(e) => setContractorRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-elevated)',
                  fontSize: '0.82rem',
                }}
              />
            </div>
            <div style={{ flex: 1, paddingTop: '18px' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%' }}
                onClick={handleRunSandbox}
                disabled={isSimulatingCustom}
              >
                <RotateCw size={13} className={isSimulatingCustom ? 'animate-spin' : ''} />
                <span>Simulate Scenario</span>
              </button>
            </div>
          </div>

          {customPlan && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                Sandbox Outcome: Finish {customPlan.metrics.finish_date} ({customPlan.metrics.finish_days_delta}d)
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                On-time confidence: <strong>{customPlan.metrics.on_time_probability_pct}%</strong> · Budget delta:{' '}
                <strong>+₹{Math.round(customPlan.metrics.cost_delta_inr).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Comparative Insights */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sparkles size={18} className="text-primary" />
              <span>Comparative Strategy Insights</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.insights || []).map((ins, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  fontSize: '0.84rem',
                  padding: '8px 0',
                  borderBottom: i < (data?.insights?.length || 0) - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                {ins.is_positive ? (
                  <CheckCircle size={16} color="var(--status-done)" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <AlertTriangle size={16} color="var(--status-critical)" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>{ins.plan_name}: </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{ins.insight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
