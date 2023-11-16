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
