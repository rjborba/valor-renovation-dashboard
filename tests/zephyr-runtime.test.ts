import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { build } from 'vite';
import { zephyrRuntimeRemotes } from '../config/zephyrRuntime';

const require = createRequire(import.meta.url);
const runtimePath = path.join(
  path.dirname(require.resolve('vite-plugin-zephyr')),
  'lib/internal/mf-vite-etl/runtime_plugin.mjs',
);
const source = await readFile(runtimePath, 'utf8');
// Exercise the actual Vite transform against the pinned upstream runtime,
// without invoking Zephyr authentication or publishing a build.
const built = await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [zephyrRuntimeRemotes(), {
    name: 'zephyr-runtime-fixture',
    resolveId(id) {
      if (id === 'virtual:zephyr-mf-runtime-plugin') return `\0${id}`;
    },
    load(id) {
      if (id === runtimePath) return 'export { default } from "virtual:zephyr-mf-runtime-plugin";';
      if (id === '\0virtual:zephyr-mf-runtime-plugin') return source;
    },
  }],
  build: {
    write: false,
    minify: false,
    lib: { entry: runtimePath, formats: ['es'] },
  },
});
const result = Array.isArray(built) ? built[0] : built;
assert.ok('output' in result);
const chunk = result.output.find(item => item.type === 'chunk' && item.isEntry)!;
assert.equal(chunk.type, 'chunk');
const { default: createResolver } = await import(
  `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
);

function remote(alias: string, port: number) {
  return {
    name: `__mfe_internal__dashboard__mf_owner__test__${alias}`,
    alias,
    entry: `http://localhost:${port}/mf-manifest.json`,
  };
}

test('Zephyr resolves remotes registered after the first request and reuses its manifest', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({
    dependencies: {
      summary: { remote_entry_url: 'https://summary.example/mf-manifest.json' },
      tasks: { remote_entry_url: 'https://tasks.example/mf-manifest.json' },
      filters: { remote_entry_url: 'https://filters.example/mf-manifest.json' },
    },
  }));
  const resolver = createResolver({ manifestUrl: 'https://dashboard.example/late-remotes.json' });
  const options = { remotes: [remote('summary', 3002)] };

  for (const [alias, port] of [['summary', 3002], ['tasks', 3001], ['filters', 3003]] as const) {
    if (alias !== 'summary') options.remotes.push(remote(alias, port));
    const current = options.remotes.find(item => item.alias === alias)!;
    const args = { id: `${current.name}/${alias}Feature`, options };
    assert.equal(await resolver.beforeRequest(args), args);
    assert.equal(current.entry, `https://${alias}.example/mf-manifest.json`);
  }
  assert.equal(fetch.mock.callCount(), 1);

  // Manual retry re-registers a remote. It must also receive the deployed URL.
  options.remotes = [remote('tasks', 3001)];
  await resolver.beforeRequest({ id: 'tasks/TasksFeature', options });
  assert.equal(options.remotes[0].entry, 'https://tasks.example/mf-manifest.json');
});

test('Zephyr leaves remotes without a deployed dependency available for local use', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ dependencies: {} }));
  const resolver = createResolver({ manifestUrl: 'https://dashboard.example/local-remotes.json' });
  const options = { remotes: [remote('tasks', 3001)] };
  await resolver.beforeRequest({ id: 'tasks/TasksFeature', options });
  assert.equal(options.remotes[0].entry, 'http://localhost:3001/mf-manifest.json');
});
