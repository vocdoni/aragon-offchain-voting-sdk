import { gql } from 'graphql-request';

export const QueryGalsessVotingPluginToken = gql`
  query GalsessVotingPluginToken($address: ID!) {
    galsessVotingPluginToken(id: $address) {
      token {
        id
        name
        symbol
        __typename
        ... on ERC20WrapperContract {
          decimals
          underlyingToken {
            id
            name
            symbol
            decimals
          }
        }
        ... on ERC20Contract {
          decimals
        }
      }
    }
  }
`;
