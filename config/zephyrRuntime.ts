import type { Plugin } from 'vite';

const runtimePluginId = '\0virtual:zephyr-mf-runtime-plugin';
const cachedResolution = 'if (!processedRemotes) processedRemotes = identifyRemotes(args, zephyrManifest);';

function fixZephyrRuntime(code: string): string {
  if (!code.includes(cachedResolution)) {
    throw new Error('Zephyr runtime resolver changed; review the late remote registration workaround.');
  }
  return code.replace(cachedResolution, 'processedRemotes = identifyRemotes(args, zephyrManifest);');
}

// vite-plugin-zephyr@1.8.0 caches the first request's registered remotes. With
// loaded-first, Vite registers remotes lazily, so later requests can use localhost
// URLs in a cloud build. Keep Zephyr's manifest cache, but resolve current remotes.
export function zephyrRuntimeRemotes(): Plugin {
  return {
    name: 'valor:zephyr-late-remotes',
    transform: {
      order: 'pre',
      handler(code, id) {
        if (id !== runtimePluginId) return null;
        return { code: fixZephyrRuntime(code), map: null };
      },
    },
  };
}
