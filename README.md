# SprintIQ – Intelligent Software Project Planning & Decision Support System

## Project Overview

SprintIQ is an intelligent software project planning and decision support system that enhances traditional project management by combining dependency analysis, digital twin modelling, impact analysis, scenario simulation, and optimization techniques.

The system imports project information from Jira and creates a virtual representation of the project to analyze task dependencies, evaluate risks, simulate different project scenarios, and recommend optimized planning decisions.

Rather than replacing existing project management tools, SprintIQ serves as an intelligent decision-support layer that enables project managers to evaluate the consequences of project changes before implementing them.

---

# Problem It Solves

Managing software projects becomes increasingly challenging as the number of tasks, developers, and dependencies grows.

A small delay in one task may affect several downstream activities, causing schedule overruns, resource conflicts, and increased project risk. Existing project management tools such as Jira primarily provide visibility into the current project status but offer limited support for predicting the consequences of future decisions.

SprintIQ addresses these challenges by enabling project managers to:

- Visualize task dependencies through an interactive dependency graph.
- Analyze the impact of requirement or task changes before implementation.
- Simulate different project scenarios such as developer absence or task delays.
- Receive optimized recommendations for task scheduling and resource allocation.
- Compare multiple project execution strategies before selecting the best plan.

---

# Target Users (Personas)

## Primary Users

### Project Manager

- Plans sprint schedules
- Allocates resources
- Monitors project progress
- Evaluates project risks
- Makes planning decisions

### Scrum Master

- Tracks sprint execution
- Identifies bottlenecks
- Monitors team workload
- Ensures smooth sprint delivery

## Secondary Users

### Team Lead

- Reviews task dependencies
- Coordinates technical execution
- Monitors developer assignments

### Development Team

- Views assigned tasks
- Understands dependency relationships
- Tracks overall project progress

---

# Vision Statement

To provide software development teams with an intelligent decision-support platform that transforms project data into actionable insights through visualization, simulation, dependency analysis, and optimization, enabling better planning, reduced project risks, and more predictable software delivery.

---

# Key Features / Goals

## 1. Jira Integration

- Import tasks, sprints, developers and dependencies directly from Jira.
- Synchronize project information for analysis.

## 2. Digital Twin & Dependency Graph

- Create a virtual representation of the software project.
- Visualize task relationships and dependency graphs.

## 3. Impact Analysis

- Analyze downstream effects of task or requirement modifications.
- Estimate schedule, effort, cost and risk changes.

## 4. What-If Simulation

Simulate project scenarios such as:

- Developer absence
- Task delays
- Resource constraints

Automatically recalculate:

- Completion dates
- Critical path
- Workload distribution

## 5. Recommendation & Optimization Engine

- Recommend optimized task assignments.
- Balance developer workload.
- Improve scheduling while minimizing project risks.

## 6. Decision Comparison Dashboard

Compare multiple project execution strategies using:

- Completion Time
- Project Cost
- Risk Score
- Team Workload

---

# Success Metrics

SprintIQ will be evaluated based on:

- Successful synchronization with Jira.
- Accurate dependency visualization.
- Correct identification of downstream impacts.
- Reliable scenario simulation.
- Practical optimization recommendations.
- Effective comparison of multiple project plans.
- Faster and better-informed project planning decisions.

---

# Assumptions

- Jira contains complete and updated project information.
- Task dependencies are correctly defined.
- Developer availability information is accurate.
- Sprint schedules are regularly maintained.
- Users have appropriate Jira permissions.
- Projects follow Agile sprint-based development.

---

# Constraints

## Technical Constraints

- Requires Jira REST API access.
- Depends on the quality of imported project data.
- Simulation accuracy depends on available project information.

## Project Constraints

- Initial implementation supports selected simulation scenarios.
- Recommendations are generated using rule-based optimization.
- SprintIQ provides decision support only and does not directly modify Jira projects.

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | React + Vite |
| Backend | Python + FastAPI |
| Graph Algorithms | NetworkX |
| Database | PostgreSQL |
| API Integration | Jira REST API |
| Containerization | Docker |
| Version Control | Git & GitHub |

---

# Project Structure

```
SprintIQ/
│
├── backend/
│   ├── app/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│
├── docker-compose.yml
├── .gitignore
├── README.md
```

---

# Branching Strategy

This project follows the **GitHub Flow** branching model.

## Main Branch

`main`

- Always contains stable and deployable code.

## Feature Branches

Every new feature is developed in its own branch.

Example:

```
feature/jira-integration
```

Development Workflow:

1. Create a feature branch from `main`.
2. Develop the feature.
3. Commit changes regularly.
4. Push the feature branch.
5. Create a Pull Request.
6. Review and merge into `main`.

---

# Quick Start – Local Development

## Prerequisites

- Git
- Docker Desktop
- VS Code
- Docker Compose

## Clone Repository

```bash
git clone https://github.com/<your-username>/SprintIQ.git

cd SprintIQ
```

## Build Docker Images

```bash
docker compose build
```

## Start the Application

```bash
docker compose up
```

## Backend

```
http://localhost:8000
```

## FastAPI Documentation

```
http://localhost:8000/docs
```

## Frontend

```
http://localhost:5173
```

## Stop Containers

```bash
docker compose down
```

---

# Local Development Tools

| Tool | Purpose |
|------|---------|
| VS Code | Code Editor |
| Git | Version Control |
| GitHub | Remote Repository |
| Docker Desktop | Containerization |
| Docker Compose | Multi-container Management |
| Python 3.11 | Backend Development |
| FastAPI | Backend Framework |
| React | Frontend Framework |
| Vite | Frontend Build Tool |
| Node.js | JavaScript Runtime |
| npm | Package Manager |
| PostgreSQL | Database |
| NetworkX | Graph Algorithms |

---

# Repository

This repository contains the complete source code, documentation, Docker configuration, architecture diagrams, and development resources for SprintIQ.

---

# License

This project is developed for academic purposes as part of the Software Engineering Digital Assignment.
