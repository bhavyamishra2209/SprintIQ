import React from 'react'
import {
  LayoutDashboard,
  GitFork,
  Target,
  FlaskConical,
  Sparkles,
  BarChart3,
  RefreshCw,
  Layers,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  FolderGit2,
} from 'lucide-react'

export default function Sidebar({
  activeView,
  setActiveView,
  projectStatus,
  jiraHealth,
  onOpenJiraSync,
  projectName = 'PROJECT ALPHA',
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'graph', label: 'Graph View', icon: GitFork, badge: 'Twin' },
    { id: 'impact', label: 'Impact Analysis', icon: Target },
    { id: 'simulation', label: 'What-if Simulation', icon: FlaskConical },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'comparison', label: 'Decision Comparison', icon: BarChart3 },
  ]

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="logo-icon">
          <Layers size={22} />
        </div>
        <div className="logo-text">
          Sprint<span>IQ</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        {/* Main Navigation */}
        <div>
          <div className="nav-group-title">PROJECT</div>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveView(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Integrations */}
        <div>
          <div className="nav-group-title">INTEGRATIONS</div>
          <ul className="nav-list">
            <li>
              <button
                className={`nav-item-btn ${activeView === 'jira' ? 'active' : ''}`}
                onClick={onOpenJiraSync}
              >
                <RefreshCw size={18} className={jiraHealth?.connected ? '' : 'text-muted'} />
                <span>JIRA Integration</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Accounts / Settings */}
        <div style={{ marginTop: 'auto' }}>
          <div className="nav-group-title">ACCOUNTS</div>
          <ul className="nav-list">
            <li>
              <button className="nav-item-btn" onClick={() => alert('SprintIQ notifications are active')}>
                <Bell size={18} />
                <span>Notifications</span>
              </button>
            </li>
            <li>
              <button className="nav-item-btn" onClick={onOpenJiraSync}>
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </li>
            <li>
              <button
                className="nav-item-btn"
                onClick={() => window.open('https://github.com/bhavyamishra2209/SprintIQ', '_blank')}
              >
                <HelpCircle size={18} />
                <span>Documentation</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Project Card */}
      <div className="sidebar-footer">
        <div className="project-card-mini">
          <div className="project-card-mini-top">
            <div className="project-pill">
              <FolderGit2 size={14} className="text-primary" />
              <span>{projectName}</span>
            </div>
            <div
              className={`status-dot ${jiraHealth?.connected ? '' : 'warning'}`}
              title={jiraHealth?.connected ? 'Jira Connected' : 'Jira Disconnected'}
            />
          </div>
          <div className="project-card-meta">
            <span>
              {projectStatus?.is_live_connected ? 'Jira Cloud Active' : jiraHealth?.mock ? 'Mock Jira Mode' : jiraHealth?.connected ? 'Jira Cloud Active' : 'Disconnected'}
            </span>
            <span>
              {projectStatus ? `${projectStatus.task_count} tasks imported` : 'Loading project...'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
