import metadata from '../../../../contracts/src/build-metadata.json';
import { DEFAULT_ADDRESSES } from '../constants';
import { ITokenVotingClientEncoding } from '../interfaces';
import { OffchainVotingPluginInstall } from '../../types';
import { mintTokenParamsToContract, initParamsToContract } from '../utils';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import {
  MintTokenParams,
  encodeUpdateVotingSettingsAction,
  VotingSettings,
} from '@aragon/sdk-client';
import {
  ClientCore,
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
  extends ClientCore
  implements ITokenVotingClientEncoding
{
  /**
   * Computes the parameters to be given when creating the DAO,
   * so that the plugin is configured
   *
   * @param {TokenVotingPluginInstall} params
   * @param {Networkish} network
   * @return {*}  {PluginInstallItem}
   * @memberof TokenVotingClientEncoding
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
   * @memberof TokenVotingClientEncoding
   */
  public updatePluginSettingsAction(
    pluginAddress: string,
    params: VotingSettings
  ): DaoAction {
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    // TODO: check if to and value are correct
    return {
      to: pluginAddress,
      value: BigInt(0),
      data: encodeUpdateVotingSettingsAction(params),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal that mints an amount of ERC-20 tokens to an address
   *
   * @param {string} minterAddress
   * @param {MintTokenParams} params
   * @return {*}  {DaoAction}
   * @memberof TokenVotingClientEncoding
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
