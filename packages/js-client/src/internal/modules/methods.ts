import {
  CreateGasslessProposalParams,
  GasslessVotingProposal,
  PrepareInstallationParams,
  vocdoniProposalParams,
} from '../../types';
import { INSTALLATION_ABI } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientMethods } from '../interfaces';
import { initParamsToContract, toGaslessVotingProposal } from '../utils';
import { GovernanceWrappedERC20__factory } from '@aragon/osx-ethers';
import {
  Erc20TokenDetails,
  Erc20WrapperTokenDetails,
  Erc721TokenDetails,
  ProposalCreationStepValue,
  ProposalCreationSteps,
} from '@aragon/sdk-client';
import {
  findLog,
  prepareGenericInstallation,
  PrepareInstallationStepValue,
  SupportedNetwork,
  SupportedNetworksArray,
  TokenType,
} from '@aragon/sdk-client-common';
import {
  InvalidAddressError,
  InvalidProposalIdError,
  ProposalCreationError,
  SizeMismatchError,
  UnsupportedNetworkError,
  boolArrayToBitmap,
  encodeProposalId,
  isProposalId,
} from '@aragon/sdk-common';
import { isAddress } from '@ethersproject/address';
import { VocdoniVoting__factory } from '@vocdoni/offchain-voting-ethers';

