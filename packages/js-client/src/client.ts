import { GaslessVotingContext } from './context';
import {
  IGaslessVotingClient,
  IGaslessVotingClientDecoding,
  IGaslessVotingClientEncoding,
  IGaslessVotingClientEstimation,
  IGaslessVotingClientMethods,
  GaslessVotingClientEstimation,
  GaslessVotingClientDecoding,
  GaslessVotingClientEncoding,
  GaslessVotingClientMethods,
} from './internal';
import { GaslessVotingClientCore } from './internal/core';
import { GaslessVotingPluginInstall } from './types';
import { PluginInstallItem } from '@aragon/sdk-client-common';
import { Networkish } from '@ethersproject/providers';
import { EnvOptions } from '@vocdoni/sdk';

export class GaslessVotingClient
  extends GaslessVotingClientCore
  implements IGaslessVotingClient
{
  public methods: IGaslessVotingClientMethods;
  public estimation: IGaslessVotingClientEstimation;
  public encoding: IGaslessVotingClientEncoding;
  public decoding: IGaslessVotingClientDecoding;

  constructor(pluginContext: GaslessVotingContext, vocdoniEnv: EnvOptions) {
    if (!vocdoniEnv) throw 'Invalid Vocdoni environment';
    super(pluginContext, vocdoniEnv);
    this.methods = new GaslessVotingClientMethods(pluginContext, vocdoniEnv);
    this.estimation = new GaslessVotingClientEstimation(
      pluginContext,
      vocdoniEnv
    );
    this.encoding = new GaslessVotingClientEncoding(pluginContext, vocdoniEnv);
    this.decoding = new GaslessVotingClientDecoding(pluginContext, vocdoniEnv);
  }

  static encoding = {
    /**
     * Computes the parameters to be given when creating the DAO,
     * so that the plugin is configured
     *
     * @param {TokenVotingPluginInstall} params
     * @param {Networkish} [network="mainnet"]
     * @return {*}  {PluginInstallItem}
     * @memberof GaslessVotingClient
     */
    getPluginInstallItem: (
      params: GaslessVotingPluginInstall,
      network: Networkish
    ): PluginInstallItem =>
      GaslessVotingClientEncoding.getPluginInstallItem(params, network),
  };
}
