import { DEFAULT_OFFCHAIN_VOTING_BACKEND_URL, DEFAULT_OFFCHAIN_VOTING_REPO_ADDRESS } from "./internal";
import {
  OffchainVotingContextState,
  OffchainVotingOverriddenState,
} from "./internal/types";
import { OffchainVotingContextParams } from "./types";
import { Context, ContextCore } from "@aragon/sdk-client-common";
export class OffchainVotingContext extends ContextCore {
  // This variable keeps track of the state of the context and is an extension of the Base Context State
  protected state: OffchainVotingContextState = this.state;
  // This variable keeps track of the properties that were manually overriden by the user
  protected overriden: OffchainVotingOverriddenState = this.overriden;
  constructor(
    contextParams?: Partial<OffchainVotingContextParams>,
    aragonContext?: Context,
  ) {
    // call the parent constructor to be able to have access to this
    // and set the default values
    super();
    // if the user alredy provides an aragon context that we can use
    if (aragonContext) {
      // override the default values with the ones from the aragon context
      Object.assign(this, aragonContext);
    }
    // contextParams have priority over the aragonContext
    if (contextParams) {
      // overide the aragonContext and default values with the ones from the contextParams
      this.set(contextParams);
    }
  }

  public set(contextParams: OffchainVotingContextParams) {
    // so we need to call the parent set first
    super.set(contextParams);

    // set the default values for the new params
    this.setDefaults();

    // override default params if specified in the contexcParams
    if (contextParams.offchainVotingBackendUrl) {
      // override the offchainVotingBackendUrl value
      this.state.offchainVotingBackendUrl =
        contextParams.offchainVotingBackendUrl;
      // set the overriden flag to true in case set is called again
      this.overriden.offchainVotingBackendUrl = true;
    }

    if(contextParams.offchainVotingRepoAddress) {
      this.state.offchainVotingRepoAddress = contextParams.offchainVotingRepoAddress;
      this.overriden.offchainVotingRepoAddress = true;
    }
  }

  // Use this space to set the default values for the properties that you need
  // in the context
  private setDefaults() {
    if (!this.overriden.offchainVotingRepoAddress) {
      this.state.offchainVotingRepoAddress = DEFAULT_OFFCHAIN_VOTING_REPO_ADDRESS;
    }
    if (!this.overriden.offchainVotingBackendUrl) {
      this.state.offchainVotingBackendUrl = DEFAULT_OFFCHAIN_VOTING_BACKEND_URL;
    }
  }

  // here add getters for the properies that you need the user to pass in the context
  // This can be used to specify a contract addres or and endpoint to a service
  get offchainVotingRepoAddress(): string {
    return this.state.offchainVotingRepoAddress;
  }
  // here add getters for the properies that you need the user to pass in the context
  // This can be used to specify a contract addres or and endpoint to a service
  get offchainVotingBackendUrl(): string {
    return this.state.offchainVotingBackendUrl;
  }
}