export class OffchainVotingClientMethods
  extends OffchainVotingClientCore
  implements IOffchainVotingClientMethods
{
  /**
   * Prepares the installation of a token voting plugin in a given dao
   *
   * @param {PrepareInstallationParams} params
   * @return {*}  {AsyncGenerator<PrepareInstallationStepValue>}
   * @memberof TokenVotingClientMethods
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
      pluginRepo: this.offchainVotingRepoAddress,
      version: params.versionTag,
      installationAbi: INSTALLATION_ABI,
      installationParams: initParamsToContract(params.settings),
    });
  }

  /**
   * Creates a new proposal on the given TokenVoting plugin contract
   *
   * @param {CreateGasslessProposalParams} params
   * @return {*}  {AsyncGenerator<ProposalCreationStepValue>}
   * @memberof TokenVotingClient
   */
  public async *createProposalOffchain(
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
      throw new SizeMismatchError();
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);
    const startTimestamp = params.startDate
      ? new Date(params.startDate).getTime()
      : 0;
    const endTimestamp = params.endDate
      ? new Date(params.endDate).getTime()
      : 0;
    const votingParams: vocdoniProposalParams = {
      censusBlock: params.censusBlock,
      securityBlock: params.securityBlock,
      startDate: Math.round(startTimestamp / 1000),
      endDate: Math.round(endTimestamp / 1000),
      expirationDate: params.expirationDate,
    };
    const tx = await gaslessVotingContract.createProposal(
      // toUtf8Bytes(params.metadataUri),
      params.vochainProposalId,
      allowFailureMap,
      votingParams,
      params.actions || []
      // params.creatorVote || 0,
      // params.executeOnPass || false,
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
  // }

  /**
   * Executes the given proposal, provided that it has already passed
   *
   * @param {string} proposalId
   * @return {*}  {AsyncGenerator<ExecuteProposalStepValue>}
   * @memberof TokenVotingClient
   */
  // public async *executeProposal(
  //   proposalId: string
  // ): AsyncGenerator<ExecuteProposalStepValue> {
  //   const signer = this.web3.getConnectedSigner();

  //   const { pluginAddress, id } = decodeProposalId(proposalId);

  //   const tokenVotingContract = TokenVoting__factory.connect(
  //     pluginAddress,
  //     signer
  //   );
  //   const tx = await tokenVotingContract.execute(id);

  //   yield {
  //     key: ExecuteProposalStep.EXECUTING,
  //     txHash: tx.hash,
  //   };
  //   await tx.wait();
  //   yield {
  //     key: ExecuteProposalStep.DONE,
  //   };
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
   * Checks whether the current proposal can be executed
   *
   * @param {string} proposalId
   * @return {*}  {Promise<boolean>}
   * @memberof TokenVotingClientMethods
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
   * Returns the list of wallet addresses holding tokens from the underlying Token contract used by the plugin
   *
   * @async
   * @param {string} pluginAddress
   * @param {number} blockNumber
   * @return {*}  {Promise<string[]>}
   * @memberof TokenVotingClient
   */
  // public async getMembers(
  //   pluginAddress: string,
  //   blockNumber?: number,
  // ): Promise<TokenVotingMember[]> {
  //   if (!isAddress(pluginAddress)) {
  //     throw new InvalidAddressError();
  //   }
  //   const query = QueryTokenVotingMembers;
  //   const params = {
  //     address: pluginAddress.toLowerCase(),
  //     block: blockNumber ? { number: blockNumber } : null,
  //   };
  //   const name = "TokenVoting members";
  //   type T = { tokenVotingPlugin: { members: SubgraphTokenVotingMember[] } };
  //   const { tokenVotingPlugin } = await this.graphql.request<T>({
  //     query,
  //     params,
  //     name,
  //   });
  //   return tokenVotingPlugin.members.map((
  //     member: SubgraphTokenVotingMember,
  //   ) => toTokenVotingMember(member));
  // }

  /**
   * Returns the details of the given proposal
   *
   * @param {string} pluginAdress
   * @param {string} proposalId
   * @return {*}  {Promise<TokenVotingProposal>}
   * @memberof TokenVotingClient
   */
  // public async getProposal(
  //   pluginAddress: string,
  //   proposalId: number
  // // ): Promise<GasslessVotingProposal | null> {
  //   ): Promise<GasslessVotingProposal | null> {
  //   const signer = this.web3.getConnectedSigner();

  //   const gaslessVotingContract = VocdoniVoting__factory.connect(
  //     pluginAddress,
  //     signer
  //   );
  //   let proposal = gaslessVotingContract.getProposal(proposalId);

  //   if (!proposal) {
  //     return null;

  //   // TODO
  //   return toGaslessVotingProposal(proposal);
  //   }
  // }

  /**
   * Returns a list of proposals on the Plugin, filtered by the given criteria
   *
   * @param {ProposalQueryParams} params
   * @return {*}  {Promise<TokenVotingProposalListItem[]>}
   * @memberof TokenVotingClient
   */
  // public async getProposals({
  //   daoAddressOrEns,
  //   limit = 10,
  //   status,
  //   skip = 0,
  //   direction = SortDirection.ASC,
  //   sortBy = ProposalSortBy.CREATED_AT,
  // }: ProposalQueryParams): Promise<TokenVotingProposalListItem[]> {
  //   let where = {};
  //   let address = daoAddressOrEns;
  //   if (address) {
  //     if (!isAddress(address)) {
  //       await this.web3.ensureOnline();
  //       const provider = this.web3.getProvider();
  //       if (!provider) {
  //         throw new NoProviderError();
  //       }
  //       try {
  //         const resolvedAddress = await provider.resolveName(address);
  //         if (!resolvedAddress) {
  //           throw new InvalidAddressOrEnsError();
  //         }
  //         address = resolvedAddress;
  //       } catch (e) {
  //         throw new InvalidAddressOrEnsError(e);
  //       }
  //     }
  //     where = { dao: address.toLowerCase() };
  //   }
  //   if (status) {
  //     where = { ...where, ...computeProposalStatusFilter(status) };
  //   }
  //   const query = QueryTokenVotingProposals;
  //   const params = {
  //     where,
  //     limit,
  //     skip,
  //     direction,
  //     sortBy,
  //   };
  //   const name = "TokenVoting proposals";
  //   type T = { tokenVotingProposals: SubgraphTokenVotingProposalListItem[] };
  //   const { tokenVotingProposals } = await this.graphql.request<T>({
  //     query,
  //     params,
  //     name,
  //   });
  //   return Promise.all(
  //     tokenVotingProposals.map(
  //       async (
  //         proposal: SubgraphTokenVotingProposalListItem,
  //       ): Promise<TokenVotingProposalListItem> => {
  //         // format in the metadata field
  //         if (!proposal.metadata) {
  //           return toTokenVotingProposalListItem(
  //             proposal,
  //             EMPTY_PROPOSAL_METADATA_LINK,
  //           );
  //         }
  //         try {
  //           const metadataCid = resolveIpfsCid(proposal.metadata);
  //           // Avoid blocking Promise.all if this individual fetch takes too long
  //           const stringMetadata = await promiseWithTimeout(
  //             this.ipfs.fetchString(metadataCid),
  //             MULTI_FETCH_TIMEOUT,
  //           );
  //           const metadata = JSON.parse(stringMetadata) as ProposalMetadata;
  //           return toTokenVotingProposalListItem(proposal, metadata);
  //         } catch (err) {
  //           if (err instanceof InvalidCidError) {
  //             return toTokenVotingProposalListItem(
  //               proposal,
  //               UNSUPPORTED_PROPOSAL_METADATA_LINK,
  //             );
  //           }
  //           return toTokenVotingProposalListItem(
  //             proposal,
  //             UNAVAILABLE_PROPOSAL_METADATA,
  //           );
  //         }
  //       },
  //     ),
  //   );
  // }

  /**
   * Returns the settings of a plugin given the address of the plugin instance
   *
   * @param {string} pluginAddress
   * @param {number} blockNumber
   * @return {*}  {Promise<VotingSettings>}
   * @memberof TokenVotingClient
   */
  // public async getVotingSettings(
  //   pluginAddress: string,
  //   blockNumber?: number
  // ): Promise<VotingSettings | null> {
  //   if (!isAddress(pluginAddress)) {
  //     throw new InvalidAddressError();
  //   }
  //   const query = QueryTokenVotingSettings;
  //   const params = {
  //     address: pluginAddress.toLowerCase(),
  //     block: blockNumber ? { number: blockNumber } : null,
  //   };
  //   const name = 'TokenVoting settings';
  //   type T = { tokenVotingPlugin: SubgraphVotingSettings };
  //   const { tokenVotingPlugin } = await this.graphql.request<T>({
  //     query,
  //     params,
  //     name,
  //   });
  //   if (!tokenVotingPlugin) {
  //     return null;
  //   }
  //   return {
  //     minDuration: parseInt(tokenVotingPlugin.minDuration),
  //     supportThreshold: decodeRatio(
  //       BigInt(tokenVotingPlugin.supportThreshold),
  //       6
  //     ),
  //     minParticipation: decodeRatio(
  //       BigInt(tokenVotingPlugin.minParticipation),
  //       6
  //     ),
  //     minProposerVotingPower: BigInt(tokenVotingPlugin.minProposerVotingPower),
  //     votingMode: tokenVotingPlugin.votingMode,
  //   };

  /**
   * Returns the details of the token used in a specific plugin instance
   *
   * @param {string} pluginAddress
   * @return {*}  {Promise<Erc20TokenDetails | null>}
   * @memberof TokenVotingClient
   */
  public async getToken(
    pluginAddress: string
  ): Promise<
    Erc20TokenDetails | Erc721TokenDetails | Erc20WrapperTokenDetails | null
  > {
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );
    if (!gaslessVotingContract) {
      return null;
    }
    const pluginSettings = await gaslessVotingContract.getPluginSettings();

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
}
