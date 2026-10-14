import React from 'react'
import {
  ChevronDown,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  User,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

export default function Topbar({
  projectName,
  onSelectProject,
  searchTerm,
  setSearchTerm,
  isSyncing,
  onTriggerSync,
  systemHealth,
  jiraHealth,
  hasCycles,
}) {
  return (
    <header className="topbar">
      {/* Left: Project Selector & Search */}
      <div className="topbar-left">
        <button className="project-selector" onClick={onSelectProject}>
          <span>{projectName}</span>
          <ChevronDown size={16} />
        </button>

        <div className="search-bar">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search tasks, assignees, or keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Quick actions, Health, Profile */}
      <div className="topbar-right">
        {hasCycles && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f43f5e',
              background: 'rgba(244, 63, 94, 0.12)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}
          >
            <AlertTriangle size={15} />
            <span>Cycle Detected</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}
          title={`Backend Storage: ${systemHealth?.storage_backend || 'memory'}`}
        >
          <Database size={14} className="text-primary" />
          <span>{systemHealth?.storage_backend === 'supabase' ? 'Supabase' : 'In-Memory'}</span>
        </div>

        <button
          className="btn btn-primary"
          onClick={onTriggerSync}
          disabled={isSyncing}
          style={{ minWidth: '130px' }}
        >
          <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Jira'}</span>
        </button>

        <button
          className="btn-icon"
          onClick={() => alert('Jira Cloud: Connected')}
          title="Jira Connection Status"
        >
          <CheckCircle2
            size={18}
            color={jiraHealth?.connected ? 'var(--status-done)' : 'var(--status-warning)'}
          />
        </button>

        <button className="btn-icon" title="Notifications">
          <Bell size={18} />
        </button>

        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="Account Profile"
        >
          <User size={17} />
        </div>
      </div>
    </header>
  )
}
