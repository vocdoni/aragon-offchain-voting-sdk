import { gql } from 'graphql-request';

export const QueryPluginProposal = gql`
  query PluginProposal($proposalId: ID!) {
    pluginProposal(id: $proposalId) {
      id
      dao {
        address: id
      }
      metadata
      actionsSubgraph: actions {
        to
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
    $sortBy: PluginProposal_orderBy!
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
        address: id
      }
      metadata
      actionsSubgraph: actions {
        to
        value
        data
      }
      allowFailureMap
      failureMap
      pluginProposalId
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
