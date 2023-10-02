import { OffchainVotingContext } from '../context';
import { ClientCore } from '@aragon/sdk-client-common';
import {
  EnvOptions,
  VocdoniCensus3Client,
  VocdoniSDKClient,
} from '@vocdoni/sdk';

export class OffchainVotingClientCore extends ClientCore {
  public offchainVotingContext: string;
  public offchainVotingRepoAddress: string;
  protected vocdoniSDK: VocdoniSDKClient;
  protected vocdoniCensus3: VocdoniCensus3Client;

  constructor(pluginContext: OffchainVotingContext, vocdoniEnv: EnvOptions) {
    super(pluginContext);
    this.vocdoniSDK = new VocdoniSDKClient({ env: vocdoniEnv });
    this.vocdoniCensus3 = new VocdoniCensus3Client({ env: vocdoniEnv });
    this.offchainVotingContext = pluginContext.offchainVotingBackendUrl;
    this.offchainVotingRepoAddress = pluginContext.offchainVotingRepoAddress;
  }
}
