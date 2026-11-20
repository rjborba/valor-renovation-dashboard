import { createConfig } from '../../config/vite.ts';

export default createConfig(import.meta.dirname, 1, {
  name: 'tasks',
  exposes: { './TasksFeature': './src/TasksFeature.tsx' },
});
