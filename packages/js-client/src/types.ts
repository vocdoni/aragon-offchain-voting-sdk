import { IDAO } from '@aragon/osx-ethers';
import {
  CreateProposalBaseParams,
  TokenVotingProposalResult,
} from '@aragon/sdk-client';
import {
  ContextState,
  OverriddenState,
  VersionTag,
  ContextParams,
  DaoAction,
  ProposalBase,
} from '@aragon/sdk-client-common';
import { BigNumber } from '@ethersproject/bignumber';
import { VocdoniVoting } from '@vocdoni/offchain-voting-ethers';
import { PublishedElection } from '@vocdoni/sdk';

// extend the ContextParams interface with the params that you need
export type OffchainVotingContextParams = ContextParams & {
  // add any parameter that you need
  offchainVotingRepoAddress?: string;
  offchainVotingBackendUrl?: string;
};

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
  committee: string[];
  votingSettings: GaslessPluginVotingSettings;
  newToken?: NewTokenParams;
  useToken?: ExistingTokenParams;
};

export type PrepareInstallationParams = {
  settings: OffchainVotingPluginInstall;
  daoAddressOrEns: string;
  versionTag?: VersionTag;
};

// extend the state of the client with the properties that you need
export type OffchainVotingContextState = ContextState & {
  offchainVotingRepoAddress: string;
  offchainVotingBackendUrl: string;
};

export type OffchainVotingOverriddenState = OverriddenState & {
  [key in keyof OffchainVotingContextState]: boolean;
};
export type ContractMintTokenParams = [string, bigint];
export type ContractTokenVotingInitParams = [
  GaslessPluginVotingSettings[],
  [
    string, // address
    string, // name
    string // symbol
  ],
  [
    string[], // receivers,
    bigint[] // amounts
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
  supportThreshold: number;
  minParticipation: number;
  minDuration: bigint;
  minProposerVotingPower: bigint;
};

export const RATIO_BASE = BigNumber.from(10).pow(6); // 100% => 10**6
export const pctToRatio = (x: number) => RATIO_BASE.mul(x).div(100);

export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_YEAR = 365 * ONE_DAY;

export type GaslessPluginVotingSettings = {
  minTallyApprovals: number;
  minDuration: number;
  expirationTime: number;
  minParticipation: number;
  supportThreshold: number;
  minProposerVotingPower: bigint;
  censusStrategy: string;
  daoTokenAddress?: string; // calculated during the DAO installation
  onlyCommitteeProposalCreation?: boolean;
};

// export type GaslessProposalParamsOut = {
//   censusBlock: number;
//   securityBlock: number;
//   startDate: Date;
//   endDate: Date;
//   expirationDate: Date;
// };

// export type GaslessProposalParams = {
//   censusBlock: string[]; // following the multichain notation https://eips.ethereum.org/EIPS/eip-3770
//   securityBlock: number; // calculated internally in the smart contract
//   startDate: number;
//   endDate: number;
//   expirationDate: number; // calculated internally in the smart contract based on expirationTime
// };

export type GaslessProposalParametersStruct = {
  censusBlock?: string[]; // following the multichain notation https://eips.ethereum.org/EIPS/eip-3770
  securityBlock?: number; // calculated internally in the smart contract
  startDate: number; // UNIX timestamp (ms)
  endDate: number; // UNIX timestamp (ms)
  expirationDate: number; // calculated internally in the smart contract based on expirationTime
};

export type GaslessProposalParametersContractStruct = {
  censusBlock: string[];
  securityBlock: bigint;
  startDate: bigint;
  endDate: bigint;
  expirationDate: bigint;
};

export type GaslessVotingProposalFromSC = {
  executed: boolean;
  approvers: string[];
  vochainProposalId: string;
  parameters: GaslessProposalParametersStruct;
  allowFailureMap: number;
  tally: number[][];
  actions?: DaoAction[];
};

export type GaslessVotingProposal = ProposalBase & {
  expirationDate: Date;
  executed: boolean;
  approvers: string[];
  vochainProposalId: string;
  parameters: GaslessProposalParametersStruct;
  allowFailureMap: number;
  tally: number[][];
  settings: GaslessPluginVotingSettings;
  vochain: {
    metadata: PublishedElection;
    tally: {
      final: boolean;
      value: bigint[];
      parsed: TokenVotingProposalResult;
    };
  };
  totalVotingWeight: bigint;
  totalUsedWeight: bigint;
  participation: {
    currentParticipation: number;
    currentPercentage: number;
    missingParticipation: number;
  };
  canBeApproved: boolean;
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    type: string;
  };
};

export type CreateGasslessProposalParams = CreateProposalBaseParams &
  GaslessProposalParametersStruct & {
    vochainProposalId: string;
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

export type ProposalFromSC = {
  executed: boolean;
  approvers: string[];
  vochainProposalId: string;
  parameters: VocdoniVoting.ProposalParametersStructOutput;
  allowFailureMap: BigNumber;
  tally: BigNumber[][];
  actions: IDAO.ActionStructOutput[];
};

export type GaslessVotingMember = {
  /** The address of the member */
  address: string;
  /** The balance of the member */
  balance: bigint;
};

class SdkError extends Error {
  public cause?: Error | string;
  constructor(message: string, cause?: any) {
    super(message);
    if (typeof cause === 'string') {
      this.cause = cause;
    } else if (cause instanceof Error) {
      this.cause = cause.message;
    }
  }
}

export class InvalidResults extends SdkError {
  constructor(message?: string, cause?: any) {
    super(message ? message : 'Invalid results', cause);
  }
}

export enum SetTallyStep {
  EXECUTING = 'executing',
  DONE = 'done',
}

export type SetTallyStepValue =
  | { key: SetTallyStep.EXECUTING; txHash: string }
  | { key: SetTallyStep.DONE };

export enum ApproveTallyStep {
  EXECUTING = 'executing',
  DONE = 'done',
}

export type ApproveTallyStepValue =
  | { key: ApproveTallyStep.EXECUTING; txHash: string }
  | { key: ApproveTallyStep.DONE };

export enum SCVoteValues {
  yes = 0,
  no = 1,
  abstain = 2,
}
