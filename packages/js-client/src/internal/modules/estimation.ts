import {
  CreateGasslessProposalParams,
  GaslessProposalParametersContractStruct,
} from '../../types';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientEstimation } from '../interfaces';
import { toGaslessVotingProposal } from '../utils';
import { GasFeeEstimation } from '@aragon/sdk-client-common';
import {
  SizeMismatchError,
  boolArrayToBitmap,
  hexToBytes,
} from '@aragon/sdk-common';
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
      throw new SizeMismatchError();
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);

    const votingParams: GaslessProposalParametersContractStruct = {
      censusBlock: [] as string[],
      startDate: BigInt(params.startDate / 1000),
      endDate: BigInt(params.endDate / 1000),
      expirationDate: params.expirationDate
        ? BigInt(params.expirationDate / 1000)
        : BigInt(0),
      securityBlock: BigInt(0),
    };
    const estimatedGasFee =
      await gaslessVotingContract.estimateGas.createProposal(
        // toUtf8Bytes(params.metadataUri),
        hexToBytes(params.vochainProposalId),
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
