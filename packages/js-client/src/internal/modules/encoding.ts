import metadata from '../../../../contracts/src/build-metadata.json';
import { OffchainVotingPluginInstall } from '../../types';
import { DEFAULT_ADDRESSES } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientEncoding } from '../interfaces';
import { mintTokenParamsToContract, initParamsToContract } from '../utils';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import { MintTokenParams } from '@aragon/sdk-client';
import {
  DaoAction,
  getNamedTypesFromMetadata,
  PluginInstallItem,
  SupportedNetwork,
  SupportedNetworksArray,
} from '@aragon/sdk-client-common';
import {
  hexToBytes,
  InvalidAddressError,
  UnsupportedNetworkError,
} from '@aragon/sdk-common';
import { defaultAbiCoder } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { Networkish, getNetwork } from '@ethersproject/providers';

const prepareInstallationDataTypes = getNamedTypesFromMetadata(
  metadata.pluginSetup.prepareInstallation.inputs
);

/**
 * Encoding module the SDK TokenVoting Client
 */
export class OffchainVotingClientEncoding
  extends OffchainVotingClientCore
  implements IOffchainVotingClientEncoding
{
  /**
   * Computes the parameters to be given when creating the DAO,
   * so that the plugin is configured
   *
   * @param {TokenVotingPluginInstall} params
   * @param {Networkish} network
   * @return {*}  {PluginInstallItem}
   * @memberof OffchainVotingClientEncoding
   */
  static getPluginInstallItem(
    params: OffchainVotingPluginInstall,
    network: Networkish
  ): PluginInstallItem {
    const networkName = getNetwork(network).name as SupportedNetwork;
    if (!SupportedNetworksArray.includes(networkName)) {
      throw new UnsupportedNetworkError(networkName);
    }
    const args = initParamsToContract(params);
    const hexBytes = defaultAbiCoder.encode(prepareInstallationDataTypes, args);
    console.log(`network ${networkName}`);
    console.log(`repoaddress ${DEFAULT_ADDRESSES[networkName].repoAddress}`);
    return {
      id: DEFAULT_ADDRESSES[networkName].repoAddress,
      data: hexToBytes(hexBytes),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal that updates the governance configuration
   *
   * @param {string} pluginAddress
   * @param {VotingSettings} params
   * @return {*}  {DaoAction}
   * @memberof OffchainVotingClientEncoding
   */
  // public updatePluginSettingsAction(
  //   pluginAddress: string,
  //   params: VotingSettings
  // ): DaoAction {
  //   if (!isAddress(pluginAddress)) {
  //     throw new InvalidAddressError();
  //   }
  //   // TODO: check if to and value are correct
  //   return {
  //     to: pluginAddress,
  //     value: BigInt(0),
  //     data: encodeUpdateVotingSettingsAction(params),
  //   };
  // }

  /**
   * Computes the parameters to be given when creating a proposal that mints an amount of ERC-20 tokens to an address
   *
   * @param {string} minterAddress
   * @param {MintTokenParams} params
   * @return {*}  {DaoAction}
   * @memberof OffchainVotingClientEncoding
   */
  public mintTokenAction(
    minterAddress: string,
    params: MintTokenParams
  ): DaoAction {
    if (!isAddress(minterAddress) || !isAddress(params.address)) {
      throw new InvalidAddressError();
    }
    const votingInterface =
      IERC20MintableUpgradeable__factory.createInterface();
    const args = mintTokenParamsToContract(params);
    // get hex bytes
    const hexBytes = votingInterface.encodeFunctionData('mint', args);
    return {
      to: minterAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }
}
