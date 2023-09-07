import * as BUILD_METADATA from '../../../../contracts/src/build-metadata.json';
import { PrepareInstallationParams } from '../../types';
import { INSTALLATION_ABI } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientMethods } from '../interfaces';
import { tokenVotingInitParamsToContract } from '../utils';
import { TokenVotingPluginPrepareInstallationParams } from '@aragon/sdk-client';
import {
  LIVE_CONTRACTS,
  prepareGenericInstallation,
  PrepareInstallationStepValue,
  SupportedNetwork,
  SupportedNetworksArray,
} from '@aragon/sdk-client-common';
import { UnsupportedNetworkError } from '@aragon/sdk-common';

export class OffchainVotingClientMethods
  extends OffchainVotingClientCore
  implements IOffchainVotingClientMethods
{
  /**
   * Prepares the installation of a token voting plugin in a given dao
   *
   * @param {TokenVotingPluginPrepareInstallationParams} params
   * @return {*}  {AsyncGenerator<PrepareInstallationStepValue>}
   * @memberof TokenVotingClientMethods
   */
  public async *prepareInstallation(
    params: TokenVotingPluginPrepareInstallationParams
  ): AsyncGenerator<PrepareInstallationStepValue> {
    const network = await this.web3.getProvider().getNetwork();
    const networkName = network.name as SupportedNetwork;
    if (!SupportedNetworksArray.includes(networkName)) {
      throw new UnsupportedNetworkError(networkName);
    }
    yield* prepareGenericInstallation(this.web3, {
      daoAddressOrEns: params.daoAddressOrEns,
      pluginRepo: this.offchainVotingContext,
      version: params.versionTag,
      installationAbi: INSTALLATION_ABI,
      installationParams: tokenVotingInitParamsToContract(params.settings),
    });
  }

  /**
   * Creates a new proposal on the given TokenVoting plugin contract
   *
   * @param {CreateMajorityVotingProposalParams} params
   * @return {*}  {AsyncGenerator<ProposalCreationStepValue>}
   * @memberof TokenVotingClient
   */
  // public async createProposalOffchain(
  //   params: CreateMajorityVotingProposalParams
  // ) {
  //   const signer = this.web3.getConnectedSigner();

  //   const tokenVotingContract = TokenVoting__factory.connect(
  //     params.pluginAddress,
  //     signer
  //   );

  //   if (
  //     params.failSafeActions?.length &&
  //     params.failSafeActions.length !== params.actions?.length
  //   ) {
  //     throw new SizeMismatchError();
  //   }
  //   const allowFailureMap = boolArrayToBitmap(params.failSafeActions);

  //   const startTimestamp = params.startDate?.getTime() || 0;
  //   const endTimestamp = params.endDate?.getTime() || 0;

  //   const receipt = await tx.wait();
  //   const tokenVotingContractInterface = TokenVoting__factory.createInterface();
  //   const log = findLog(
  //     receipt,
  //     tokenVotingContractInterface,
  //     'ProposalCreated'
  //   );
  //   if (!log) {
  //     throw new ProposalCreationError();
  //   }

  //   const parsedLog = tokenVotingContractInterface.parseLog(log);
  //   const proposalId = parsedLog.args['proposalId'];
  //   if (!proposalId) {
  //     throw new ProposalCreationError();
  //   }
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
   * @param {string} proposalId
   * @return {*}  {Promise<TokenVotingProposal>}
   * @memberof TokenVotingClient
   */
  // public async getProposal(
  //   proposalId: string,
  // ): Promise<TokenVotingProposal | null> {
  //   if (!isProposalId(proposalId)) {
  //     throw new InvalidProposalIdError();
  //   }
  //   const extendedProposalId = getExtendedProposalId(proposalId);
  //   const query = QueryTokenVotingProposal;
  //   const params = {
  //     proposalId: extendedProposalId,
  //   };
  //   const name = "TokenVoting proposal";
  //   type T = { tokenVotingProposal: SubgraphTokenVotingProposal };
  //   const { tokenVotingProposal } = await this.graphql.request<T>({
  //     query,
  //     params,
  //     name,
  //   });
  //   if (!tokenVotingProposal) {
  //     return null;
  //   } else if (!tokenVotingProposal.metadata) {
  //     return toTokenVotingProposal(
  //       tokenVotingProposal,
  //       EMPTY_PROPOSAL_METADATA_LINK,
  //     );
  //   }
  //   // format in the metadata field
  //   try {
  //     const metadataCid = resolveIpfsCid(tokenVotingProposal.metadata);
  //     const metadataString = await this.ipfs.fetchString(metadataCid);
  //     const metadata = JSON.parse(metadataString) as ProposalMetadata;
  //     return toTokenVotingProposal(tokenVotingProposal, metadata);
  //     // TODO: Parse and validate schema
  //   } catch (err) {
  //     if (err instanceof InvalidCidError) {
  //       return toTokenVotingProposal(
  //         tokenVotingProposal,
  //         UNSUPPORTED_PROPOSAL_METADATA_LINK,
  //       );
  //     }
  //     return toTokenVotingProposal(
  //       tokenVotingProposal,
  //       UNAVAILABLE_PROPOSAL_METADATA,
  //     );
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
  //   blockNumber?: number,
  // ): Promise<VotingSettings | null> {
  //   if (!isAddress(pluginAddress)) {
  //     throw new InvalidAddressError();
  //   }
  //   const query = QueryTokenVotingSettings;
  //   const params = {
  //     address: pluginAddress.toLowerCase(),
  //     block: blockNumber ? { number: blockNumber } : null,
  //   };
  //   const name = "TokenVoting settings";
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
  //       6,
  //     ),
  //     minParticipation: decodeRatio(
  //       BigInt(tokenVotingPlugin.minParticipation),
  //       6,
  //     ),
  //     minProposerVotingPower: BigInt(
  //       tokenVotingPlugin.minProposerVotingPower,
  //     ),
  //     votingMode: tokenVotingPlugin.votingMode,
  //   };
  // }
}
