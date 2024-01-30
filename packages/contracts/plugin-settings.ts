import buildMetadata from './src/build-metadata.json';
import releaseMetadata from './src/release-metadata.json';

export const PLUGIN_REPO_ENS_NAME = 'vocdoni-gasless-voting-poc-vanilla-erc20';
export const PLUGIN_CONTRACT_NAME = 'VocdoniVoting';
export const PLUGIN_SETUP_CONTRACT_NAME = 'VocdoniVotingSetup';

export const VERSION = {
  release: 1, // Increment this number ONLY if breaking/incompatible changes were made. Updates between releases are NOT possible.
  build: 2, // Increment this number if non-breaking/compatible changes were made. Updates to newer builds are possible.
};

// TODO: update the build metadata for decoding....
export const METADATA = {
  build: buildMetadata,
  release: releaseMetadata,
};
