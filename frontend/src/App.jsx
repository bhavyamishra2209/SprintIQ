import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import DashboardView from './components/DashboardView'
import GraphView from './components/GraphView'
import ImpactAnalysisView from './components/ImpactAnalysisView'
import WhatIfView from './components/WhatIfView'
import RecommendationsView from './components/RecommendationsView'
import DecisionComparisonView from './components/DecisionComparisonView'
import JiraModal from './components/JiraModal'
import {
  DEFAULT_PROJECT_ID,
  fetchHealth,
  fetchJiraHealth,
  fetchProjectStatus,
  fetchProjectGraph,
  fetchProjectSprints,
  fetchDownstreamTasks,
  fetchUpstreamTasks,
  triggerJiraSync,
} from './api'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID)
  const [projectName, setProjectName] = useState('PROJECT ALPHA')
  const [dataVersion, setDataVersion] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  // Backend state
  const [systemHealth, setSystemHealth] = useState(null)
  const [jiraHealth, setJiraHealth] = useState(null)
  const [projectStatus, setProjectStatus] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [sprints, setSprints] = useState([])

  // Selection state
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [downstreamTasks, setDownstreamTasks] = useState([])
  const [upstreamTasks, setUpstreamTasks] = useState([])

  // UI state
  const [isSyncing, setIsSyncing] = useState(false)
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load project graph & status
  const loadProjectData = useCallback(async () => {
    try {
      const [health, jHealth, status, graph, spr] = await Promise.allSettled([
        fetchHealth(),
        fetchJiraHealth(),
        fetchProjectStatus(projectId),
        fetchProjectGraph(projectId),
        fetchProjectSprints(projectId),
      ])

      if (health.status === 'fulfilled') setSystemHealth(health.value)
      if (jHealth.status === 'fulfilled') setJiraHealth(jHealth.value)
      if (status.status === 'fulfilled') setProjectStatus(status.value)
      if (spr.status === 'fulfilled') setSprints(spr.value || [])
      if (graph.status === 'fulfilled') {
        setGraphData(graph.value)
        // Select first task by default if none selected
        if (!selectedTaskId && graph.value?.nodes?.length > 0) {
          const firstTask = graph.value.nodes[0]
          setSelectedTaskId(firstTask.id)
        }
      }
      setDataVersion((v) => v + 1)
    } catch (err) {
      console.error('Failed to load project data:', err)
      showToast('Could not reach backend API. Using local state.', 'error')
    }
  }, [projectId, selectedTaskId])

  // Initial load
  useEffect(() => {
    loadProjectData()
  }, [loadProjectData])

  // Fetch upstream/downstream when selected task changes
  useEffect(() => {
    if (!selectedTaskId) return

    let isMounted = true
    const fetchRelations = async () => {
      try {
        const [downRes, upRes] = await Promise.allSettled([
          fetchDownstreamTasks(projectId, selectedTaskId),
          fetchUpstreamTasks(projectId, selectedTaskId),
        ])

        if (!isMounted) return
        if (downRes.status === 'fulfilled') {
          setDownstreamTasks(downRes.value?.downstream || [])
        }
        if (upRes.status === 'fulfilled') {
          setUpstreamTasks(upRes.value?.upstream || [])
        }
      } catch (err) {
        console.warn('Error fetching relations:', err)
      }
    }

    fetchRelations()
    return () => {
      isMounted = false
    }
  }, [projectId, selectedTaskId])

  // Trigger Jira sync
  const handleTriggerSync = async () => {
    setIsSyncing(true)
    try {
      const summary = await triggerJiraSync(projectId)
      showToast(
        `Synced ${summary.synced_tasks} tasks, ${summary.synced_dependencies} edges successfully!`,
        'success'
      )
      await loadProjectData()
      return summary
    } catch (err) {
      showToast(`Jira Sync error: ${err.message}`, 'error')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }

  // Switch to impact analysis with target task
  const handleNavigateToImpact = (taskId) => {
    if (taskId) setSelectedTaskId(taskId)
    setActiveView('impact')
  }

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        projectStatus={projectStatus}
        jiraHealth={jiraHealth}
        onOpenJiraSync={() => setIsJiraModalOpen(true)}
        projectName={projectName}
      />

      {/* Main Area */}
      <div className="main-wrapper">
        <Topbar
          projectName={projectName}
          onSelectProject={() => {
            const newKey = prompt('Enter Project Key or Name:', projectName)
            if (newKey) setProjectName(newKey.toUpperCase())
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isSyncing={isSyncing}
          onTriggerSync={handleTriggerSync}
          systemHealth={systemHealth}
          jiraHealth={jiraHealth}
          hasCycles={graphData?.has_cycles}
        />

        {/* Viewport */}
        <main className="content-viewport">
          {activeView === 'dashboard' && (
            <DashboardView
              graphData={graphData}
              projectStatus={projectStatus}
              sprints={sprints}
              onNavigateToGraph={() => setActiveView('graph')}
              onNavigateToImpact={(taskId) => handleNavigateToImpact(taskId)}
              onSelectTask={(taskId) => {
                if (taskId) setSelectedTaskId(taskId)
                setActiveView('graph')
              }}
              projectName={projectName}
            />
          )}

          {activeView === 'graph' && (
            <GraphView
              graphData={graphData}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onRunImpact={handleNavigateToImpact}
              upstreamTasks={upstreamTasks}
              downstreamTasks={downstreamTasks}
            />
          )}

          {activeView === 'impact' && (
            <ImpactAnalysisView
              graphData={graphData}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              downstreamTaskIds={downstreamTasks}
            />
          )}

          {activeView === 'simulation' && <WhatIfView graphData={graphData} />}

          {activeView === 'recommendations' && (
            <RecommendationsView
              projectId={projectId}
              dataVersion={dataVersion}
              onRefreshData={loadProjectData}
              showToast={showToast}
            />
          )}

          {activeView === 'comparison' && (
            <DecisionComparisonView
              projectId={projectId}
              dataVersion={dataVersion}
              onRefreshData={loadProjectData}
              showToast={showToast}
              projectName={projectName}
            />
          )}
        </main>
      </div>

      {/* Jira Modal */}
      <JiraModal
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        jiraHealth={jiraHealth}
        projectStatus={projectStatus}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        projectId={projectId}
        onProjectConnected={async (name) => {
          if (name) setProjectName(name)
          await loadProjectData()
        }}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          {toast.type === 'error' ? (
            <AlertTriangle size={18} color="var(--status-critical)" />
          ) : (
            <CheckCircle2 size={18} color="var(--status-done)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
