# SprintIQ
## Branching Strategy

This project follows the **GitHub Flow** branching model.

### Main Branch

- `main` always contains stable, working code.

### Feature Branches

Each new feature is developed in a separate branch.

Example:

```
feature/jira-integration
```

### Development Workflow

1. Create a feature branch from `main`.
2. Develop the feature independently.
3. Commit changes regularly.
4. Push the feature branch to GitHub.
5. Open a Pull Request for review.
6. Merge the feature branch into `main` after approval.

# Quick Start – Local Development

## Prerequisites

- Git
- Docker Desktop
- VS Code

## Clone Repository

```bash
git clone https://github.com/yourusername/SprintIQ.git

cd SprintIQ
```

## Build Docker Images

```bash
docker compose build
```

## Start Application

```bash
docker compose up
```

## Backend

http://localhost:8000

## API Documentation

http://localhost:8000/docs

## Frontend

http://localhost:5173

## Stop Containers

```bash
Ctrl + C

docker compose down
```
# Local Development Tools

| Tool | Purpose |
|------|---------|
| VS Code | Source code editor |
| Git | Version control |
| GitHub | Remote repository |
| Docker Desktop | Containerization |
| FastAPI | Backend framework |
| React | Frontend framework |
| Vite | Frontend build tool |
| Python 3.11 | Backend language |
| Node.js | Frontend runtime |
| npm | Package manager |

