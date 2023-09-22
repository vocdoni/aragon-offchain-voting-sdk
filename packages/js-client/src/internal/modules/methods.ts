import {
  CreateGasslessProposalParams,
  GaslessVotingProposal,
  PrepareInstallationParams,
  GaslessPluginVotingSettings,
  GaslessProposalParametersContractStruct,
  GaslessVotingMember,
} from '../../types';
import { INSTALLATION_ABI } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientMethods } from '../interfaces';
import {
  initParamsToContract,
  toGaslessVotingProposal,
  toNewProposal,
  votingSettingsfromContract,
} from '../utils';
import { GovernanceWrappedERC20__factory, IDAO } from '@aragon/osx-ethers';
import {
  Erc20TokenDetails,
  Erc20WrapperTokenDetails,
  Erc721TokenDetails,
  ProposalCreationStepValue,
  ProposalCreationSteps,
  TokenVotingMember,
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
  ProposalCreationError,
  SizeMismatchError,
  UnsupportedNetworkError,
  boolArrayToBitmap,
  encodeProposalId,
  hexToBytes,
} from '@aragon/sdk-common';
import { isAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { VocdoniVoting__factory } from '@vocdoni/offchain-voting-ethers';
import {
  EnvOptions,
  ErrElectionNotFound,
  VocdoniCensus3Client,
} from '@vocdoni/sdk';
import axios from 'axios';

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
      throw new SizeMismatchError();
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);
    // const startTimestamp = params.startDate
    //   ? new Date(params.startDate.toNumber()).getTime()
    //   : 0;
    // const endTimestamp = params.endDate
    //   ? new Date(params.endDate.toNumber()).getTime()
    //   : 0;
    const votingParams: GaslessProposalParametersContractStruct = {
      censusBlock: [] as string[],
      startDate: BigNumber.from(params.startDate),
      endDate: BigNumber.from(params.endDate),
      expirationDate: BigNumber.from(0),
      securityBlock: BigNumber.from(0),
    };
    const tx = await gaslessVotingContract.createProposal(
      // toUtf8Bytes(params.metadataUri),
      hexToBytes(params.vochainProposalId),
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
  public async getProposal(
    dao: IDAO,
    pluginAddress: string,
    proposalId: number
  ): Promise<GaslessVotingProposal | null> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );
    let pluginSettings = votingSettingsfromContract(
      await gaslessVotingContract.getPluginSettings()
    );
    let proposal = await gaslessVotingContract.getProposal(proposalId);

    if (!proposal) {
      return null;
    }
    let parsedSCProposal = toGaslessVotingProposal(proposal);
    if (!parsedSCProposal.vochainProposalId)
      Promise.reject(new ErrElectionNotFound());
    const vochainProposal = await this.vocdoniSDK.fetchElection(
      parsedSCProposal.vochainProposalId
    );
    // TODO
    return toNewProposal(
      proposalId,
      dao,
      pluginSettings,
      vochainProposal,
      parsedSCProposal
    );
  }

  /**
   * Returns a list of proposals on the Plugin, filtered by the given criteria
   *
   * @param {ProposalQueryParams} params
   * @return {*}  {Promise<TokenVotingProposalListItem[]>}
   * @memberof TokenVotingClient
   */
  public async getProposals(
    dao: IDAO,
    pluginAddress: string
  ): Promise<GaslessVotingProposal[]> {
    let id = 0;
    let proposal = null;
    let proposals: GaslessVotingProposal[] = [];
    do {
      let proposal = await this.getProposal(dao, pluginAddress, id);
      if (proposal) proposals.push(proposal);
      id += 1;
    } while (proposal != null);
    return proposals;
  }

  /**
   * Returns the settings of a plugin given the address of the plugin instance
   *
   * @param {string} pluginAddress
   * @param {number} blockNumber
   * @return {*}  {Promise<VotingSettings>}
   * @memberof TokenVotingClient
   */
  public async getVotingSettings(
    pluginAddress: string,
    blockNumber?: number
  ): Promise<GaslessPluginVotingSettings | null> {
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
    let params = blockNumber ? { blockTag: blockNumber || 0 } : {};
    const settings = await gaslessVotingContract.getPluginSettings(params);
    return votingSettingsfromContract(settings);
  }

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

  /**
   * Returns the details of the token used in a specific plugin instance
   *
   * @param {string} pluginAddress
   * @return {*}  {Promise<Erc20TokenDetails | null>}
   * @memberof TokenVotingClient
   */
  public async getMembers(pluginAddress: string): Promise<TokenVotingMember[]> {
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );
    if (!gaslessVotingContract) {
      return Promise.reject();
    }
    const pluginSettings = await gaslessVotingContract.getPluginSettings();
    const census3client = new VocdoniCensus3Client({ env: EnvOptions.STG });
    return axios
      .get(
        census3client.url +
          `/debug/token/${pluginSettings.daoTokenAddress}/holders`
      )
      .then((response) =>
        response.data.map(
          (val: GaslessVotingMember) =>
            ({
              address: val.address,
              balance: val.balance,
              delegatee: null,
              delegators: [],
              votingPower: val.balance,
            } as TokenVotingMember)
        )
      )
      .catch(() => []);
  }
}
