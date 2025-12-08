const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for better module resolution
config.resolver.alias = {
  '@': __dirname,
};

// Increase timeout for better stability
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set longer timeout for requests
      res.setTimeout(120000);
      return middleware(req, res, next);
    };
  },
};

// Optimize for web and native builds
config.resolver.extraNodeModules = {
  'react-native': require.resolve('react-native-web'),
};

module.exports = config;