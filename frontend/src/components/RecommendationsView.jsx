import React, { useState } from 'react'
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Users,
  Clock,
  ShieldCheck,
  TrendingDown,
  Star,
} from 'lucide-react'

export default function RecommendationsView() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRecId, setSelectedRecId] = useState(1)

  const recommendations = [
    {
      id: 1,
      type: 'reassign',
      title: 'Move Task ALPHA-5 (Database Schema) from Bob to Alice',
      savings: 'Save 3 days / ₹45,000',
      impact: 'Finish: 21 May · Effort -16h',
      risk: 'Low',
      confidence: 4.5,
      why: 'Alice has lower current workload and has completed prerequisite data models.',
      before: { assignee: 'Bob Smith', workload: 92 },
      after: { assignee: 'Alice Chen', workload: 68 },
    },
    {
      id: 2,
      type: 'reassign',
      title: 'Overlap ALPHA-3 (Payment Service) and ALPHA-4 (UI Integration)',
      savings: 'Save 2 days / ₹30,000',
      impact: 'Finish: 22 May · Effort -10h',
      risk: 'Medium',
      confidence: 3.9,
      why: 'Mock contracts allow UI work to start 3 days prior to full backend deployment.',
      before: { assignee: 'Sequential', workload: 80 },
      after: { assignee: 'Concurrent', workload: 75 },
    },
    {
      id: 3,
      type: 'scope',
      title: 'Defer non-critical item ALPHA-7 (Analytics Export) to Sprint 3',
      savings: 'Save 4 days / ₹60,000',
      impact: 'Finish: 18 May · Effort -24h',
      risk: 'Low',
      confidence: 4.8,
      why: 'Task is on non-critical path and does not block MVP milestone delivery.',
      before: { assignee: 'Sprint 2', workload: 95 },
      after: { assignee: 'Sprint 3', workload: 70 },
    },
  ]

  const activeRec = recommendations.find((r) => r.id === selectedRecId) || recommendations[0]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recommendations & Optimization</h1>
          <p className="page-subtitle">Rule-based optimization engine suggesting workload rebalancing and risk reductions</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
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
          Reassign Tasks (2)
        </button>
        <button
          className={`btn ${activeTab === 'scope' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('scope')}
        >
          Scope Optimization (1)
        </button>
      </div>

      {/* Recommendations Table (From Wireframe 5) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px' }}>Recommendation</th>
              <th style={{ padding: '12px 14px' }}>Potential Saving</th>
              <th style={{ padding: '12px 14px' }}>Impact</th>
              <th style={{ padding: '12px 14px' }}>Risk</th>
              <th style={{ padding: '12px 14px' }}>Confidence</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec) => {
              const isSelected = rec.id === selectedRecId
              return (
                <tr
                  key={rec.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedRecId(rec.id)}
                >
                  <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={15} className="text-primary" />
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
                    <span className={rec.risk === 'Low' ? 'badge badge-done' : 'badge badge-blocked'}>
                      {rec.risk}
                    </span>
                  </td>
                  <td style={{ padding: '14px', color: '#f59e0b' }}>
                    ★ {rec.confidence} / 5
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendation Details (From Wireframe 5) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Sparkles size={18} className="text-primary" />
            <span>Optimization Analysis: {activeRec.title}</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => alert(`Applied recommendation: ${activeRec.title}`)}
          >
            Apply Optimization
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Why this recommendation?
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{activeRec.why}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                <CheckCircle size={15} color="var(--status-done)" />
                <span>Finish date improved by up to 3 days</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                <CheckCircle size={15} color="var(--status-done)" />
                <span>Critical path slack increased by 16 hours</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                <CheckCircle size={15} color="var(--status-done)" />
                <span>No scope reduction required</span>
              </div>
            </div>
          </div>

          {/* Workload Before & After */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
              Resource Workload Impact:
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Before: {activeRec.before.assignee}</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{activeRec.before.workload}% (Overloaded)</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }}>
                <div style={{ height: '100%', width: `${activeRec.before.workload}%`, background: '#ef4444', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>After: {activeRec.after.assignee}</span>
                <span style={{ color: 'var(--status-done)', fontWeight: 600 }}>{activeRec.after.workload}% (Balanced)</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }}>
                <div style={{ height: '100%', width: `${activeRec.after.workload}%`, background: 'var(--status-done)', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
