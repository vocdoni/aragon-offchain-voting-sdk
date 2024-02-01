import { gql } from 'graphql-request';

export const QueryPluginMembers = gql`
  query PluginMembers($address: String!, $block: Block_height) {
    pluginMembers(block: $block, where: { plugin_: { address: $address } }) {
      address
      balance
      votingPower
      delegatee {
        address
      }
      delegators {
        address
      }
    }
  }
`;

export const QueryMemberInfo = gql`
  query PluginMembers($address: String!, $block: Block_height) {
    pluginMembers(block: $block, where: { address: : $address }) {
      address
      balance
      votingPower
      delegatee {
        address
      }
      delegators {
        address
      }
    }
  }
`;

export const QueryMemberProposals = gql`
  query ProposalsByCreator(
    $pluginAddress: String!
    $creatorAddress: String!
    $block: Block_height
    $direction: OrderDirection!
    $sortBy: PluginProposal_orderBy!
  ) {
    pluginProposals(
      where: { plugin_: { address: $pluginAddress }, creator: $creatorAddress }
      block: $block
      orderDirection: $direction
      orderBy: $sortBy
    ) {
      id
    }
  }
`;
