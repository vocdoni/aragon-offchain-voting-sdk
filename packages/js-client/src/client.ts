import { OffchainVotingContext } from './context';
import {
  IOffchainVotingClient,
  IOffchainVotingClientDecoding,
  IOffchainVotingClientEncoding,
  IOffchainVotingClientEstimation,
  IOffchainVotingClientMethods,
  OffchainVotingClientEstimation,
  OffchainVotingClientDecoding,
  OffchainVotingClientEncoding,
  OffchainVotingClientMethods,
} from './internal';
import { OffchainVotingClientCore } from './internal/core';
import { OffchainVotingPluginInstall } from './types';
import { PluginInstallItem } from '@aragon/sdk-client-common';
import { Networkish } from '@ethersproject/providers';
import { EnvOptions } from '@vocdoni/sdk';

export class OffchainVotingClient
  extends OffchainVotingClientCore
  implements IOffchainVotingClient
{
  public methods: IOffchainVotingClientMethods;
  public estimation: IOffchainVotingClientEstimation;
  public encoding: IOffchainVotingClientEncoding;
  public decoding: IOffchainVotingClientDecoding;

  constructor(pluginContext: OffchainVotingContext, vocdoniEnv: EnvOptions) {
    if (!vocdoniEnv) throw 'Invalid Vocdoni environment';
    super(pluginContext, vocdoniEnv);
    this.methods = new OffchainVotingClientMethods(pluginContext, vocdoniEnv);
    this.estimation = new OffchainVotingClientEstimation(
      pluginContext,
      vocdoniEnv
    );
    this.encoding = new OffchainVotingClientEncoding(pluginContext, vocdoniEnv);
    this.decoding = new OffchainVotingClientDecoding(pluginContext, vocdoniEnv);
  }

  static encoding = {
    /**
     * Computes the parameters to be given when creating the DAO,
     * so that the plugin is configured
     *
     * @param {TokenVotingPluginInstall} params
     * @param {Networkish} [network="mainnet"]
     * @return {*}  {PluginInstallItem}
     * @memberof OffchainVotingClient
     */
    getPluginInstallItem: (
      params: OffchainVotingPluginInstall,
      network: Networkish
    ): PluginInstallItem =>
      OffchainVotingClientEncoding.getPluginInstallItem(params, network),
  };
}
