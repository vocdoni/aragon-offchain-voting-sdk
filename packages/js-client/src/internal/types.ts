import { ContractVotingSettings } from '@aragon/sdk-client';
import { TokenVotingPluginInstall } from '@aragon/sdk-client';
import {
  ContextState,
  OverriddenState,
  ProposalBase,
  ProposalStatus,
} from '@aragon/sdk-client-common';
import { BigNumber } from '@ethersproject/bignumber';

type NewTokenParams = {
  name: string;
  symbol: string;
  decimals: number;
  minter?: string;
  balances: { address: string; balance: bigint }[];
};

type ExistingTokenParams = {
  tokenAddress: string;
  wrappedToken: {
    name: string;
    symbol: string;
  };
};

// export type OffchainVotingPluginInstall = TokenVotingPluginInstall;
export type OffchainVotingPluginInstall = {
  daoAddress: string;
  votingSettings: VocdoniVotingSettings;
  newToken?: NewTokenParams;
  useToken?: ExistingTokenParams;
};

// extend the state of the client with the properties that you need
export type OffchainVotingContextState = ContextState & {
  offchainVotingRepoAddress: string;
  offchainVotingBackendUrl: string;
};

export type OffchainVotingOverriddenState = OverriddenState & {
  [key in keyof OffchainVotingContextState]: boolean;
};
export type ContractMintTokenParams = [string, BigNumber];
export type ContractTokenVotingInitParams = [
  VocdoniVotingSettings[],
  [
    string, // address
    string, // name
    string // symbol
  ],
  [
    string[], // receivers,
    BigNumber[] // amounts
  ]
];

export declare type MetadataAbiInput = {
  name: string;
  type: string;
  internalType: string;
  description?: string;
  components?: MetadataAbiInput[];
};

export enum VoteOption {
  None,
  Abstain,
  Yes,
  No,
}

export enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export type VotingSettings = {
  votingMode: number;
  supportThreshold: BigNumber;
  minParticipation: BigNumber;
  minDuration: number;
  minProposerVotingPower: number;
};

export const RATIO_BASE = BigNumber.from(10).pow(6); // 100% => 10**6
export const pctToRatio = (x: number) => RATIO_BASE.mul(x).div(100);

export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_YEAR = 365 * ONE_DAY;

export type VocdoniVotingSettings = {
  onlyCommitteeProposalCreation: boolean;
  minTallyApprovals: number;
  minDuration: number;
  minParticipation: BigNumber;
  supportThreshold: BigNumber;
  daoTokenAddress: string;
  minProposerVotingPower: number;
  censusStrategy: string;
};

export type vocdoniProposalParams = {
  censusBlock: number;
  securityBlock: number;
  startDate: number;
  endDate: number;
  expirationDate: number;
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}

/**
 * Represents a testing fork configuration.
 *
 * @network The name of the forked network.
 * @osxVersion The version of OSx at the moment of the fork.
 */
export type TestingFork = {
  network: string;
  osxVersion: string;
};

export type Permission = {
  operation: Operation;
  where: { name: string; address: string };
  who: { name: string; address: string };
  permission: string;
  condition?: string;
  data?: string;
};

export type AragonVerifyEntry = {
  address: string;
  args?: any[];
};

export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  // prettier-ignore
  'admin': string;
  // prettier-ignore
  'multisig': string;
  // prettier-ignore
  'vocdoni': string;
  [index: string]: string;
};

// release, build
export type VersionTag = [number, number];

export type UpdateInfo = {
  tags: string | string[];
  forkBlockNumber: number;
};

export const UPDATE_INFOS: { [index: string]: UpdateInfo } = {
  v1_3_0: {
    tags: 'update/to_v1.3.0',
    forkBlockNumber: 16722881,
  },
};
