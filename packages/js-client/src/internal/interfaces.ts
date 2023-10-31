import {
  CreateGasslessProposalParams,
  GaslessVotingProposal,
  PrepareInstallationParams,
  GaslessPluginVotingSettings,
  ApproveTallyStepValue,
} from '../types';
import {
  MintTokenParams,
  ProposalCreationStepValue,
  Erc20TokenDetails,
  Erc721TokenDetails,
  Erc20WrapperTokenDetails,
  TokenVotingMember,
  ExecuteProposalStepValue,
  ProposalQueryParams,
} from '@aragon/sdk-client';
import {
  GasFeeEstimation,
  PrepareInstallationStepValue,
  DaoAction,
  InterfaceParams,
  ProposalMetadata,
} from '@aragon/sdk-client-common';

export interface IGaslessVotingClient {
  methods: IGaslessVotingClientMethods;
  estimation: IGaslessVotingClientEstimation;
  encoding: IGaslessVotingClientEncoding;
  decoding: IGaslessVotingClientDecoding;
}

export interface IGaslessVotingClientMethods {
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
    proposalId: string,
    daoName?: string,
    daoAddress?: string,
  ): Promise<GaslessVotingProposal | null>;
  //
  getProposals(
    params: ProposalQueryParams & { pluginAddress: string }
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
  isMultisigMember(
    pluginAddress: string,
    memberAddress: string
  ): Promise<boolean>;
  approve(
    proposalId: string,
  ): Promise<AsyncGenerator<ApproveTallyStepValue>>;
  setTally(
    proposalId: string,
    results: bigint[][]
  ): AsyncGenerator<ApproveTallyStepValue>;
  approveTally(
    proposalId: string,
    tryExecutio: boolean
  ): AsyncGenerator<ApproveTallyStepValue>;
  execute(
    proposalId: string
  ): AsyncGenerator<ExecuteProposalStepValue>;
  pinMetadata(params: ProposalMetadata): Promise<string>;
}
export interface IGaslessVotingClientEstimation {
  // prepareInstallation(
  //   params: PrepareInstallationParams
  // ): Promise<GasFeeEstimation>;
  // createProposal
  createProposal(
    params: CreateGasslessProposalParams
  ): Promise<GasFeeEstimation>;
  setTally(
    proposalId: string,
    results: bigint[][]
  ): Promise<GasFeeEstimation>;
  approve(proposalId: string): Promise<GasFeeEstimation>;
  execute(proposalId: string): Promise<GasFeeEstimation>;
  // Add any estimation methods that you need
}
export interface IGaslessVotingClientEncoding {
  // Fill with methods that encode actions that can be passed to a proposal
  // encodeAction(params: Params): DaoAction;
  mintTokenAction: (
    minterAddress: string,
    params: MintTokenParams
  ) => DaoAction;
  updatePluginSettingsAction(
    pluginAddress: string,
    params: GaslessPluginVotingSettings
  ): DaoAction;
}
export interface IGaslessVotingClientDecoding {
  // Fill with methods that encode actions that can be passed to a proposal
  // encodeAction(data: Uint8Array): params;
  findInterface(data: Uint8Array): InterfaceParams | null;
  updatePluginSettingsAction(data: Uint8Array): GaslessPluginVotingSettings;
  mintTokenAction(data: Uint8Array): MintTokenParams;
}
