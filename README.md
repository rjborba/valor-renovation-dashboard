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

Turborepo runs the dashboard on <http://localhost:3000>, Tasks on <http://localhost:3001>, Summary on <http://localhost:3002>, and Filters on <http://localhost:3003>. Each remote also works as a standalone app. Use `npm run dev:dashboard`, `npm run dev:tasks`, `npm run dev:summary`, or `npm run dev:filters` to start a single workspace.

Each app has a `vite.config.ts` and a root `index.html`. The shared `config/vite.ts` sets up React, Tailwind, Module Federation, ports, and Zephyr for all four apps. The workspace scripts keep their existing names.

Set `VALOR_BASE_PORT` to move all four servers together, for example `VALOR_BASE_PORT=4400 npm run dev`. Ports are reserved with `strictPort`, so a busy port produces an error.

## How Module Federation works here

| Application | Responsibility | Runtime contract |
| --- | --- | --- |
| Dashboard | Owns the repository, selected filters and layout | Loads three remotes and supplies the same filtered tasks to Tasks and Summary |
| Tasks | Task board, editor and assignments | Exposes `tasks/TasksFeature`. Sends task changes to the host through typed callbacks |
| Filters | Status and assignee controls | Exposes `filters/FiltersFeature`. Sends selections to the host so the board and summary update together |
| Summary | Displayed task total, completion and status counts | Exposes `summary/SummaryFeature`. Computes its summary from the tasks supplied by the host |

Each remote is an independent Vite build. The dashboard downloads the remote manifests and JavaScript at runtime. The official `@module-federation/vite` plugin exposes and consumes the features as ES modules. React and React DOM are shared singletons. The colored outlines show the three federation imports. Add and Edit open a local dialog inside Tasks. Each feature has its own loading state, error boundary and retry action, so a single failed remote can recover while the others remain usable.

## Shared UI

The dashboard and all three remotes use Tailwind CSS and shadcn/ui components from `packages/ui`. The task list, editor, and progress panel use the same theme. Each app ships CSS for standalone use. Tailwind scans the same app and component sources for each build, keeping breakpoint rules in the same order when a remote stylesheet loads after the dashboard.

## Where tasks are saved

The first visit seeds five fictional example tasks. Changes are saved in this browser profile under `valor:renovation-tracker:tasks:v1`. An empty board stays empty after reload. The previous purchase store is left intact.

Use the same dashboard URL and browser profile to return to your tasks. Each origin has separate storage, including each standalone app. Assigning someone records who is responsible. Sharing updates across devices or between people would require a backend.

The host passes a `TaskRepository` to the shared `TaskBoard` controller. The asynchronous `list`, `add`, `update`, and `remove` methods return the current records. A backend adapter can implement that interface and be passed through the dashboard’s `repository` prop. Remote components receive ordinary data and callbacks. The injected-host browser test exercises this replacement.

## Deploy with Zephyr

Use a committed checkout with a Git origin. Run the deploy scripts in order. On the first deployment, complete Zephyr sign-in from an interactive terminal.

```sh
npm run deploy:tasks
npm run deploy:summary
npm run deploy:filters
npm run deploy:dashboard
```

`npm run deploy` runs all four in that order. Every app uses `withZephyr({ mfConfig })`, which sets up Module Federation internally. The host declares all three remotes under `zephyr:dependencies` as `workspace:*`. Deployment scripts run `vite build` with Zephyr's default cloud integration, resolving remote manifests to deployed URLs. The `dev`, `build:local`, and `preview` scripts set `ZE_DISABLED=true`, which preserves federation while skipping all Zephyr steps, network requests, and authentication. No custom Vite mode is needed. Running `vite build` directly enables deployment unless `ZE_DISABLED=true` is set in the environment. To see federation in action, open the live dashboard and look for the Tasks, Summary, and Filters manifests and entry scripts in the browser’s Network panel. [Zephyr Vite integration](https://docs.zephyr-cloud.io/bundlers/vite) · [Build without Zephyr](https://docs.zephyr-cloud.io/features/automation#build-without-zephyr) · [Remote dependencies](https://docs.zephyr-cloud.io/features/remote-dependencies)

The [previously published build list](https://github.com/rjborba/valor-renovation-dashboard/blob/52d9390/README.md#deploy-with-zephyr) documents the release that used a separate Editor remote.

The Vite migration was checked locally, including the Zephyr build configuration with `ZE_DISABLED=true`. The public app and video refer to earlier releases.

## Verify

```sh
npm run typecheck
npm test
npm run build:local
```

The browser tests cover task changes, persistence, shared filters, independent remote requests and recovery. Run `npx playwright install chromium` once, then `npm run test:e2e`. Playwright starts isolated servers on ports 4300–4303. To use an installed Google Chrome, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.

## Assignment feedback

The default cloud integration supplied a public URL for each build without a separate hosting setup. The remote URLs in the build output made it possible to verify which applications the host loaded. Two details mattered during implementation. The first login needed an interactive terminal. A version-specific dashboard URL can also consume moving remote tags, so recording the remote builds matters when reproducing a rollout. The original [release exercise](https://github.com/rjborba/valor-renovation-dashboard/blob/57361e2/README.md#independent-release-and-rollback) demonstrates switching and rolling back one remote independently.

The recovery test exposed another detail. React’s lazy loader and the federation runtime can both retain a failed load. Retry clears the affected remote registration and reloads that feature while preserving the host’s filter state.
