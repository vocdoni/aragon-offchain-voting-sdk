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

  constructor(
    pluginContext: GaslessVotingContext,
    vocdoniEnv: EnvOptions,
    census3_url = 'https://census3-stg.vocdoni.net/api'
  ) {
    if (!vocdoniEnv) throw 'Invalid Vocdoni environment';
    super(pluginContext, vocdoniEnv, census3_url);
    this.methods = new GaslessVotingClientMethods(
      pluginContext,
      vocdoniEnv,
      census3_url
    );
    this.estimation = new GaslessVotingClientEstimation(
      pluginContext,
      vocdoniEnv,
      census3_url
    );
    this.encoding = new GaslessVotingClientEncoding(
      pluginContext,
      vocdoniEnv,
      census3_url
    );
    this.decoding = new GaslessVotingClientDecoding(
      pluginContext,
      vocdoniEnv,
      census3_url
    );
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
