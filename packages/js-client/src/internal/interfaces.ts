import { PrepareInstallationParams } from './types';
import {
  VotingSettings,
  MintTokenParams,
} from '@aragon/sdk-client';
import {
  GasFeeEstimation,
  PrepareInstallationStepValue,
  DaoAction,
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
  ): AsyncGenerator<PrepareInstallationStepValue> 
  // Add any methods that you need
}
export interface IOffchainVotingClientEstimation {
  prepareInstallation(
    params: PrepareInstallationParams
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
