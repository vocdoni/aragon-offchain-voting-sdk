import { ContextState, OverriddenState, ProposalBase, ProposalStatus } from "@aragon/sdk-client-common";

// extend the state of the client with the properties that you need
export type OffchainVotingContextState = ContextState & {
  offchainVotingRepoAddress: string;
  offchainVotingBackendUrl: string;
};

export type OffchainVotingOverriddenState =
  & OverriddenState
  & {
    [key in keyof OffchainVotingContextState]: boolean;
  };
