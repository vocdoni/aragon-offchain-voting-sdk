import { gql } from 'graphql-request';

export const QueryPluginMembers = gql`
  query PluginMembers($address: String!, $block: Block_height) {
    pluginMembers(block: $block, where: { address: $address }) {
      id
      address
      balance
      votingPower
      plugin {
        id
      }
      proposals {
        id
      }
      delegatee {
        id
        address
      }
      delegators {
        id
        address
      }
    }
  }
`;
