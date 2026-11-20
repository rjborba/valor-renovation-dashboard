# Renovation Tracker

Track what each person on a renovation has promised and when it is due. A task can belong to several people or trades. For example, the architect and electrician can share one task to confirm the kitchen island outlets before the stone contractor cuts the countertop.

[Open Renovation Tracker](https://t-web-latest-rodrigoj-borba-dashboard-valor-renovatio-cffc52-ze.zephyrcloud.app/) · [Watch the earlier two-remote demo (MP4)](https://github.com/rjborba/valor-renovation-dashboard/releases/download/shadcn-task-tracker/renovation-tracker-demo.mp4)

## Using the board

Add a task with a brief description, a promised due date, and one or more responsible people. Use a name or trade that makes sense for your site. Click the status symbol in a task row and choose **Open**, **In progress**, or **Done**. The change saves immediately. Click a task row to edit its details when a commitment changes, or delete it when it no longer belongs on the board.

Filter by assignee and status together to prepare for a conversation with a contractor. The summary shows how many tasks are displayed, how many are complete, and how many have each status. Jointly assigned tasks count once.

## Run locally

Use Node 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Turborepo runs the dashboard on <http://localhost:3000>, Tasks on <http://localhost:3001>, Reports on <http://localhost:3002>, Filters on <http://localhost:3003>, and Editor on <http://localhost:3004>. Each remote also works as a standalone app. Use `npm run dev:dashboard`, `npm run dev:tasks`, `npm run dev:reports`, `npm run dev:filters`, or `npm run dev:editor` to start a single workspace.

## How Module Federation works here

| Application | Responsibility | Runtime contract |
| --- | --- | --- |
| Dashboard | Owns the repository, selected filters and layout | Loads three remotes and supplies the same filtered tasks to Tasks and Reports |
| Tasks | Task list, inline status and deletion | Exposes `tasks/TasksFeature`. Loads the editor on demand and passes the host’s save callback to it |
| Editor | Add and edit modal | Exposes `editor/TaskEditor`. Receives the current task for edits and calls the supplied save callback |
| Filters | Status and assignee controls | Exposes `filters/FiltersFeature`. Sends selections to the host so the board and summary update together |
| Reports | Displayed task total, completion and status counts | Exposes `reports/ReportsFeature`. Computes its summary from the tasks supplied by the host |

Each remote is an independent Rspack build. The dashboard downloads the remote manifests and JavaScript at runtime. React and React DOM are shared singletons. The colored outlines show the exact federation imports. Each remote has its own loading state and retry action, so a single failed remote can recover while the others remain usable.

## Shared UI

The dashboard and all four remotes use Tailwind CSS and shadcn/ui components from `packages/ui`. The task list, editor, and progress panel use the same theme. Each app ships CSS for standalone use. Tailwind scans the same app and component sources for each build, keeping breakpoint rules in the same order when a remote stylesheet loads after the dashboard.

## Where tasks are saved

The first visit seeds five fictional example tasks. Changes are saved in this browser profile under `valor:renovation-tracker:tasks:v1`. An empty board stays empty after reload. The previous purchase store is left intact.

Use the same dashboard URL and browser profile to return to your tasks. Each origin has separate storage, including each standalone app. Assigning someone records who is responsible. Sharing updates across devices or between people would require a backend.

The host passes a `TaskRepository` to the shared `TaskBoard` controller. The asynchronous `list`, `add`, `update`, and `remove` methods return the current records. A backend adapter can implement that interface and be passed through the dashboard’s `repository` prop. Remote components receive ordinary data and callbacks. The injected-host browser test exercises this replacement.

## Deploy with Zephyr

Use a committed checkout with a Git origin. Run the deploy scripts in order. On the first deployment, complete Zephyr sign-in from an interactive terminal.

```sh
npm run deploy:editor
npm run deploy:tasks
npm run deploy:reports
npm run deploy:filters
npm run deploy:dashboard
```

`npm run deploy` runs all five in that order. The deploy path runs Rspack with the Zephyr plugin and its default cloud integration. Tasks declares Editor and the dashboard declares its three direct remotes under `zephyr:dependencies` as `workspace:*`. During the host build, Zephyr resolves the remote manifests to deployed URLs. To see federation in action, open the live dashboard and look for the Tasks, Reports, and Filters manifests and entry scripts in the browser’s Network panel. Open Add task to see the Editor remote load from its own origin. [Zephyr Rspack integration](https://docs.zephyr-cloud.io/bundlers/rspack) · [Remote dependencies](https://docs.zephyr-cloud.io/features/remote-dependencies)

The current deployment uses [Dashboard build 45](https://rodrigoj-borba-45-dashboard-valor-renovation-dash-1788a2e83-ze.zephyrcloud.app/), [Tasks build 44](https://rodrigoj-borba-44-tasks-valor-renovation-dashboar-0d3efd472-ze.zephyrcloud.app/), [Editor build 46](https://rodrigoj-borba-46-editor-valor-renovation-dashboa-a00ea102d-ze.zephyrcloud.app/), [Reports build 42](https://rodrigoj-borba-42-reports-valor-renovation-dashbo-7936f6307-ze.zephyrcloud.app/), and [Filters build 40](https://rodrigoj-borba-40-filters-valor-renovation-dashbo-d3f9bfdfd-ze.zephyrcloud.app/). The captioned demo shows the earlier two-remote layout.

## Verify

```sh
npm run typecheck
npm test
npm run build:local
```

The browser tests cover task changes, persistence, shared filters, independent remote requests and recovery. Run `npx playwright install chromium` once, then `npm run test:e2e`. Playwright starts isolated servers on ports 4300–4304. To use an installed Google Chrome, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.

## Assignment feedback

The default cloud integration supplied a public URL for each build without a separate hosting setup. The remote URLs in the build output made it possible to verify which applications the host loaded. Two details mattered during implementation. The first login needed an interactive terminal. A version-specific dashboard URL can also consume moving remote tags, so recording the remote builds matters when reproducing a rollout. The original [release exercise](https://github.com/rjborba/valor-renovation-dashboard/blob/57361e2/README.md#independent-release-and-rollback) demonstrates switching and rolling back one remote independently.

The recovery test exposed another detail. React’s lazy loader and the federation runtime can both retain a failed load. Retry clears the affected remote registration and reloads that feature while preserving the host’s filter state.
