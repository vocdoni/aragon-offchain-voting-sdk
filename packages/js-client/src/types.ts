import {
  ContextParams,
  Pagination,
  VersionTag,
} from "@aragon/sdk-client-common";

// extend the ContextParams interface with the params that you need
export type OffchainVotingContextParams = ContextParams & {
  // add any parameter that you need
  offchainVotingRepoAddress?: string;
  offchainVotingBackendUrl?: string;
};

export type PrepareInstallationParams = {
  daoAddressOrEns: string;
  version?: VersionTag;
  settings: {
    number: bigint;
  };
};

export type NumbersQueryParams = Pagination & {
  sortBy?: NumbersSortBy;
  daoAddressOrEns?: string;
};

export enum NumbersSortBy {
  NUMBER = "number",
  CREATED_AT = "createdAt",
}

export type NumberListItem = {
  id: string;
  subdomain: string;
  value: bigint;
};
