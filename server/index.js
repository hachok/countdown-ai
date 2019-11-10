require('@babel/register')({
  presets: ['@babel/preset-env'],
  ignore: ['node_modules'],
  resolutions: {
    "**/@babel/runtime": "7.5.0"
  },
});

// Import the rest of our application.
module.exports = require('./server.js');
