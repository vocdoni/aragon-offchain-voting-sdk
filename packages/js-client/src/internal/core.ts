import { GaslessVotingContext } from '../context';
import { ClientCore } from '@aragon/sdk-client-common';
import {
  EnvOptions,
  VocdoniCensus3Client,
  VocdoniSDKClient,
} from '@vocdoni/sdk';

export class GaslessVotingClientCore extends ClientCore {
  public gaslessVotingContext: string;
  public gaslessVotingRepoAddress: string;
  protected vocdoniSDK: VocdoniSDKClient;
  protected vocdoniCensus3: VocdoniCensus3Client;

  constructor(
    pluginContext: GaslessVotingContext,
    vocdoniEnv: EnvOptions,
    census3_url: string
  ) {
    super(pluginContext);
    this.vocdoniSDK = new VocdoniSDKClient({ env: vocdoniEnv });
    this.vocdoniCensus3 = new VocdoniCensus3Client({
      env: vocdoniEnv,
      // Use next line to hardcode the API URL
      api_url: census3_url,
    });
    this.gaslessVotingContext = pluginContext.gaslessVotingBackendUrl;
    this.gaslessVotingRepoAddress = pluginContext.gaslessVotingRepoAddress;
  }
}
