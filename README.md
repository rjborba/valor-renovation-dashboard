# Field Ledger

Field Ledger tracks spending on a fictional apartment renovation in Recife. Select a room or supplier, expand a receipt, and watch the spending breakdown update. All amounts are Brazilian reais. No account or backend is required to use the dashboard.

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
