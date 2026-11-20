# Renovation Tracker

Review renovation purchases and track spending by room or supplier. Use **Add purchase** to record an expense. Expand a receipt to edit or delete it. Filtering by room or supplier updates the spending summary. Amounts are in Brazilian reais (BRL). No account or backend is required to use the dashboard.

[Open the renovation tracker](https://t-web-latest-rodrigoj-borba-dashboard-valor-renovatio-cffc52-ze.zephyrcloud.app/) · [Watch the captioned demo (MP4)](https://github.com/rjborba/valor-renovation-dashboard/releases/download/purchase-ledger-demo/renovation-tracker-demo.mp4)

## Run locally

Use Node 22.12 or later and npm. From the repository root:

```sh
npm ci
npm run dev
```

Turborepo starts the dashboard on <http://localhost:3000>, Expenses on port 3001, and Reports on port 3002. To start one app, use `npm run dev:dashboard`, `npm run dev:expenses`, or `npm run dev:reports`.

Run `npm run typecheck` and `npm test` to check the workspace. Use `npm run build:local` for production bundles. Turbo caches each app’s `dist/` and restores it when the app and its build inputs are unchanged.

## How the applications fit together

| Application | Owns | Runtime contract |
| --- | --- | --- |
| Dashboard | Page layout, purchase repository, selected room and supplier, loading and recovery | Loads both remotes and passes the filtered purchases to each |
| Expenses | Filter controls, purchase editor, ledger and receipt details | Exposes `expenses/ExpensesFeature` and requests changes through host callbacks |
| Reports | Paid total, purchase count, spending by room | Exposes `reports/ReportsFeature` and derives every metric from its purchases prop |

The two remote features are independent Rspack builds. The browser retrieves their manifests and JavaScript at runtime. React and React DOM are shared singletons. The shell owns the filter state, so changes reach both features without a cross-application event bus. Each remote has its own Suspense and error boundary.

The shared TypeScript contract lives in `packages/contracts`. Fixtures use integer cents. Aggregation sums the amount actually paid on each receipt, which already includes its discount.

## Purchase storage

The first visit seeds eight sample receipts in browser localStorage. Adding, editing, and deleting a purchase updates Reports after the write succeeds. An empty ledger stays empty after refresh. The amount paid is the receipt total after discounts. Optional line items and the discount field describe that payment.

Open the same dashboard URL in the same browser profile to return to your ledger. Each origin has its own storage, including each standalone app and each version-specific Zephyr URL. Clearing site data removes that origin’s ledger.

The host injects a `PurchaseRepository` into `PurchaseLedger`. Its four asynchronous methods (`list`, `add`, `update`, and `remove`) return the current purchase list. To use a database, implement that contract with calls to your backend and pass the adapter through the dashboard’s `repository` prop. Expenses and Reports only receive data and callbacks. The browser integration test in `tests/injected-host.spec.ts` exercises that substitution.

## Deploy with Zephyr

Start from a committed checkout with a Git origin. Run the following commands in order and complete the browser sign-in on your first deployment.

```sh
npm run deploy:expenses
npm run deploy:reports
npm run deploy:dashboard
```

The deploy scripts call Rspack directly with the Zephyr plugin so each invocation publishes a build. Zephyr uses its default cloud integration. The dashboard declares both remote names under `zephyr:dependencies` with `workspace:*`. Zephyr resolves those names at build time using the Git and deployment context. Open the dashboard URL from the build and inspect the network requests for both remotes.

[Zephyr Rspack guide](https://docs.zephyr-cloud.io/bundlers/rspack) · [Remote dependency resolution](https://docs.zephyr-cloud.io/features/remote-dependencies)

## Browser checks

With `npm run dev` running, open a second terminal:

```sh
npx playwright install chromium
npx playwright test
```

To use an installed Google Chrome instead, run `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npx playwright test`. The tests cover the remote network origins, responsive layout, filtering across features, receipt details, an empty intersection, and recovery after an individual remote fails. The unit tests check arithmetic in cents and the intersection of the filters.

## Independent release and rollback

The stable dashboard URL currently serves [Dashboard build 13](https://rodrigoj-borba-13-dashboard-valor-renovation-dash-6a0252499-ze.zephyrcloud.app/), with [Expenses build 11](https://rodrigoj-borba-11-expenses-valor-renovation-dashb-4c84ad530-ze.zephyrcloud.app/) and [Reports build 12](https://rodrigoj-borba-12-reports-valor-renovation-dashbo-b6b9ca45d-ze.zephyrcloud.app/). The table below records the earlier release exercise on Dashboard build 5, where we switched Reports from v1 to v2 and back to v1.

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

A filter change makes the federation boundary visible. Expenses raises the change to the host. The host passes both features the same filtered records, and Reports recalculates from those records. Passing a small typed contract lets each team release a complete feature independently. Refreshing resets the filters and reloads the saved ledger.

The default Zephyr integration made the first release quick once the repository had a Git origin. The build output included the resolved remote URLs, which helped verify the public host. Two parts took extra investigation:

- The first sign-in required an interactive terminal. A non-interactive attempt stopped before the browser login could begin.
- A versioned dashboard URL can still load a moving remote tag. Showing the selector and the currently served build side by side in the deployment output would make independent rollouts and rollbacks easier to explain.

The recovery test also caught an integration detail. React's lazy loader and the federation runtime can both retain a failed load. Retry clears the affected remote registration and loads it again, preserving the other feature and the host's filter state.
