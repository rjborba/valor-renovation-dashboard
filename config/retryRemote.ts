import { getInstance } from '@module-federation/runtime';

export async function retryRemote<T>(hostName: string, moduleId: string): Promise<T> {
  const host = getInstance(instance => instance.name === hostName);
  const [remoteName] = moduleId.split('/');
  const remote = host?.options.remotes.find(item => item.name === remoteName || item.alias === remoteName);
  if (!host || !remote) throw new Error(`Unknown remote for ${hostName}: ${remoteName}`);

  // Reset this remote's cached manifest and container before bypassing the failed build import.
  host.registerRemotes([{ ...remote }], { force: true });
  const module = await host.loadRemote<T>(moduleId);
  if (!module) throw new Error(`Remote did not provide ${moduleId}`);
  return module;
}
