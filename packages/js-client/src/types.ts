import { ContextParams } from "@aragon/sdk-client-common";

// extend the ContextParams interface with the params that you need
export type OffchainVotingContextParams = ContextParams & {
  // add any parameter that you need
  offchainVotingRepoAddress?: string;
  offchainVotingBackendUrl?: string;
};
