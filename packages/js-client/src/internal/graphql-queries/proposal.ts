import { gql } from 'graphql-request';

export const QueryPluginProposal = gql`
  query PluginProposal($proposalId: ID!) {
    pluginProposal(id: $proposalId) {
      id
      dao {
        address: id
      }
      metadata
      actions {
        id
        value
        data
      }
      allowFailureMap
      failureMap
      vochainProposalId
      creatorAddress: creator
      startDate
      creationDate:  createdAt
      endDate: voteEndDate
      tallyEndDate
      creationBlockNumber
      snapshotBlock
      executed
      executionDate
      executionBlockNumber
      executionTxHash
      approvers {
        id
      }
      tallySubgraph: tally {
        values
      }
      tallyApproved
    }
  }
`;

export const QueryPluginProposals = gql`
  query QueryPluginProposals(
    $where: PluginProposal_filter!
    $limit: Int!
    $skip: Int!
    $direction: OrderDirection!
    $sortBy: TPluginProposal_orderBy!
  ) {
    pluginProposals(
      where: $where
      first: $limit
      skip: $skip
      orderDirection: $direction
      orderBy: $sortBy
    ) {
      id
      dao {
        id
        proposalsCount
      }
      metadata
      actions {
        id
        value
        data
      }
      allowFailureMap
      failureMap
      pluginProposalId
      vochainProposalId
      creator
      startDate
      createdAt
      voteEndDate
      tallyEndDate
      creationBlockNumber
      snapshotBlock
      executed
      executionDate
      executionBlockNumber
      executionTxHash
      approvers {
        id
      }
      tally {
        id
        values
      }
      tallyApproved
    }
  }
`;
