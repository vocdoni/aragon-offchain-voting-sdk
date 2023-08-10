import { OffchainVotingContext } from '../context';
import { ClientCore } from '@aragon/sdk-client-common';

export class OffchainVotingClientCore extends ClientCore {
  public offchainVotingContext: string;
  public offchainVotingRepoAddress: string;
  
  constructor(pluginContext: OffchainVotingContext) {
    super(pluginContext);
    this.offchainVotingContext = pluginContext.offchainVotingBackendUrl;
    this.offchainVotingRepoAddress = pluginContext.offchainVotingRepoAddress;
  }
}

