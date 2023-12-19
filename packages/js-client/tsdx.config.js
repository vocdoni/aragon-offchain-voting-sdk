// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
const internal = [
  '@vocdoni/gasless-voting-ethers'
]
module.exports = {
  // This function will run for each entry/format/env combination
  rollup(config, options) {
    // config.external= (id) => { if (internal.includes(id)) return false  }
    return config; // always return a config.
  },
};
