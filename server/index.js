require('@babel/register')({
  presets: ['@babel/preset-env'],
  ignore: ['node_modules'],
  plugins: ['@babel/plugin-transform-spread', 'import-graphql', '@babel/plugin-transform-async-to-generator'],
});

// Import the rest of our application.
module.exports = require('./server.js');
