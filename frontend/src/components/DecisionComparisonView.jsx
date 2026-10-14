import React, { useState } from 'react'
import {
  BarChart3,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingDown,
  Star,
  Sparkles,
} from 'lucide-react'

export default function DecisionComparisonView() {
  const [selectedPlan, setSelectedPlan] = useState('plan_b')

  const plans = [
    {
      id: 'baseline',
      name: 'Current Plan (Baseline)',
      finishDate: '21 May 2025',
      effort: '1,375 hrs',
      cost: '₹12.8 L',
      risk: 'Medium',
      workload: 76,
      score: 3,
      recommended: false,
    },
    {
      id: 'plan_a',
      name: 'Plan A – Reassign Tasks',
      finishDate: '17 May 2025 (-4d)',
      effort: '1,200 hrs (-175h)',
      cost: '₹11.2 L (-₹1.6L)',
      risk: 'Low',
      workload: 63,
      score: 4,
      recommended: false,
    },
    {
      id: 'plan_b',
      name: 'Plan B – Scope Buffer Optimization',
      finishDate: '19 May 2025 (-2d)',
      effort: '1,050 hrs (-325h)',
      cost: '₹9.6 L (-₹3.2L)',
      risk: 'Low',
      workload: 68,
      score: 5,
      recommended: true,
    },
    {
      id: 'plan_c',
      name: 'Plan C – Add Contractor Dev',
      finishDate: '28 May 2025 (+7d)',
      effort: '1,480 hrs (+105h)',
      cost: '₹14.0 L (+₹1.2L)',
      risk: 'Medium',
      workload: 74,
      score: 3,
      recommended: false,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Decision Comparison</h1>
          <p className="page-subtitle">Compare multi-scenario project execution strategies before committing changes</p>
        </div>
      </div>

      {/* Plan Selectors (From Wireframe 6) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              style={{
                background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                border: isSelected
                  ? '2px solid var(--primary)'
                  : p.recommended
                  ? '1px solid var(--status-done)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {p.recommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '14px',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    letterSpacing: '0.04em',
                  }}
                >
                  RECOMMENDED
                </div>
              )}
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {p.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Finish: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.finishDate}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Budget: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.cost}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison Matrix Table (From Wireframe 6) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '14px' }}>Metric</th>
              <th style={{ padding: '14px' }}>Current Plan (Baseline)</th>
              <th style={{ padding: '14px' }}>Plan A (Reassign)</th>
              <th style={{ padding: '14px', color: 'var(--status-done)' }}>Plan B (Optimized)</th>
              <th style={{ padding: '14px' }}>Plan C (Contractor)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px', fontWeight: 600 }}>Finish Date</td>
              <td style={{ padding: '14px' }}>21 May 2025</td>
              <td style={{ padding: '14px', color: 'var(--status-done)', fontWeight: 600 }}>17 May (-4 days)</td>
              <td style={{ padding: '14px', color: 'var(--status-done)', fontWeight: 600 }}>19 May (-2 days)</td>
              <td style={{ padding: '14px', color: '#f43f5e' }}>28 May (+7 days)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px', fontWeight: 600 }}>Total Effort</td>
              <td style={{ padding: '14px' }}>1,375 hrs</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>1,200 hrs (-175h)</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>1,050 hrs (-325h)</td>
              <td style={{ padding: '14px', color: '#f43f5e' }}>1,480 hrs (+105h)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px', fontWeight: 600 }}>Total Cost</td>
              <td style={{ padding: '14px' }}>₹12.8 L</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>₹11.2 L</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>₹9.6 L</td>
              <td style={{ padding: '14px', color: '#f43f5e' }}>₹14.0 L</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px', fontWeight: 600 }}>Risk Level</td>
              <td style={{ padding: '14px', color: 'var(--status-warning)' }}>Medium</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>Low</td>
              <td style={{ padding: '14px', color: 'var(--status-done)' }}>Low</td>
              <td style={{ padding: '14px', color: 'var(--status-warning)' }}>Medium</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px', fontWeight: 600 }}>Overall Score</td>
              <td style={{ padding: '14px', color: '#f59e0b' }}>★★★☆☆</td>
              <td style={{ padding: '14px', color: '#f59e0b' }}>★★★★☆</td>
              <td style={{ padding: '14px', color: '#f59e0b' }}>★★★★★</td>
              <td style={{ padding: '14px', color: '#f59e0b' }}>★★★☆☆</td>
            </tr>
            <tr>
              <td style={{ padding: '14px', fontWeight: 600 }}>Action</td>
              <td style={{ padding: '14px' }}>—</td>
              <td style={{ padding: '14px' }}>
                <button className="btn btn-outline btn-sm">Select Plan A</button>
              </td>
              <td style={{ padding: '14px' }}>
                <button className="btn btn-primary btn-sm">Commit Plan B</button>
              </td>
              <td style={{ padding: '14px' }}>
                <button className="btn btn-outline btn-sm">Select Plan C</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insights summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sparkles size={18} className="text-primary" />
              <span>Comparative Insights</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <CheckCircle size={16} color="var(--status-done)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Plan B offers the highest cost savings (₹3.2 L reduction) while improving completion timeline.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <CheckCircle size={16} color="var(--status-done)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Plan A resolves developer bottlenecks with zero scope compromise.</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BarChart3 size={18} className="text-primary" />
              <span>Finish Date Horizon Comparison</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '20px', padding: '10px 20px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '90px', background: 'var(--primary)', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>Baseline</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '70px', background: 'var(--status-done)', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>Plan A</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '60px', background: '#06b6d4', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>Plan B</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '120px', background: '#f43f5e', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>Plan C</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
