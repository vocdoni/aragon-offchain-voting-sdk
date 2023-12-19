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
import { QueryPluginMembers, QueryPluginProposal, QueryPluginProposals, QueryPluginSettings } from '../graphql-queries';
import { IGaslessVotingClientMethods } from '../interfaces';
import {
  initParamsToContract,
  parseSubgraphProposal,
  toGaslessVotingProposalListItem,
  toNewProposal,
  toTokenVotingMember,
  vochainResultsToSCResults,
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
// import { Wallet } from '@ethersproject/wallet';
import { VocdoniVoting__factory } from '@vocdoni/gasless-voting-ethers';
import { ErrElectionNotFound, ElectionAPI } from '@vocdoni/sdk';
import { getNetwork } from '@ethersproject/providers';

// import axios from 'axios';

// import { providers } from 'ethers';

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
        proposalId: proposalId
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
      pluginProposal = parseSubgraphProposal(pluginProposal)

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
  }:
  ProposalQueryParams & { pluginAddress: string }): Promise<
  GaslessVotingProposalListItem[]
  > {
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }

    let pluginSettings = await this.getVotingSettings(pluginAddress);
    if (!pluginSettings) return [];
    let  where : {plugin_: object, dao?: string} = { plugin_: {address:pluginAddress} }

    let token = await this.getToken(pluginAddress)
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
      where = {...where,  dao: address.toLowerCase() };
    }

    const query = QueryPluginProposals;
    const params = {
      where,
      limit,
      skip,
      direction,
      sortBy,
    };

    const name = "GaslessVoting proposals";
    type T = { pluginProposals: GaslessVotingProposalSubgraph[] };
    const { pluginProposals } = await this.graphql.request<T>({
      query,
      params,
      name,
    });

    await Promise.all(pluginProposals.map(async (proposal)  => {
      const vochainProposal = await this.vocdoniSDK.fetchElection(proposal.vochainProposalId);
      proposal.metadata = {
        title: vochainProposal.title?.default || '',
        summary: vochainProposal.description?.default || '',
        description: '',
        resources: [],
      }
    }))
    if (status)
      return pluginProposals.map((proposal) => toGaslessVotingProposalListItem(proposal, token, pluginSettings as GaslessPluginVotingSettings)).filter(p => p.status == status)

    return pluginProposals.map((proposal) => toGaslessVotingProposalListItem(proposal, token, pluginSettings as GaslessPluginVotingSettings));
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
   * Wrapps the setTally, approve and execute function
   *
   * @param {string} pluginAddress
   * @param {string} proposalId
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof GaslessVotingClientMethods
   */
  public async approve(
    proposalId: string
  ): Promise<AsyncGenerator<ApproveTallyStepValue>> {
    const signer = this.web3.getConnectedSigner();

    const { pluginAddress, id } = decodeProposalId(proposalId);
    if (!isAddress(pluginAddress)) {
      Promise.reject(new InvalidAddressError());
    }
    if (isNaN(id)) Promise.reject(new InvalidProposalIdError());

    let isMultisigMember = await this.isMultisigMember(
      pluginAddress,
      await signer.getAddress()
    );
    if (!isMultisigMember) Promise.reject(new Error('Not a multisig member'));

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    const proposalFromSC = toGaslessVotingProposal(
      await gaslessVotingContract.getProposal(id)
    );
    const vochainProposal = await this.vocdoniSDK.fetchElection(
      proposalFromSC.vochainProposalId
    );
    if (!vochainProposal.finalResults) Promise.reject(Error('No results yet'));

    if (proposalFromSC.approvers.length == 0) {
      return this.setTally(
        proposalId,
        vochainResultsToSCResults(vochainProposal)
      );
    }
    return this.approveTally(proposalId, false);
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
    const signer = this.web3.getConnectedSigner();

    const tokenVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    return tokenVotingContract.isExecutionMultisigMember(memberAddress);
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
}
