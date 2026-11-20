# Renovation Tracker

Review renovation purchases and track spending by room or supplier. Explore the sample receipts, open a purchase to see its line items, or filter the ledger to update the spending summary. The sample data uses Brazilian reais (BRL). No account or backend is required to use the dashboard.

[Open the renovation tracker](https://rodrigoj-borba-7-dashboard-valor-renovation-dashb-9263ba39e-ze.zephyrcloud.app/) · [Watch the captioned demo (MP4)](https://github.com/rjborba/valor-renovation-dashboard/releases/download/renovation-tracker-demo/renovation-tracker-demo.mp4)

## Run locally

Use Node 22.12 or later and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. Expenses and Reports also run independently on ports 3001 and 3002. To validate the checkout, run `npm run typecheck`, `npm test`, and `npm run build:local`.

## How the applications fit together

| Application | Owns | Runtime contract |
| --- | --- | --- |
| Dashboard | Page layout, fixture data, selected room and supplier, loading and recovery | Loads both remotes and passes the filtered purchases to each |
| Expenses | Filter controls, purchase ledger, receipt details | Exposes `expenses/ExpensesFeature` and requests filter changes through a callback |
| Reports | Paid total, purchase count, spending by room | Exposes `reports/ReportsFeature` and derives every metric from its purchases prop |

The two remote features are independent Rspack builds. The browser retrieves their manifests and JavaScript at runtime. React and React DOM are shared singletons. The shell owns the filter state, so changes reach both features without a cross-application event bus. Each remote has its own Suspense and error boundary.

The shared TypeScript contract lives in `packages/contracts`. Fixtures use integer cents. Aggregation sums the amount actually paid on each receipt, which already includes its discount.

## Deploy with Zephyr

Start from a committed checkout with a Git origin. Run the following commands in order and complete the browser sign-in on your first deployment.

```sh
npm run deploy:expenses
npm run deploy:reports
npm run deploy:dashboard
```

The deploy scripts enable the Zephyr Rspack plugin. Zephyr uses its default cloud integration. The dashboard declares both remote names under `zephyr:dependencies` with `workspace:*`. Zephyr resolves those names at build time using the Git and deployment context. Open the dashboard URL from the build and inspect the network requests for both remotes.

[Zephyr Rspack guide](https://docs.zephyr-cloud.io/bundlers/rspack) · [Remote dependency resolution](https://docs.zephyr-cloud.io/features/remote-dependencies)

## Browser checks

With `npm run dev` running, open a second terminal:

```sh
npx playwright install chromium
npx playwright test
```

To use an installed Google Chrome instead, run `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npx playwright test`. The tests cover the remote network origins, responsive layout, filtering across features, receipt details, an empty intersection, and recovery after an individual remote fails. The unit tests check arithmetic in cents and the intersection of the filters.

## Independent release and rollback

The current tracker runs Dashboard build 7 with Expenses build 3 and Reports v2 build 6. The table below records the earlier release exercise on Dashboard build 5, where we switched Reports from v1 to v2 and back to v1.

| Component | Verified Zephyr deployment | Source |
| --- | --- | --- |
| Dashboard | [Build 5](https://rodrigoj-borba-5-dashboard-valor-renovation-dashb-ea051498e-ze.zephyrcloud.app/) | [2fdd0e1](https://github.com/rjborba/valor-renovation-dashboard/commit/2fdd0e1) |
| Expenses | [Build 3](https://rodrigoj-borba-3-expenses-valor-renovation-dashbo-52fd55d98-ze.zephyrcloud.app/) | [2fdd0e1](https://github.com/rjborba/valor-renovation-dashboard/commit/2fdd0e1) |
| Reports v1 | [Build 4](https://rodrigoj-borba-4-reports-valor-renovation-dashboa-8ab2e77a2-ze.zephyrcloud.app/) | [2fdd0e1](https://github.com/rjborba/valor-renovation-dashboard/commit/2fdd0e1) |
| Reports v2 | [Build 6](https://rodrigoj-borba-6-reports-valor-renovation-dashboa-0ee72f2cb-ze.zephyrcloud.app/) | [76831c4](https://github.com/rjborba/valor-renovation-dashboard/commit/76831c4) |

1. The initial deployment uploaded Expenses, Reports and then Dashboard. Zephyr printed a separate managed-cloud URL for each app. In the host build output, both workspace dependencies resolved to tag URLs.
2. Published the average-purchase row with `npm run deploy:reports`. The existing Dashboard build picked up Reports 1.1.0 build 6 through its Reports tag. A fresh browser session showed the new row.
3. In the Zephyr dashboard, opened **Reports → DevOps → Tags → web_latest_rodrigoj_borba**. Added an **AND** condition with **Version is 1.0.0-main.rodrigoj_borba.4** and saved. This pins the Reports tag used by the host to the original build. Remove that specific condition to resume following the latest matching build.
4. A fresh browser session on the same dashboard URL showed v1 again. The Reports JavaScript hash went from `2043318afe9b2d63` to `37dbf676aa64cfed` and back. The Expenses hash stayed `3422915700d4fcd6`. Filtering to **Kitchen + Clay Studio** returned one receipt for **R$ 1.166,40** before, during, and after the release.

## Implementation and assignment feedback

A filter change makes the federation boundary visible. Expenses raises the change to the host. The host passes both features the same filtered records, and Reports recalculates from those records. Passing a small typed contract lets each team release a complete feature independently. The data is fictional and in memory, so refreshing resets the filters.

The default Zephyr integration made the first release quick once the repository had a Git origin. The build output included the resolved remote URLs, which helped verify the public host. Two parts took extra investigation:

- The first sign-in required an interactive terminal. A non-interactive attempt stopped before the browser login could begin.
- A versioned dashboard URL can still load a moving remote tag. Showing the selector and the currently served build side by side in the deployment output would make independent rollouts and rollbacks easier to explain.

The recovery test also caught an integration detail. React's lazy loader and the federation runtime can both retain a failed load. Retry clears the affected remote registration and loads it again, preserving the other feature and the host's filter state.
