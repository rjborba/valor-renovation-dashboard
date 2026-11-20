# Renovation Tracker

Track what each person on a renovation has promised and when it is due. A task can belong to several people or trades. For example, the architect and electrician can share one task to confirm the kitchen island outlets before the stone contractor cuts the countertop.

[Open Renovation Tracker](https://t-web-latest-rodrigoj-borba-dashboard-valor-renovatio-cffc52-ze.zephyrcloud.app/)

## Using the board

Add a task with a brief description, a promised due date, and one or more responsible people. Use a name or trade that makes sense for your site. Set its status to **Open**, **In progress**, or **Done**. Edit the task when a commitment changes, or delete it when it no longer belongs on the board.

Filter by assignee and status together to prepare for a conversation with a contractor. The progress summary uses the same filtered tasks. Jointly assigned work counts once, and a task becomes overdue the day after its promised date if it is still unfinished.

## Run locally

Use Node 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Turborepo runs the dashboard on <http://localhost:3000>, Tasks on <http://localhost:3001>, and Reports on <http://localhost:3002>. Each remote also works as a standalone app. Use `npm run dev:dashboard`, `npm run dev:tasks`, or `npm run dev:reports` to start a single workspace.

## How Module Federation works here

| Application | Responsibility | Runtime contract |
| --- | --- | --- |
| Dashboard | Owns the repository, selected filters and layout | Loads both feature modules and passes the same filtered tasks to each |
| Tasks | Task board, editor, assignments and filters | Exposes `tasks/TasksFeature`. Sends edits and filter changes to the host through typed callbacks |
| Reports | Progress and outstanding commitments | Exposes `reports/ReportsFeature`. Computes its summary from the tasks supplied by the host |

Each remote is an independent Rspack build. The dashboard downloads the remote manifests and JavaScript at runtime. React and React DOM are shared singletons. The colored outlines show the exact federation imports. Each feature has its own loading state, error boundary and retry action, so a single failed remote can recover while the other remains usable.

## Where tasks are saved

The first visit seeds five fictional example tasks. Changes are saved in this browser profile under `valor:renovation-tracker:tasks:v1`. An empty board stays empty after reload. The previous purchase store is left intact.

Use the same dashboard URL and browser profile to return to your tasks. Each origin has separate storage, including each standalone app. Assigning someone records who is responsible. Sharing updates across devices or between people would require a backend.

The host passes a `TaskRepository` to the shared `TaskBoard` controller. The asynchronous `list`, `add`, `update`, and `remove` methods return the current records. A backend adapter can implement that interface and be passed through the dashboard’s `repository` prop. Both remote components receive ordinary data and callbacks. The injected-host browser test exercises this replacement.

## Deploy with Zephyr

Use a committed checkout with a Git origin. Run the deploy scripts in order. On the first deployment, complete Zephyr sign-in from an interactive terminal.

```sh
npm run deploy:tasks
npm run deploy:reports
npm run deploy:dashboard
```

`npm run deploy` runs all three in that order. The deploy path runs Rspack with the Zephyr plugin and its default cloud integration. The host declares both remotes under `zephyr:dependencies` as `workspace:*`. During the host build, Zephyr resolves the remote manifests to deployed URLs. To see federation in action, open the live dashboard and look for the Tasks and Reports manifests and entry scripts in the browser’s Network panel. [Zephyr Rspack integration](https://docs.zephyr-cloud.io/bundlers/rspack) · [Remote dependencies](https://docs.zephyr-cloud.io/features/remote-dependencies)

## Verify

```sh
npm run typecheck
npm test
npm run build:local
```

The browser tests cover task changes, persistence, shared filters, independent remote requests and recovery. Run `npx playwright install chromium` once, then `npm run test:e2e`. Playwright starts isolated servers on ports 4300–4302. To use an installed Google Chrome, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.

## Assignment feedback

The default cloud integration supplied a public URL for each build without a separate hosting setup. The remote URLs in the build output made it possible to verify which applications the host loaded. Two details mattered during implementation. The first login needed an interactive terminal. A version-specific dashboard URL can also consume moving remote tags, so recording the remote builds matters when reproducing a rollout. The original [release exercise](https://github.com/rjborba/valor-renovation-dashboard/blob/57361e2/README.md#independent-release-and-rollback) demonstrates switching and rolling back one remote independently.

The recovery test exposed another detail. React’s lazy loader and the federation runtime can both retain a failed load. Retry clears the affected remote registration and reloads that feature while preserving the host’s filter state.
