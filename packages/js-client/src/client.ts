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
}
