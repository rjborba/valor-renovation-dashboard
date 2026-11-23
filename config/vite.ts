import { defineConfig, type ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import type { ModuleFederationOptions } from '@module-federation/vite';
import { withZephyr } from 'vite-plugin-zephyr';
import { zephyrRuntimeRemotes } from './zephyrRuntime';

export const dashboardPort = Number(process.env.VALOR_BASE_PORT ?? 3000);

export function createConfig(
  root: string,
  portOffset: number,
  options: {
    name: string;
    exposes?: Record<string, string>;
    remotes?: Record<string, { type: 'module'; name: string; entry: string }>;
  },
) {
  return defineConfig(({ mode }: ConfigEnv) => {
    const port = dashboardPort + portOffset;
    const mfConfig = {
      filename: 'remoteEntry.js',
      manifest: true,
      dts: false,
      shareStrategy: 'loaded-first',
      shared: {
        react: { singleton: true, requiredVersion: '19.3.1' },
        'react-dom': { singleton: true, requiredVersion: '19.3.1' },
      },
      ...options,
    } satisfies ModuleFederationOptions;

    return {
      root,
      cacheDir: `node_modules/.vite/${mode}-${port}`,
      plugins: [react(), zephyrRuntimeRemotes(), ...withZephyr({ mfConfig })],
      css: { postcss: { plugins: [tailwind()] } },
      server: {
        port,
        strictPort: true,
        origin: `http://localhost:${port}`,
        cors: true,
      },
      preview: { port, strictPort: true, cors: true },
      build: { target: 'es2022' },
    };
  });
}
