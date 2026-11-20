import { createConfig } from '../../config/vite.ts';

export default createConfig(import.meta.dirname, 3, {
  name: 'filters',
  exposes: { './FiltersFeature': './src/FiltersFeature.tsx' },
});
