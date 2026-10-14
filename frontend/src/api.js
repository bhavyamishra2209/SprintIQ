/**
 * SprintIQ Frontend API Client
 * Connects directly to FastAPI backend via Vite proxy or direct base URL
 */

const BASE_URL = '' // Uses relative path to leverage Vite proxy

export const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`)
    if (!res.ok) throw new Error(`Health check failed (${res.status})`)
    return await res.json()
  } catch (err) {
    console.warn('Health check error:', err)
    return { status: 'offline', error: err.message }
  }
}

export async function fetchJiraHealth() {
  try {
    const res = await fetch(`${BASE_URL}/jira/health`)
    if (!res.ok) throw new Error(`Jira health check failed (${res.status})`)
    return await res.json()
  } catch (err) {
    console.warn('Jira health error:', err)
    return { connected: false, error: err.message }
  }
}

export async function fetchProjectStatus(projectId = DEFAULT_PROJECT_ID) {
  const res = await fetch(`${BASE_URL}/jira/projects/${projectId}/status`)
  if (!res.ok) {
    throw new Error(`Failed to fetch project status (${res.status})`)
  }
  return await res.json()
}

export async function triggerJiraSync(projectId = DEFAULT_PROJECT_ID) {
  const res = await fetch(`${BASE_URL}/jira/projects/${projectId}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Jira sync failed with code ${res.status}`)
  }
  return await res.json()
}

export async function fetchProjectGraph(projectId = DEFAULT_PROJECT_ID) {
  const res = await fetch(`${BASE_URL}/twin/projects/${projectId}/graph`)
  if (!res.ok) {
    throw new Error(`Failed to fetch project graph (${res.status})`)
  }
  return await res.json()
}

export async function fetchProjectSprints(projectId = DEFAULT_PROJECT_ID) {
  try {
    const res = await fetch(`${BASE_URL}/twin/projects/${projectId}/sprints`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchDownstreamTasks(projectId, taskId) {
  const res = await fetch(`${BASE_URL}/twin/projects/${projectId}/tasks/${taskId}/downstream`)
  if (!res.ok) {
    throw new Error(`Failed to fetch downstream tasks (${res.status})`)
  }
  return await res.json()
}

export async function fetchUpstreamTasks(projectId, taskId) {
  const res = await fetch(`${BASE_URL}/twin/projects/${projectId}/tasks/${taskId}/upstream`)
  if (!res.ok) {
    throw new Error(`Failed to fetch upstream tasks (${res.status})`)
  }
  return await res.json()
}

export async function testJiraConnection(credentials) {
  const res = await fetch(`${BASE_URL}/jira/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Jira connection test failed (${res.status})`)
  }
  return await res.json()
}

export async function connectJiraProject(projectId = DEFAULT_PROJECT_ID, credentials) {
  const res = await fetch(`${BASE_URL}/jira/projects/${projectId}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to connect Jira project (${res.status})`)
  }
  return await res.json()
}
