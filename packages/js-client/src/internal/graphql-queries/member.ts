import { gql } from 'graphql-request';

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

// query MyQuery {
//   pluginMembers(where: {address: "0x05c1abef7664f65b0a8d5b3fe8e6b817ea9d3d90"}) {
//    address
//  }
// }
