import { gql } from 'graphql-request';

export const QueryPluginSettings = gql`
  query PluginSettings($address: String!, $block: Block_height) {
    plugins(block: $block, where: { address: $address }) {
      id
      onlyExecutionMultisigProposalCreation
      minTallyApprovals
      minParticipation
      supportThreshold
      minDuration: minVoteDuration
      minTallyDuration
      daoTokenAddress
      censusStrategyURI
      minProposerVotingPower
      executionMultisigMembers
    }
  }
`;
