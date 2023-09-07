import { OffchainVotingContext } from './context';
import {
  IOffchainVotingClient,
  IOffchainVotingClientDecoding,
  IOffchainVotingClientEncoding,
  IOffchainVotingClientEstimation,
  IOffchainVotingClientMethods,
  SimpleStoragClientEstimation,
  OffchainVotingClientDecoding,
  OffchainVotingClientEncoding,
  OffchainVotingClientMethods,
} from './internal';
import { OffchainVotingClientCore } from './internal/core';
import {
  PluginInstallItem,
} from '@aragon/sdk-client-common';
import { Networkish } from '@ethersproject/providers';
import { OffchainVotingPluginInstall } from './internal/types';

export class OffchainVotingClient
  extends OffchainVotingClientCore
  implements IOffchainVotingClient
{
  public methods: IOffchainVotingClientMethods;
  public estimation: IOffchainVotingClientEstimation;
  public encoding: IOffchainVotingClientEncoding;
  public decoding: IOffchainVotingClientDecoding;

  constructor(pluginContext: OffchainVotingContext) {
    super(pluginContext);
    this.methods = new OffchainVotingClientMethods(pluginContext);
    this.estimation = new SimpleStoragClientEstimation(pluginContext);
    this.encoding = new OffchainVotingClientEncoding(pluginContext);
    this.decoding = new OffchainVotingClientDecoding(pluginContext);
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
