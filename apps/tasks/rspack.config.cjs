const createConfig = require('../../config/rspack.cjs');

module.exports = env => createConfig(__dirname, 3001, {
  name: 'tasks',
  shareStrategy: 'loaded-first',
  exposes: {
    './TasksFeature': './src/TasksFeature.tsx',
  },
  remotes: {
    editor: `editor@http://localhost:${env?.editorPort ?? 3004}/mf-manifest.json`,
  },
})(env);
