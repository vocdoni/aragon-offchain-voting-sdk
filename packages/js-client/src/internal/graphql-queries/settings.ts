import { gql } from 'graphql-request';

export const QueryPluginSettings = gql`
  query PluginSettings($address: String!, $block: Block_height) {
    plugins(address: $address, block: $block) {
      id
      onlyExecutionMultisigProposalCreation
      minTallyApprovals
      minParticipation
      supportThreshold
      minVoteDuration
      minTallyDuration
      daoTokenAddress
      censusStrategyURI
      minProposerVotingPower
      executionMultisigMembers
    }
  }
`;
