import * as BUILD_METADATA from "../../../../contracts/src/build-metadata.json";
import { PrepareInstallationParams } from "../../types";
import { OffchainVotingClientCore } from "../core";
import { IOffchainVotingClientMethods } from "../interfaces";
import {
  prepareGenericInstallation,
  PrepareInstallationStepValue,
} from "@aragon/sdk-client-common";

export class OffchainVotingClientMethods extends OffchainVotingClientCore
  implements IOffchainVotingClientMethods {
  // implementation of the methods in the interface
  public async *prepareInstallation(
    params: PrepareInstallationParams,
  ): AsyncGenerator<PrepareInstallationStepValue> {
    // do any additionall custom operations here before you prepare your plugin
    // ...
    yield* prepareGenericInstallation(this.web3, {
      daoAddressOrEns: params.daoAddressOrEns,
      pluginRepo: this.offchainVotingContext,
      version: params.version,
      installationAbi: BUILD_METADATA.pluginSetup.prepareInstallation.inputs, // this is the abi of the prepareInstallation method of your plugin
      installationParams: [params.settings.number],
    });
  }
  // public async *myFunction(params: Params){
  // //here you have access to eht multiple services provided by the ContextCore, for example
  // const signer = this.web3.getConnectedSigner();
  // const ipfsClient = this.ipfs.getClient();
  // const graphqlClient = this.graphql.getClient();
  // this.offchainVotingRepoAddress
  // }
}
