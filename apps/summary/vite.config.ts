import { createConfig } from '../../config/vite.ts';

export default createConfig(import.meta.dirname, 2, {
  name: 'summary',
  exposes: { './SummaryFeature': './src/SummaryFeature.tsx' },
});
