import {
  CreateGasslessProposalParams,
  GaslessVotingProposal,
  PrepareInstallationParams,
  GaslessPluginVotingSettings,
  GaslessProposalParametersContractStruct,
  ApproveTallyStep,
  ApproveTallyStepValue,
  SubgraphVotingMember,
  GaslessVotingProposalSubgraph,
  GaslessVotingProposalListItem,
} from '../../types';
import { INSTALLATION_ABI } from '../constants';
import { GaslessVotingClientCore } from '../core';
import {
  QueryMemberProposals,
  QueryPluginMembers,
  QueryPluginProposal,
  QueryPluginProposals,
  QueryPluginSettings,
} from '../graphql-queries';
import { IGaslessVotingClientMethods } from '../interfaces';
import {
  initParamsToContract,
  parseSubgraphProposal,
  toGaslessVotingProposalListItem,
  toNewProposal,
  toTokenVotingMember,
  vochainResultsToSCResults,
  vochainVoteResultsToProposal,
} from '../utils';
import { GovernanceWrappedERC20__factory } from '@aragon/osx-ethers';
import {
  Erc20TokenDetails,
  Erc20WrapperTokenDetails,
  Erc721TokenDetails,
  ExecuteProposalStep,
  ExecuteProposalStepValue,
  ProposalCreationStepValue,
  ProposalCreationSteps,
  ProposalQueryParams,
  ProposalSortBy,
  TokenVotingMember,
} from '@aragon/sdk-client';
import {
  findLog,
  InvalidAddressOrEnsError,
  NoProviderError,
  prepareGenericInstallation,
  PrepareInstallationStepValue,
  ProposalMetadata,
  SupportedNetwork,
  SupportedNetworksArray,
  TokenType,
  InvalidAddressError,
  InvalidProposalIdError,
  IpfsPinError,
  ProposalCreationError,
  SizeMismatchError,
  UnsupportedNetworkError,
  boolArrayToBitmap, // decodeProposalId,
  encodeProposalId,
  hexToBytes,
  decodeProposalId,
  SortDirection,
  decodeRatio,
} from '@aragon/sdk-client-common';
import { isAddress } from '@ethersproject/address';
import { getNetwork } from '@ethersproject/providers';
// import { Wallet } from '@ethersproject/wallet';
import { VocdoniVoting__factory } from '@vocdoni/gasless-voting-ethers';
import { ErrElectionNotFound, ElectionAPI } from '@vocdoni/sdk';

// import axios from 'axios';

// import { providers } from 'ethers';

/**
 * GaslessVotingClientMethods class represents a collection of methods for interacting with the Gasless Voting client.
 */
/**
 * GaslessVotingClientMethods class represents a collection of methods for interacting with the Gasless Voting client.
 */
