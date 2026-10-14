import React, { useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Server,
  Database,
  Layers,
  Key,
  Globe,
  Mail,
  FolderGit2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { testJiraConnection, connectJiraProject } from '../api'

export default function JiraModal({
  isOpen,
  onClose,
  jiraHealth,
  projectStatus,
  isSyncing,
  onTriggerSync,
  projectId,
  onProjectConnected,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState('connect') // 'connect' or 'status'

  // Form states for dynamic connection
  const [baseUrl, setBaseUrl] = useState('https://anshika77.atlassian.net')
  const [email, setEmail] = useState('anshikaagrawal137@gmail.com')
  const [apiToken, setApiToken] = useState('')
  const [projectKey, setProjectKey] = useState('SCRUM')
  const [boardId, setBoardId] = useState('1')
  const [projectName, setProjectName] = useState('SCRUM SPRINT')
  const [showToken, setShowToken] = useState(false)

  // Status and feedback
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  if (!isOpen) return null

  // Test credentials against Jira Cloud API
  const handleTestConnection = async () => {
    setErrorMessage(null)
    setTestResult(null)

    if (!baseUrl || !email || !apiToken) {
      setErrorMessage('Please provide Jira Base URL, Email, and API Token.')
      return
    }

    setIsTesting(true)
    try {
      const res = await testJiraConnection({
        jira_base_url: baseUrl.trim(),
        jira_email: email.trim(),
        jira_api_token: apiToken.trim(),
      })
      setTestResult(res)
    } catch (err) {
      setErrorMessage(err.message || 'Connection test failed.')
    } finally {
      setIsTesting(false)
    }
  }

  // Connect and import real Jira project
  const handleConnectAndImport = async () => {
    setErrorMessage(null)
    setSyncResult(null)

    if (!baseUrl || !email || !apiToken || !projectKey) {
      setErrorMessage('Please fill in Jira Domain, Email, API Token, and Project Key.')
      return
    }

    setIsConnecting(true)
    try {
      const payload = {
        jira_base_url: baseUrl.trim(),
        jira_email: email.trim(),
        jira_api_token: apiToken.trim(),
        jira_project_key: projectKey.trim().toUpperCase(),
        jira_board_id: boardId ? parseInt(boardId, 10) : null,
        project_name: projectName ? projectName.trim() : projectKey.trim().toUpperCase(),
      }

      const summary = await connectJiraProject(projectId, payload)
      setSyncResult(summary)

      if (onProjectConnected) {
        await onProjectConnected(payload.project_name)
      }
      if (showToast) {
        showToast(
          `Connected to Jira project ${payload.jira_project_key}! Synced ${summary.synced_tasks} tasks.`,
          'success'
        )
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to connect and synchronize Jira project.')
    } finally {
      setIsConnecting(false)
    }
  }

  // Quick sync for existing project
  const handleQuickSync = async () => {
    setErrorMessage(null)
    setSyncResult(null)
    try {
      const res = await onTriggerSync()
      setSyncResult(res)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '600px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div className="card-title">
            <RefreshCw size={18} className="text-primary" />
            <span>Jira Cloud Integration</span>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '16px' }}>
          <button
            className={`btn ${activeTab === 'connect' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('connect')}
          >
            <Sparkles size={14} />
            <span>Connect New Jira Project</span>
          </button>
          <button
            className={`btn ${activeTab === 'status' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('status')}
          >
            <Server size={14} />
            <span>Current Status & Sync</span>
          </button>
        </div>

        {/* Tab 1: Connect New Project via Form API */}
        {activeTab === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Enter your live Jira Cloud credentials to import your board sprints, tasks, developers, and dependency links directly into the Digital Twin.
            </p>

            {/* Jira Base URL */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Jira Cloud Workspace URL *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                <Globe size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="https://your-domain.atlassian.net"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '0.86rem' }}
                />
              </div>
            </div>

            {/* Jira Email & Token Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Atlassian Account Email *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  <Mail size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Jira API Token *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                  <Key size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Paste Atlassian API Token"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '0.86rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Project Key, Board ID, Project Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Project Key *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SCRUM"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.86rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Agile Board ID
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.86rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Project Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint Alpha"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.86rem' }}
                />
              </div>
            </div>

            {/* Test Connection Result / Feedback */}
            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-done-bg)',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.82rem',
                  color: 'var(--status-done)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  Connected to Jira as <strong>{testResult.display_name}</strong> ({testResult.email})
                </span>
              </div>
            )}

            {syncResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-done-bg)',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.82rem',
                  color: 'var(--status-done)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  Successfully imported <strong>{syncResult.synced_tasks} tasks</strong>,{' '}
                  <strong>{syncResult.synced_dependencies} dependency edges</strong>, and{' '}
                  <strong>{syncResult.synced_sprints} sprints</strong>!
                </span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--status-blocked-bg)',
                  border: '1px solid #fecaca',
                  fontSize: '0.82rem',
                  color: 'var(--status-blocked)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={isTesting || isConnecting}
                style={{ minWidth: '140px' }}
              >
                <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleConnectAndImport}
                disabled={isConnecting || isTesting}
              >
                <FolderGit2 size={15} className={isConnecting ? 'animate-spin' : ''} />
                <span>{isConnecting ? 'Importing Jira Project...' : 'Connect & Import Project'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Current Status & Manual Sync */}
        {activeTab === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status Badge */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: jiraHealth?.connected ? 'var(--status-done-bg)' : '#fffbeb',
                border: `1px solid ${jiraHealth?.connected ? '#bbf7d0' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2
                size={20}
                color={jiraHealth?.connected ? 'var(--status-done)' : 'var(--status-warning)'}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  {jiraHealth?.mock
                    ? 'Mock Fixture Mode Active'
                    : jiraHealth?.connected
                    ? 'Connected to Live Jira Cloud'
                    : 'Jira Offline / Disconnected'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {jiraHealth?.mock
                    ? 'Operating with local fixtures (8 tasks, 2 sprints, 3 devs, 8 dependencies).'
                    : 'Active real-time link to Jira board.'}
                </div>
              </div>
            </div>

            {/* Current Project Counts */}
            {projectStatus && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{projectStatus.task_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasks</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{projectStatus.sprint_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sprints</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{projectStatus.developer_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Developers</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{projectStatus.dependency_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Edges</div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Last Synced:{' '}
              <strong>
                {projectStatus?.last_synced_at
                  ? new Date(projectStatus.last_synced_at).toLocaleString()
                  : 'Never or Startup'}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleQuickSync}
                disabled={isSyncing}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizing...' : 'Run Sync on Active Project'}</span>
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
