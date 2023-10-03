import {
  CreateGasslessProposalParams,
  GaslessVotingProposal,
  PrepareInstallationParams,
  GaslessPluginVotingSettings,
  SetTallyStepValue,
  ApproveTallyStepValue,
} from '../types';
import {
  VotingSettings,
  MintTokenParams,
  ProposalCreationStepValue,
  Erc20TokenDetails,
  Erc721TokenDetails,
  Erc20WrapperTokenDetails,
  TokenVotingMember,
} from '@aragon/sdk-client';
import {
  GasFeeEstimation,
  PrepareInstallationStepValue,
  DaoAction,
  InterfaceParams,
} from '@aragon/sdk-client-common';

export interface IOffchainVotingClient {
  methods: IOffchainVotingClientMethods;
  estimation: IOffchainVotingClientEstimation;
  encoding: IOffchainVotingClientEncoding;
  decoding: IOffchainVotingClientDecoding;
}

export interface IOffchainVotingClientMethods {
  // Generic prepareInstallation method
  // it should receive the parameters in the
  // prepareInstallation of plugin that you are installing,
  // the version of the plugin, the dao address and the plugin
  // repo if its not specified in the state of the client
  prepareInstallation(
    params: PrepareInstallationParams
  ): AsyncGenerator<PrepareInstallationStepValue>;
  // Add any methods that you need
  createProposal(
    params: CreateGasslessProposalParams
  ): AsyncGenerator<ProposalCreationStepValue>;
  //
  getProposal(
    daoName: string,
    daoAddress: string,
    pluginAddress: string,
    proposalId: number
  ): Promise<GaslessVotingProposal | null>;
  //
  getProposals(
    daoName: string,
    daoAddress: string,
    pluginAddress: string
  ): Promise<GaslessVotingProposal[]>;
  //
  getVotingSettings(
    pluginAddress: string,
    blockNumber?: number
  ): Promise<GaslessPluginVotingSettings | null>;
  getToken(
    pluginAddress: string
  ): Promise<
    Erc20TokenDetails | Erc721TokenDetails | Erc20WrapperTokenDetails | null
  >;
  getMembers(pluginAddress: string): Promise<TokenVotingMember[]>;
  isCommitteeMember(
    pluginAddress: string,
    memberAddress: string
  ): Promise<boolean>;
  setTally(
    pluginAddress: string,
    proposalId: number
  ): AsyncGenerator<SetTallyStepValue>;
  approveTally(
    proposalId: string,
    tryExecution: boolean
  ): AsyncGenerator<ApproveTallyStepValue>;
}
export interface IOffchainVotingClientEstimation {
  // prepareInstallation(
  //   params: PrepareInstallationParams
  // ): Promise<GasFeeEstimation>;
  // createProposal
  createProposal(
    params: CreateGasslessProposalParams
  ): Promise<GasFeeEstimation>;
  setTally(
    pluginAddress: string,
    proposalId: number
  ): Promise<GasFeeEstimation>;
  // Add any estimation methods that you need
}
export interface IOffchainVotingClientEncoding {
  // Fill with methods that encode actions that can be passed to a proposal
  // encodeAction(params: Params): DaoAction;
}
export interface IOffchainVotingClientDecoding {
  // Fill with methods that encode actions that can be passed to a proposal
  // encodeAction(data: Uint8Array): params;
  findInterface(data: Uint8Array): InterfaceParams | null;
}

export interface ITokenVotingClientEncoding {
  updatePluginSettingsAction: (
    pluginAddress: string,
    params: VotingSettings
  ) => DaoAction;
  mintTokenAction: (
    minterAddress: string,
    params: MintTokenParams
  ) => DaoAction;
}
