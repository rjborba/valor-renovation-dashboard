const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3001, {
  name: 'tasks',
  exposes: {
    './TasksFeature': './src/TasksFeature.tsx',
  },
});
