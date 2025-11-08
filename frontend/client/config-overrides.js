module.exports = function override(config, env) {
  // Add the fallbacks
  config.resolve.fallback = {
    ...config.resolve.fallback, // Keep existing fallbacks
    "util": require.resolve("util/"), // Add the 'util' polyfill
    "fs": false // Tell webpack to ignore 'fs'
  };
  
  return config;
}