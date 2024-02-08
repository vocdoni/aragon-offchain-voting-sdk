import {
  DEFAULT_GASLESS_VOTING_BACKEND_URL,
  DEFAULT_GASLESS_VOTING_REPO_ADDRESS,
  DEFAULT_GASLESS_VOTING_SUBHGRAPH_URL,
} from './internal';
import {
  GaslessVotingContextState,
  GaslessVotingOverriddenState,
} from './types';
import { GaslessVotingContextParams } from './types';
import { Context, ContextCore } from '@aragon/sdk-client-common';

export class GaslessVotingContext extends ContextCore {
  // This variable keeps track of the state of the context and is an extension of the Base Context State
  protected state: GaslessVotingContextState = this.state;
  // This variable keeps track of the properties that were manually overriden by the user
  protected overriden: GaslessVotingOverriddenState = this.overriden;
  constructor(
    contextParams?: Partial<GaslessVotingContextParams>,
    aragonContext?: Context
  ) {
    // call the parent constructor to be able to have access to this
    // and set the default values
    super();
    // if the user alredy provides an aragon context that we can use
    if (aragonContext) {
      const context = Object.assign({}, aragonContext);
      // override the default values with the ones from the aragon context
      Object.assign(this, context);
    }
    // contextParams have priority over the aragonContext
    if (contextParams) {
      // overide the aragonContext and default values with the ones from the contextParams
      this.set(contextParams);
      this.set({
        graphqlNodes: [{ url: DEFAULT_GASLESS_VOTING_SUBHGRAPH_URL }],
      });
      this.overriden.graphqlNodes = true;
      this.overriden.graphql = true;
    }
  }

  public set(contextParams: GaslessVotingContextParams) {
    // so we need to call the parent set first
    super.set(contextParams);

    // set the default values for the new params
    this.setDefaults();

    // override default params if specified in the contexcParams
    if (contextParams.gaslessVotingBackendUrl) {
      // override the gaslessVotingBackendUrl value
      this.state.gaslessVotingBackendUrl =
        contextParams.gaslessVotingBackendUrl;
      // set the overriden flag to true in case set is called again
      this.overriden.gaslessVotingBackendUrl = true;
    }

    if (contextParams.gaslessVotingRepoAddress) {
      this.state.gaslessVotingRepoAddress =
        contextParams.gaslessVotingRepoAddress;
      this.overriden.gaslessVotingRepoAddress = true;
    }
  }

  // Use this space to set the default values for the properties that you need
  // in the context
  private setDefaults() {
    if (!this.overriden.gaslessVotingRepoAddress) {
      this.state.gaslessVotingRepoAddress = DEFAULT_GASLESS_VOTING_REPO_ADDRESS;
    }
    if (!this.overriden.gaslessVotingBackendUrl) {
      this.state.gaslessVotingBackendUrl = DEFAULT_GASLESS_VOTING_BACKEND_URL;
    }
  }

  // here add getters for the properies that you need the user to pass in the context
  // This can be used to specify a contract addres or and endpoint to a service
  get gaslessVotingRepoAddress(): string {
    return this.state.gaslessVotingRepoAddress;
  }
  // here add getters for the properies that you need the user to pass in the context
  // This can be used to specify a contract addres or and endpoint to a service
  get gaslessVotingBackendUrl(): string {
    return this.state.gaslessVotingBackendUrl;
  }
}