export class GaslessVotingClientMethods
  extends GaslessVotingClientCore
  implements IGaslessVotingClientMethods
{
  /**
   * Prepares the installation of a token voting plugin in a given dao
   *
   * @param {PrepareInstallationParams} params
   * @return {*}  {AsyncGenerator<PrepareInstallationStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async *prepareInstallation(
    params: PrepareInstallationParams
  ): AsyncGenerator<PrepareInstallationStepValue> {
    const network = await this.web3.getProvider().getNetwork();
    const networkName = network.name as SupportedNetwork;
    if (!SupportedNetworksArray.includes(networkName)) {
      throw new UnsupportedNetworkError(networkName);
    }
    yield* prepareGenericInstallation(this.web3, {
      daoAddressOrEns: params.daoAddressOrEns,
      pluginRepo: this.gaslessVotingRepoAddress,
      version: params.versionTag,
      installationAbi: INSTALLATION_ABI,
      installationParams: initParamsToContract(params.settings),
      pluginSetupProcessorAddress: this.web3.getAddress(
        'pluginSetupProcessorAddress'
      ),
    });
  }

  /**
   * Creates a new proposal on the given TokenVoting plugin contract
   *
   * @param {CreateGasslessProposalParams} params
   * @return {*}  {AsyncGenerator<ProposalCreationStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async *createProposal(
    params: CreateGasslessProposalParams
  ): AsyncGenerator<ProposalCreationStepValue> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      params.pluginAddress,
      signer
    );

    if (
      params.failSafeActions?.length &&
      params.failSafeActions.length !== params.actions?.length
    ) {
      throw new SizeMismatchError(
        `Length failSafeActions:${params.failSafeActions.length}`,
        `Length actions:${params.actions?.length || 0}`
      );
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);

    const startTimestamp = params.startDate?.getTime() || 0;
    const endTimestamp = params.endDate?.getTime() || 0;
    const minTallyDurationTimestamp = params.tallyEndDate?.getTime() || 0;

    const votingParams: GaslessProposalParametersContractStruct = {
      startDate: BigInt(Math.round(startTimestamp / 1000)),
      voteEndDate: BigInt(Math.round(endTimestamp / 1000)),
      tallyEndDate: BigInt(Math.round(minTallyDurationTimestamp / 1000)),
      securityBlock: BigInt(0),
      totalVotingPower: params.totalVotingPower,
      censusURI: params.censusURI,
      censusRoot: hexToBytes(params.censusRoot),
    };
    const tx = await gaslessVotingContract.createProposal(
      hexToBytes(params.vochainProposalId),
      allowFailureMap,
      votingParams,
      params.actions || []
    );

    yield {
      key: ProposalCreationSteps.CREATING,
      txHash: tx.hash,
    };

    const receipt = await tx.wait();
    const gaslessVotingContractInterface =
      VocdoniVoting__factory.createInterface();
    const log = findLog(
      receipt,
      gaslessVotingContractInterface,
      'ProposalCreated'
    );
    if (!log) {
      throw new ProposalCreationError();
    }

    const parsedLog = gaslessVotingContractInterface.parseLog(log);
    const proposalId = parsedLog.args['proposalId'];
    if (!proposalId) {
      throw new ProposalCreationError();
    }

    yield {
      key: ProposalCreationSteps.DONE,
      proposalId: encodeProposalId(params.pluginAddress, Number(proposalId)),
    };
  }

  /**
   * Returns the details of the given proposal
   *
   * @param {string} pluginAdress
   * @param {string} proposalId
   * @return {*}  {Promise<TokenVotingProposal>}
   * @memberof GaslessVotingClientMethods
   */
  public async getProposal(
    proposalId: string,
    daoName?: string,
    daoAddress?: string
  ): Promise<GaslessVotingProposal | null> {
    try {
      const { pluginAddress } = decodeProposalId(proposalId);
      if (!isAddress(pluginAddress)) {
        Promise.reject(new InvalidAddressError());
      }

      let pluginSettings = await this.getVotingSettings(pluginAddress);
      if (!pluginSettings) return null;

      const query = QueryPluginProposal;
      const params = {
        proposalId: proposalId,
      };
      const name = 'GaslessVoting Proposal';
      type T = { pluginProposal: GaslessVotingProposalSubgraph };
      let { pluginProposal } = await this.graphql.request<T>({
        query,
        params,
        name,
      });

      //TODO conver this to reject when the getProposals query is converted to subgraph
      if (!pluginProposal?.vochainProposalId.length) return null;

      // pluginProposal;
      pluginProposal = parseSubgraphProposal(pluginProposal);

      const vochainProposal = await this.vocdoniSDK.fetchElection(
        pluginProposal.vochainProposalId
      );
      const votesList = await ElectionAPI.votesList(
        this.vocdoniSDK.url,
        pluginProposal.vochainProposalId
      );
      const voters = votesList.votes.map((vote) => '0x' + vote.voterID);

      const census3token = await this.vocdoniCensus3.getToken(
        pluginSettings.daoTokenAddress as string,
        getNetwork(this.web3.getNetworkName()).chainId
      );

      return toNewProposal(
        pluginProposal,
        pluginSettings,
        vochainProposal,
        census3token,
        voters,
        daoName,
        daoAddress
      );
    } catch (error) {
      if (error instanceof ErrElectionNotFound) return null;
      throw error;
    }
  }

  /**
   * Returns a list of proposals on the Plugin, filtered by the given criteria
   *
   * @param {ProposalQueryParams} params
   * @return {*}  {Promise<TokenVotingProposalListItem[]>}
   * @memberof GaslessVotingClientMethods
   */
  public async getProposals({
    daoAddressOrEns,
    pluginAddress,
    skip = 0,
    limit = 10,
    status = undefined,
    direction = SortDirection.ASC,
    sortBy = ProposalSortBy.CREATED_AT,
  }: ProposalQueryParams & { pluginAddress: string }): Promise<
    GaslessVotingProposalListItem[]
  > {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }

    let pluginSettings = await this.getVotingSettings(pluginAddress);
    if (!pluginSettings) return [];
    let where: { plugin_: object; dao?: string } = {
      plugin_: { address: pluginAddress },
    };

    let token = await this.getToken(pluginAddress);
    if (!token) return [];

    let address = daoAddressOrEns;
    if (address) {
      if (!isAddress(address)) {
        await this.web3.ensureOnline();
        const provider = this.web3.getProvider();
        if (!provider) {
          throw new NoProviderError();
        }
        try {
          const resolvedAddress = await provider.resolveName(address);
          if (!resolvedAddress) {
            throw new InvalidAddressOrEnsError();
          }
          address = resolvedAddress;
        } catch (e) {
          throw new InvalidAddressOrEnsError(e);
        }
      }
      where = { ...where, dao: address.toLowerCase() };
    }

    const query = QueryPluginProposals;
    const params = {
      where,
      limit,
      skip,
      direction,
      sortBy,
    };

    const name = 'GaslessVoting proposals';
    type T = {
      pluginProposals: Array<GaslessVotingProposalSubgraph & { census: any }>;
    };
    const { pluginProposals } = await this.graphql.request<T>({
      query,
      params,
      name,
    });

    await Promise.all(
      pluginProposals.map(async (proposal) => {
        const vochainProposal = await this.vocdoniSDK.fetchElection(
          proposal.vochainProposalId
        );
        proposal.metadata = {
          title: vochainProposal.title?.default || '',
          summary: vochainProposal.description?.default || '',
          description: '',
          resources: [],
        };
        proposal.tally = vochainVoteResultsToProposal(
          vochainProposal.questions
        );
        proposal.census = vochainProposal.census;
      })
    );
    if (status)
      return pluginProposals
        .map((proposal) =>
          toGaslessVotingProposalListItem(
            proposal,
            token,
            pluginSettings as GaslessPluginVotingSettings
          )
        )
        .filter((p) => p.status == status);

    return pluginProposals.map((proposal) =>
      toGaslessVotingProposalListItem(
        proposal,
        token,
        pluginSettings as GaslessPluginVotingSettings
      )
    );
  }

  /**
   * Returns the settings of a plugin given the address of the plugin instance
   *
   * @param {string} pluginAddress
   * @param {number} blockNumber
   * @return {*}  {Promise<VotingSettings>}
   * @memberof GaslessVotingClientMethods
   */
  public async getVotingSettings(
    pluginAddress: string,
    blockNumber?: number
  ): Promise<GaslessPluginVotingSettings | null> {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }

    const query = QueryPluginSettings;
    const params = {
      address: pluginAddress.toLowerCase(),
      block: blockNumber ? { number: blockNumber } : null,
    };
    const name = 'GaslessVoting settings';
    type T = { plugins: GaslessPluginVotingSettings[] };
    const { plugins } = await this.graphql.request<T>({
      query,
      params,
      name,
    });
    if (!plugins.length) {
      return null;
    }
    plugins[0].minParticipation = decodeRatio(plugins[0].minParticipation, 6);
    plugins[0].supportThreshold = decodeRatio(plugins[0].supportThreshold, 6);
    plugins[0].proposalCount = Number(plugins[0].dao?.proposalsCount) || 0;
    plugins[0].minProposerVotingPower = BigInt(
      plugins[0].minProposerVotingPower
    );
    return plugins[0] as GaslessPluginVotingSettings;
  }

  /**
   * Returns the details of the token used in a specific plugin instance
   *
   * @param {string} pluginAddress
   * @return {*}  {Promise<Erc20TokenDetails | null>}
   * @memberof GaslessVotingClientMethods
   */
  public async getToken(
    pluginAddress: string
  ): Promise<
    Erc20TokenDetails | Erc721TokenDetails | Erc20WrapperTokenDetails | null
  > {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    const pluginSettings = await this.getVotingSettings(pluginAddress);
    if (!pluginSettings || !pluginSettings.daoTokenAddress) return null;

    const signer = this.web3.getProvider();

    const tokenContract = GovernanceWrappedERC20__factory.connect(
      pluginSettings.daoTokenAddress,
      signer
    );
    return {
      address: pluginSettings.daoTokenAddress,
      name: await tokenContract.name(),
      symbol: await tokenContract.symbol(),
      decimals: await tokenContract.decimals(),
      type: TokenType.ERC20,
    };
  }

  /**
   * Returns the details of the token used in a specific plugin instance
   *
   * @param {string} pluginAddress
   * @return {*}  {Promise<Erc20TokenDetails | null>}
   * @memberof GaslessVotingClientMethods
   */
  public async getMembers(
    pluginAddress: string,
    blockNumber?: number
  ): Promise<TokenVotingMember[]> {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    const query = QueryPluginMembers;
    const params = {
      address: pluginAddress.toLowerCase(),
      block: blockNumber ? { number: blockNumber } : null,
    };
    const name = 'GaslessVoting members';
    type T = { pluginMembers: SubgraphVotingMember[] };
    const { pluginMembers } = await this.graphql.request<T>({
      query,
      params,
      name,
    });
    return pluginMembers.map((member: SubgraphVotingMember) =>
      toTokenVotingMember(member)
    );
  }

  /**
   * Retrieves the proposals created by a specific member for a given plugin.
   *
   * @param pluginAddress - The address of the plugin.
   * @param creatorAddress - The address of the creator/member.
   * @param skip - The number of proposals to skip (default: 0).
   * @param limit - The maximum number of proposals to retrieve (default: 10).
   * @param direction - The sorting direction for the proposals (default: SortDirection.ASC).
   * @param sortBy - The field to sort the proposals by (default: ProposalSortBy.CREATED_AT).
   * @returns A promise that resolves to an array of proposal IDs.
   */
  public async getMemberProposals(
    pluginAddress: string,
    creatorAddress: string,
    blockNumber = 0,
    direction = SortDirection.ASC,
    sortBy = ProposalSortBy.CREATED_AT
  ): Promise<string[]> {
    if (!isAddress(pluginAddress) || !isAddress(creatorAddress)) {
      Promise.reject(new InvalidAddressError());
    }

    const query = QueryMemberProposals;
    const params = {
      pluginAddress: pluginAddress.toLowerCase(),
      creatorAddress: creatorAddress.toLowerCase(),
      block: blockNumber ? { number: blockNumber } : null,
      direction,
      sortBy,
    };
    const name = 'GaslessVoting member proposals';
    type T = { pluginProposals: Array<{ id: string }> };
    const { pluginProposals } = await this.graphql.request<T>({
      query,
      params,
      name,
    });
    return pluginProposals.map((proposal) => proposal.id);
  }

  /**
   * Wrapps the setTally, approve and execute function
   *
   * @param {string} pluginAddress
   * @param {string} proposalId
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async approve(
    proposalId: string,
    tryExecution = false
  ): Promise<AsyncGenerator<ApproveTallyStepValue>> {
    const signer = this.web3.getConnectedSigner();

    const { pluginAddress, id } = decodeProposalId(proposalId);
    if (!isAddress(pluginAddress)) {
      return Promise.reject(new InvalidAddressError());
    }
    if (isNaN(id)) return Promise.reject(new InvalidProposalIdError());

    let isMultisigMember = await this.isMultisigMember(
      pluginAddress,
      await signer.getAddress()
    );
    if (!isMultisigMember) Promise.reject(new Error('Not a multisig member'));

    const proposal = await this.getProposal(proposalId);
    if (!proposal) return Promise.reject(new InvalidProposalIdError());
    if (!proposal.vochain?.tally?.final)
      Promise.reject(Error('No results yet'));

    if (proposal.approvers.length == 0) {
      return this.setTally(
        proposalId,
        vochainResultsToSCResults(proposal.vochain.metadata)
      );
    }
    return this.approveTally(proposalId, tryExecution);
  }

  /**
   * Set tally of the given proposal from the Vochain tally
   *
   * @param {string} pluginAddress
   * @param {string} proposalId
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async *setTally(
    proposalId: string,
    results: bigint[][]
  ): AsyncGenerator<ApproveTallyStepValue> {
    const signer = this.web3.getConnectedSigner();

    const { pluginAddress, id } = decodeProposalId(proposalId);

    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    if (isNaN(id)) Promise.reject(new InvalidProposalIdError());

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    let tx = await gaslessVotingContract.setTally(id, results);

    yield {
      key: ApproveTallyStep.EXECUTING,
      txHash: tx.hash,
    };
    await tx.wait();
    yield {
      key: ApproveTallyStep.DONE,
    };
  }

  /**
   * Aproves tally of the given proposal, give that it has been already set
   * and executes action if requested
   *
   * @param {string} proposalId
   * @param {boolean} tryExecution
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async *approveTally(
    proposalId: string,
    tryExecution = false
  ): AsyncGenerator<ApproveTallyStepValue> {
    const { pluginAddress, id } = decodeProposalId(proposalId);
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    if (isNaN(id)) Promise.reject(new InvalidProposalIdError());

    Error('Invalid proposal id');

    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    const tx = await gaslessVotingContract.approveTally(id, tryExecution);

    yield {
      key: ApproveTallyStep.EXECUTING,
      txHash: tx.hash,
    };
    await tx.wait();
    yield {
      key: ApproveTallyStep.DONE,
    };
  }

  /**
   * Executes the given proposal, provided that it has already passed
   *
   * @param {string} proposalId
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async *executeProposal(
    proposalId: string
  ): AsyncGenerator<ExecuteProposalStepValue> {
    const { pluginAddress, id } = decodeProposalId(proposalId);
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    if (isNaN(id)) Promise.reject(new InvalidProposalIdError());
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );
    const tx = await gaslessVotingContract.executeProposal(id);

    yield {
      key: ExecuteProposalStep.EXECUTING,
      txHash: tx.hash,
    };
    await tx.wait();
    yield {
      key: ExecuteProposalStep.DONE,
    };
  }

  /**
   * Checks whether the current proposal can be executed
   *
   * @param {string} pluginAddress
   * @param {string} memberAddress
   * @return {*}  {Promise<boolean>}
   * @memberof GaslessVotingClientMethods
   */
  public async isMultisigMember(
    pluginAddress: string,
    memberAddress: string
  ): Promise<boolean> {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    if (!isAddress(memberAddress)) {
      Promise.reject(new InvalidAddressError());
    }

    const settings = await this.getVotingSettings(pluginAddress);
    return (
      settings?.executionMultisigMembers?.indexOf(
        memberAddress.toLocaleLowerCase()
      ) !== -1
    );
  }

  /**
   * Retrieves the current signer's delegatee for the given token
   *
   * @param {string} tokenAddress
   * @return {*}  {Promise<string | null>}
   * @memberof GaslessVotingClientMethods
   */
  public async getDelegatee(tokenAddress: string): Promise<string | null> {
    const signer = this.web3.getConnectedSigner();
    const governanceErc20Contract = GovernanceWrappedERC20__factory.connect(
      tokenAddress,
      signer
    );
    const address = await signer.getAddress();
    const delegatee = await governanceErc20Contract.delegates(address);
    return address === delegatee ? null : delegatee;
  }

  /**
   * Checks whether the current proposal can be executed
   *
   * @param {string} proposalId
   * @return {*}  {Promise<boolean>}
   * @memberof GaslessVotingClientMethods
   */
  // public async canExecute(proposalId: string): Promise<boolean> {
  //   const signer = this.web3.getConnectedSigner();

  //   const { pluginAddress, id } = decodeProposalId(proposalId);

  //   const tokenVotingContract = TokenVoting__factory.connect(
  //     pluginAddress,
  //     signer
  //   );

  //   return tokenVotingContract.canExecute(id);
  // }

  /**
   * Checks if an user can vote in a proposal
   *
   * @param {CanVoteParams} params
   * @returns {*}  {Promise<boolean>}
   */
  // public async canVote(params: CanVoteParams): Promise<boolean> {
  //   const signer = this.web3.getConnectedSigner();

  //   if (!isAddress(params.voterAddressOrEns)) {
  //     throw new InvalidAddressError();
  //   }

  //   const { pluginAddress, id } = decodeProposalId(params.proposalId);

  //   const tokenVotingContract = TokenVoting__factory.connect(
  //     pluginAddress,
  //     signer
  //   );
  //   return tokenVotingContract.callStatic.canVote(
  //     id,
  //     params.voterAddressOrEns,
  //     params.vote
  //   );
  // }

  /**
   * Pins a metadata object into IPFS and retruns the generated hash
   *
   * @param {ProposalMetadata} params
   * @return {*}  {Promise<string>}
   * @memberof ClientMethods
   */
  public async pinMetadata(params: ProposalMetadata): Promise<string> {
    try {
      const cid = await this.ipfs.add(JSON.stringify(params));
      await this.ipfs.pin(cid);
      return `ipfs://${cid}`;
    } catch (e) {
      throw new IpfsPinError(e);
    }
  }

  // /**
  //  * This Validation function prevents sending broken
  //  * addresses that may cause subgraph crash
  //  *
  //  * @param address Wallet Address
  //  * @returns boolean determines whether it is erc20 compatible or not
  //  */
  // public async isERC20Token(tokenAddress: string): Promise<boolean> {
  //   const signer = this.web3.getConnectedSigner();
  //   const contract = new Contract(tokenAddress, ERC20_ABI, signer);
  //   try {
  //     await Promise.all([
  //       contract.balanceOf(tokenAddress),
  //       contract.totalSupply(),
  //     ]);
  //     return true;
  //   } catch (err) {
  //     return false;
  //   }
  // }

  // /**
  //  * Checks if a given ERC20 token, owned by the caller, is mintable.
  //  * @param tokenAddress The address of the ERC20 token.
  //  * @returns A promise that resolves to a boolean indicating whether the token is both owned by the callee and mintable.
  //  */
  // public async isOwnedERC20Mintable(tokenAddress: string): Promise<boolean> {
  //   const signer = this.web3.getConnectedSigner();
  //   const contract = new Contract(tokenAddress, ERC20_ABI, signer);
  //   return contract.estimateGas
  //     .mint(tokenAddress, 1)
  //     .then(() => true)
  //     .catch(() => false);
  // }

  /**
   * Checks if the given token is compatible with the TokenVoting plugin
   *
   * @param {string} tokenAddress
   * @return {*}  {Promise<TokenVotingTokenCompatibility>}
   * @memberof TokenVotingClientMethods
   */
  // public async isTokenVotingCompatibleToken(
  //   tokenAddress: string
  // ): Promise<TokenVotingTokenCompatibility> {
  //   // check if is address
  //   if (!isAddress(tokenAddress) || tokenAddress === AddressZero) {
  //     throw new InvalidAddressError();
  //   }
  //   const provider = this.web3.getProvider();
  //   // check if is a contract
  //   if ((await provider.getCode(tokenAddress)) === '0x') {
  //     throw new NotAContractError();
  //   }
  //   const contract = new Contract(tokenAddress, ERC165_ABI, provider);

  //   if (!(await this.isERC20Token(tokenAddress))) {
  //     return TokenVotingTokenCompatibility.INCOMPATIBLE;
  //   }
  //   try {
  //     if (!(await contract.supportsInterface(ERC165_INTERFACE_ID))) {
  //       return TokenVotingTokenCompatibility.NEEDS_WRAPPING;
  //     }
  //     for (const interfaceId of GOVERNANCE_SUPPORTED_INTERFACE_IDS) {
  //       const isSupported = await contract.supportsInterface(interfaceId);
  //       if (isSupported) {
  //         return TokenVotingTokenCompatibility.COMPATIBLE;
  //       }
  //     }
  //     return TokenVotingTokenCompatibility.NEEDS_WRAPPING;
  //   } catch (e) {
  //     return TokenVotingTokenCompatibility.NEEDS_WRAPPING;
  //   }
  // }
}
