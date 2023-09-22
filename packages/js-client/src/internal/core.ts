import { OffchainVotingContext } from '../context';
import { ClientCore } from '@aragon/sdk-client-common';
import { EnvOptions, VocdoniSDKClient } from '@vocdoni/sdk';

export class OffchainVotingClientCore extends ClientCore {
  public offchainVotingContext: string;
  public offchainVotingRepoAddress: string;
  protected vocdoniSDK: VocdoniSDKClient;

  constructor(pluginContext: OffchainVotingContext, vocdoniEnv: EnvOptions) {
    super(pluginContext);
    this.vocdoniSDK = new VocdoniSDKClient({ env: vocdoniEnv });
    this.offchainVotingContext = pluginContext.offchainVotingBackendUrl;
    this.offchainVotingRepoAddress = pluginContext.offchainVotingRepoAddress;
  }
}
