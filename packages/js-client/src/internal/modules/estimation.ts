import * as BUILD_METADATA from "../../../../contracts/src/build-metadata.json";
import { PrepareInstallationParams } from "../../types";
import { OffchainVotingClientCore } from "../core";
import { IOffchainVotingClientEstimation } from "../interfaces";
import { PluginRepo__factory } from "@aragon/osx-ethers";
import {
  GasFeeEstimation,
  prepareGenericInstallationEstimation,
} from "@aragon/sdk-client-common";

export class SimpleStoragClientEstimation extends OffchainVotingClientCore
  implements IOffchainVotingClientEstimation {
  public async prepareInstallation(
    params: PrepareInstallationParams,
  ): Promise<GasFeeEstimation> {
    let version = params.version;
    // if not specified use the lates version
    if (!version) {
      // get signer
      const signer = this.web3.getConnectedSigner();
      // connect to the plugin repo
      const pluginRepo = PluginRepo__factory.connect(
        this.offchainVotingRepoAddress,
        signer,
      );
      // get latest release
      const currentRelease = await pluginRepo.latestRelease();
      // get latest version
      const latestVersion = await pluginRepo["getLatestVersion(uint8)"](
        currentRelease,
      );
      version = latestVersion.tag;
    }

    return prepareGenericInstallationEstimation(this.web3, {
      daoAddressOrEns: params.daoAddressOrEns,
      pluginRepo: this.offchainVotingRepoAddress,
      version,
      installationAbi: BUILD_METADATA.pluginSetup.prepareInstallation.inputs,
      installationParams: [params.settings.number],
    });
  }
}
