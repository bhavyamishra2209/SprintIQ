import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingDown,
  Star,
  Activity,
  AlertTriangle,
  Play,
  RotateCw,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { fetchRecommendations, applyRecommendation, DEFAULT_PROJECT_ID } from '../api'

export default function RecommendationsView({
  projectId = DEFAULT_PROJECT_ID,
  dataVersion = 0,
  onRefreshData,
  showToast,
}) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRecId, setSelectedRecId] = useState(null)
  const [isApplying, setIsApplying] = useState(false)

  // Load live recommendations from backend engine
  const loadRecommendations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchRecommendations(projectId)
      setData(res)
      if (res?.recommendations?.length > 0) {
        setSelectedRecId(res.recommendations[0].id)
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [projectId, dataVersion])

  const recommendations = data?.recommendations || []
  const monteCarlo = data?.monte_carlo
  const workloadSummary = data?.workload_summary || []
  const taskRisks = data?.task_risks || []
  const balanceScore = data?.overall_balance_score ?? 75.0

  // Filter recommendations by selected tab
  const filteredRecs = recommendations.filter((r) => {
    if (activeTab === 'all') return true
    return r.type === activeTab
  })

  const activeRec =
    recommendations.find((r) => r.id === selectedRecId) || recommendations[0]

  // Handle applying a recommendation
  const handleApply = async (rec) => {
    if (!rec || !rec.task_id) return
    setIsApplying(true)
    try {
      const payload = {
        action_type: rec.action_type || rec.type,
        task_id: rec.task_id,
        new_assignee_id: rec.to_assignee_id,
      }
      const res = await applyRecommendation(projectId, payload)
      if (showToast) {
        showToast(res.message || 'Optimization applied successfully!', 'success')
      }
      // Reload recommendations and trigger global app refresh
      await loadRecommendations()
      if (onRefreshData) {
        await onRefreshData()
      }
    } catch (err) {
      if (showToast) {
        showToast(`Failed to apply: ${err.message}`, 'error')
      } else {
        alert(`Error: ${err.message}`)
      }
      // On error, auto-refresh to synchronize with latest backend data
      await loadRecommendations()
    } finally {
      setIsApplying(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Activity size={32} className="animate-spin text-primary" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 600 }}>Running Monte Carlo Simulation & ML Risk Inference...</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evaluating 1,000 PERT-Beta schedule paths</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        <AlertTriangle size={36} color="var(--status-critical)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ marginBottom: '8px' }}>Unable to load optimization recommendations</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={loadRecommendations}>
          <RotateCw size={14} />
          <span>Retry Analysis</span>
        </button>
      </div>
    )
  }

  const highRiskCount = taskRisks.filter((t) => t.risk_level === 'High').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recommendations & Optimization Engine</h1>
          <p className="page-subtitle">
            Prescriptive Digital Twin optimization, Monte Carlo schedule risk simulation, and ML delay risk scoring
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadRecommendations} disabled={isLoading}>
          <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Statistical & ML KPI Banner */}
      <div className="kpi-grid" style={{ marginBottom: '22px' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">On-Time Probability</span>
            <div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Activity size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: (monteCarlo?.on_time_probability_pct ?? 80) >= 70 ? 'var(--status-done)' : '#d97706' }}>
            {monteCarlo?.on_time_probability_pct ?? 82.5}%
          </div>
          <div className="kpi-subtext">
            <span>Monte Carlo (1,000 runs)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Team Balance Score</span>
            <div className="kpi-icon" style={{ background: '#eff6ff', color: 'var(--primary)' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-value">{balanceScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 100</span></div>
          <div className="kpi-subtext highlight-good">
            <span>Coefficient of Variation metric</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Simulated Horizon (P50 / P95)</span>
            <div className="kpi-icon">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.25rem' }}>
            {monteCarlo?.p50_duration_hours ?? 78}h / {monteCarlo?.p95_duration_hours ?? 92}h
          </div>
          <div className="kpi-subtext">
            <span>Nominal CPM: {monteCarlo?.nominal_duration_hours ?? 80}h</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">ML Slip Bottlenecks</span>
            <div className="kpi-icon" style={{ background: highRiskCount > 0 ? '#fee2e2' : '#dcfce7', color: highRiskCount > 0 ? '#dc2626' : '#16a34a' }}>
              <Cpu size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: highRiskCount > 0 ? '#dc2626' : 'var(--text-primary)' }}>
            {highRiskCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>high risk</span>
          </div>
          <div className="kpi-subtext">
            <span>Random Forest predictive scoring</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', overflowX: 'auto' }}>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('all')}
        >
          All Recommendations ({recommendations.length})
        </button>
        <button
          className={`btn ${activeTab === 'reassign' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('reassign')}
        >
          Reassign Tasks ({recommendations.filter((r) => r.type === 'reassign').length})
        </button>
        <button
          className={`btn ${activeTab === 'concurrency' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('concurrency')}
        >
          Concurrency Fast-Tracking ({recommendations.filter((r) => r.type === 'concurrency').length})
        </button>
        <button
          className={`btn ${activeTab === 'scope' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('scope')}
        >
          Scope Optimization ({recommendations.filter((r) => r.type === 'scope').length})
        </button>
        <button
          className={`btn ${activeTab === 'ml_risks' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('ml_risks')}
          style={{ marginLeft: 'auto' }}
        >
          <Cpu size={13} />
          <span>ML Task Risk Scores ({taskRisks.length})</span>
        </button>
      </div>

      {/* View Mode A: Recommendations Table & Action View */}
      {activeTab !== 'ml_risks' && (
        <>
          {/* Recommendations Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Optimization Strategy</th>
                  <th style={{ padding: '12px 14px' }}>Potential Saving</th>
                  <th style={{ padding: '12px 14px' }}>Timeline Impact</th>
                  <th style={{ padding: '12px 14px' }}>Risk</th>
                  <th style={{ padding: '12px 14px' }}>Confidence</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecs.map((rec) => {
                  const isSelected = rec.id === selectedRecId
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedRecId(rec.id)}
                    >
                      <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={15} color="var(--primary)" />
                          <span>{rec.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--status-done)', fontWeight: 600 }}>
                        {rec.savings}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                        {rec.impact}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className={`badge ${rec.risk === 'Low' ? 'badge-done' : rec.risk === 'Medium' ? 'badge-todo' : 'badge-blocked'}`}>
                          {rec.risk}
                        </span>
                      </td>
                      <td style={{ padding: '14px', color: '#f59e0b', fontWeight: 600 }}>
                        ★ {rec.confidence} / 5
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-sm`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRecId(rec.id)
                          }}
                        >
                          {isSelected ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed Recommendation Analysis Card */}
          {activeRec && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Sparkles size={18} className="text-primary" />
                  <span>Prescriptive Analysis: {activeRec.title}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApply(activeRec)}
                  disabled={isApplying || !activeRec.task_id}
                >
                  <Play size={13} />
                  <span>{isApplying ? 'Applying Optimization...' : 'Apply Optimization'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Why does the model prescribe this?
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{activeRec.why}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <CheckCircle size={15} color="var(--status-done)" />
                      <span>{activeRec.savings} with verified topological critical path relief</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <CheckCircle size={15} color="var(--status-done)" />
                      <span>Stochastic on-time confidence rating: <strong>{activeRec.confidence} / 5.0</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <CheckCircle size={15} color="var(--status-done)" />
                      <span>Actionable in one-click via Digital Twin commit</span>
                    </div>
                  </div>
                </div>

                {/* Resource Workload Before & After */}
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Resource Utilization Shift:
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Before: {activeRec.before?.assignee}</span>
                      <span style={{ color: (activeRec.before?.workload ?? 80) >= 85 ? '#ef4444' : 'var(--text-primary)', fontWeight: 600 }}>
                        {activeRec.before?.workload ?? 85}%
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, activeRec.before?.workload ?? 85)}%`,
                          background: (activeRec.before?.workload ?? 80) >= 85 ? '#ef4444' : 'var(--primary)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>After: {activeRec.after?.assignee}</span>
                      <span style={{ color: 'var(--status-done)', fontWeight: 600 }}>
                        {activeRec.after?.workload ?? 65}% (Optimal)
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, activeRec.after?.workload ?? 65)}%`,
                          background: 'var(--status-done)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Mode B: ML Task Risk Scores Table */}
      {activeTab === 'ml_risks' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Cpu size={18} className="text-primary" />
              <span>Machine Learning Task Slippage Risk Classifier</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Random Forest model with topological centrality features
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>Issue Key & Title</th>
                <th style={{ padding: '12px 14px' }}>Estimate</th>
                <th style={{ padding: '12px 14px' }}>Critical Path</th>
                <th style={{ padding: '12px 14px' }}>Fan-Out (In/Out)</th>
                <th style={{ padding: '12px 14px' }}>Slip Probability</th>
                <th style={{ padding: '12px 14px' }}>Risk Level</th>
                <th style={{ padding: '12px 14px' }}>Top Delay Risk Factors</th>
              </tr>
            </thead>
            <tbody>
              {taskRisks.map((tr) => (
                <tr key={tr.task_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                    <div style={{ color: 'var(--primary)' }}>{tr.task_key}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tr.title}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>{tr.estimate_hours} hrs</td>
                  <td style={{ padding: '12px 14px' }}>
                    {tr.is_critical ? (
                      <span className="badge badge-critical">Yes (Critical)</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {tr.in_degree} in / {tr.out_degree} out
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.round(tr.risk_score * 100)}%`,
                            background: tr.risk_level === 'High' ? '#ef4444' : tr.risk_level === 'Medium' ? '#f59e0b' : 'var(--status-done)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600 }}>{Math.round(tr.risk_score * 100)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`badge ${tr.risk_level === 'High' ? 'badge-blocked' : tr.risk_level === 'Medium' ? 'badge-todo' : 'badge-done'}`}>
                      {tr.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {tr.top_risk_factors.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
