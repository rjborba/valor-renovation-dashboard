import { createConfig } from '../../config/vite.ts';

export default createConfig(import.meta.dirname, 2, {
  name: 'reports',
  exposes: { './ReportsFeature': './src/ReportsFeature.tsx' },
});
