import {
  CreateGasslessProposalParams,
  GaslessProposalParametersContractStruct,
} from '../../types';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientEstimation } from '../interfaces';
import { toGaslessVotingProposal, vochainResultsToSCResults } from '../utils';
import {
  GasFeeEstimation,
  SizeMismatchError,
  boolArrayToBitmap,
  hexToBytes,
} from '@aragon/sdk-client-common';
import { VocdoniVoting__factory } from '@vocdoni/offchain-voting-ethers';

export class OffchainVotingClientEstimation
  extends OffchainVotingClientCore
  implements IOffchainVotingClientEstimation
{
  /**
   * Estimates the gas fee of creating a proposal on the plugin
   *
   * @param {CreateGasslessProposalParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof OffchainVotingClientEstimation
   */
  public async createProposal(
    params: CreateGasslessProposalParams
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      params.pluginAddress,
      signer
    );

    if (
      params.failSafeActions?.length &&
      params.failSafeActions.length !== params.actions?.length
    ) {
      throw new SizeMismatchError(`Expected failsafeactions ${params.failSafeActions?.length}`, `Found actions ${params.actions?.length}`);
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);


    const startTimestamp = params.startDate?.getTime() || 0;
    const endTimestamp = params.endDate.getTime();
    const expirationTimestamp = params.expirationDate?.getTime() || 0;

    const votingParams: GaslessProposalParametersContractStruct = {
      censusBlock: [] as string[],
      startDate: BigInt(Math.round(startTimestamp / 1000)),
      endDate: BigInt(Math.round(endTimestamp / 1000)),
      expirationDate: BigInt(Math.round(expirationTimestamp / 1000)),
      securityBlock: BigInt(0),
    };
    const estimatedGasFee =
      await gaslessVotingContract.estimateGas.createProposal(
        // toUtf8Bytes(params.metadataUri),
        hexToBytes(
          '0000000000000000000000000000000000000000000000000000000000000000'
        ),
        allowFailureMap,
        votingParams,
        params.actions || []
        // params.creatorVote || 0,
        // params.executeOnPass || false,
      );
    return this.web3.getApproximateGasFee(estimatedGasFee.toBigInt());
  }

  /**
   * Estimates the gas fee of creating a proposal on the plugin
   *
   * @param {CreateGasslessProposalParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof OffchainVotingClientEstimation
   */
  public async setTally(
    pluginAddress: string,
    proposalId: number
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    const proposalFromSC = toGaslessVotingProposal(
      await gaslessVotingContract.getProposal(proposalId)
    );
    const vochainProposal = await this.vocdoniSDK.fetchElection(
      proposalFromSC.vochainProposalId
    );
    const estimatedGasFee = await gaslessVotingContract.estimateGas.setTally(
      proposalId,
      vochainProposal.results.map((x) => x.map((y) => BigInt(y)))
    );
    return this.web3.getApproximateGasFee(estimatedGasFee.toBigInt());
  }

  /**
   * Estimates the gas fee of creating a proposal on the plugin
   *
   * @param {CreateGasslessProposalParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof OffchainVotingClientEstimation
   */
  public async approve(
    pluginAddress: string,
    proposalId: number
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    const proposalFromSC = toGaslessVotingProposal(
      await gaslessVotingContract.getProposal(proposalId)
    );
    const vochainProposal = await this.vocdoniSDK.fetchElection(
      proposalFromSC.vochainProposalId
    );

    let estimatedGasFee;
    if (proposalFromSC.approvers.length == 0) {
      estimatedGasFee = await gaslessVotingContract.estimateGas.setTally(
        proposalId,
        vochainResultsToSCResults(vochainProposal)
      );
    } else {
      estimatedGasFee = await gaslessVotingContract.estimateGas.approveTally(
        proposalId,
        false
      );
    }

    return this.web3.getApproximateGasFee(estimatedGasFee.toBigInt());
  }

  /**
   * Estimates the gas fee of creating a proposal on the plugin
   *
   * @param {ExecuteParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof OffchainVotingClientEstimation
   */
  public async execute(
    pluginAddress: string,
    proposalId: number
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const gaslessVotingContract = VocdoniVoting__factory.connect(
      pluginAddress,
      signer
    );

    const estimatedGasFee =
      await gaslessVotingContract.estimateGas.executeProposal(proposalId);

    return this.web3.getApproximateGasFee(estimatedGasFee.toBigInt());
  }

  // public async prepareInstallation(
  //   params: PrepareInstallationParams
  // ): Promise<GasFeeEstimation> {
  //   let version = params.versionTag;
  //   // if not specified use the lates version
  //   if (!version) {
  //     // get signer
  //     const signer = this.web3.getConnectedSigner();
  //     // connect to the plugin repo
  //     const pluginRepo = PluginRepo__factory.connect(
  //       this.offchainVotingRepoAddress,
  //       signer
  //     );
  //     // get latest release
  //     const currentRelease = await pluginRepo.latestRelease();
  //     // get latest version
  //     const latestVersion = await pluginRepo['getLatestVersion(uint8)'](
  //       currentRelease
  //     );
  //     version = latestVersion.tag;
  //   }

  //   return prepareGenericInstallationEstimation(this.web3, {
  //     daoAddressOrEns: params.daoAddressOrEns,
  //     pluginRepo: this.offchainVotingRepoAddress,
  //     version,
  //     installationAbi: BUILD_METADATA.pluginSetup.prepareInstallation.inputs,
  //     // installationParams: [params.settings],
  //   });
  // }
}
