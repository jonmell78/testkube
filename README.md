# Task Manager

A CRUD task manager web app built with Node.js, Express, and SQLite — with a comprehensive test suite and Testkube automation.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | SQLite (better-sqlite3) |
| Validation | express-validator |
| Unit tests | Jest |
| Integration tests | Jest + Supertest |
| E2E tests | Playwright |
| Container | Docker + Docker Compose |
| CI | GitHub Actions |
| Test orchestration | Testkube |

## Getting started

### With Docker (recommended)

```bash
docker compose up --build   # http://localhost:3000
```

The SQLite database is persisted in a named Docker volume (`db-data`).

### Without Docker

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # with nodemon hot-reload
```

## Running tests

```bash
npm run test:unit         # unit tests only
npm run test:integration  # integration tests only
npm run test:e2e          # E2E tests (Playwright, starts server automatically)
npm test                  # unit + integration
npm run test:coverage     # unit + integration with coverage report
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (supports `?status=`, `?priority=`, `?search=`) |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/stats` | Get counts by status |
| GET | `/api/tasks/:id` | Get a single task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/health` | Health check |

### Task schema

```json
{
  "id": "uuid",
  "title": "string (required)",
  "description": "string",
  "status": "pending | in_progress | completed",
  "priority": "low | medium | high",
  "due_date": "ISO 8601 string | null",
  "created_at": "ISO 8601 string",
  "updated_at": "ISO 8601 string"
}
```

## Docker

```bash
# Build the image
docker build -t task-manager .

# Run with a persistent DB volume
docker run -d -p 3000:3000 -v task-db:/app/data task-manager

# Or use compose (builds automatically)
docker compose up --build -d
docker compose down
```

## Testkube

Tests are defined as Testkube `TestWorkflow` manifests in `testkube/`.

### Apply manifests and run

```bash
# Run all tests via the suite
./testkube/run-tests.sh all

# Run individual test types
./testkube/run-tests.sh unit
./testkube/run-tests.sh integration
./testkube/run-tests.sh e2e
```

### Prerequisites

- `kubectl` configured and pointing at your cluster
- Testkube installed in the `testkube` namespace — see [docs.testkube.io](https://docs.testkube.io/installing)

## Project structure

```
.
├── src/
│   ├── app.js           # Express app factory
│   ├── server.js        # HTTP server entry point
│   ├── db.js            # SQLite connection + schema
│   ├── taskService.js   # Business logic
│   └── routes/
│       └── tasks.js     # REST route handlers
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js           # Vanilla JS frontend
├── tests/
│   ├── unit/            # Jest unit tests (taskService)
│   ├── integration/     # Supertest API tests
│   └── e2e/             # Playwright browser tests
├── testkube/
│   ├── test-unit.yaml
│   ├── test-integration.yaml
│   ├── test-e2e.yaml
│   ├── testsuite.yaml
│   └── run-tests.sh
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── .github/
    └── workflows/
        └── ci.yml
```
