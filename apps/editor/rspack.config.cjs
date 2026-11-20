const createConfig = require('../../config/rspack.cjs');

module.exports = createConfig(__dirname, 3004, {
  name: 'editor',
  exposes: {
    './TaskEditor': './src/TaskEditor.tsx',
  },
});
