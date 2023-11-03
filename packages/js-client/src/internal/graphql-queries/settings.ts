import { gql } from 'graphql-request';

export const QueryPluginSettings = gql`
  query PluginSettings($address: ID!, $block: Block_height) {
    plugin(id: $address, block: $block) {
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
