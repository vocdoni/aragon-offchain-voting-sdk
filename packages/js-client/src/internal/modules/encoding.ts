import metadata from '../../../../contracts/src/build-metadata.json';
import {
  GaslessPluginVotingSettings,
  GaslessVotingPluginInstall,
} from '../../types';
import { DEFAULT_ADDRESSES } from '../constants';
import { GaslessVotingClientCore } from '../core';
import { IGaslessVotingClientEncoding } from '../interfaces';
import {
  mintTokenParamsToContract,
  initParamsToContract,
  gaslessVotingSettingsToContract,
} from '../utils';
import { SupportedNetworks } from '@aragon/osx-commons-configs';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import {
  AddAddressesParams,
  MintTokenParams,
  RemoveAddressesParams,
} from '@aragon/sdk-client';
import {
  DaoAction,
  getNamedTypesFromMetadata,
  PluginInstallItem,
  hexToBytes,
  InvalidAddressError,
  UnsupportedNetworkError,
} from '@aragon/sdk-client-common';
import { defaultAbiCoder } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { Networkish, getNetwork } from '@ethersproject/providers';
import { VocdoniVoting__factory } from '@vocdoni/gasless-voting-ethers';

const prepareInstallationDataTypes = getNamedTypesFromMetadata(
  metadata.pluginSetup.prepareInstallation.inputs
);

/**
 * Encoding module the SDK TokenVoting Client
 */
export class GaslessVotingClientEncoding
  extends GaslessVotingClientCore
  implements IGaslessVotingClientEncoding
{
  /**
   * Computes the parameters to be given when creating the DAO,
   * so that the plugin is configured
   *
   * @param {TokenVotingPluginInstall} params
   * @param {Networkish} network
   * @return {*}  {PluginInstallItem}
   * @memberof GaslessVotingClientEncoding
   */
  static getPluginInstallItem(
    params: GaslessVotingPluginInstall,
    network: Networkish
  ): PluginInstallItem {
    const networkName = getNetwork(network).name as SupportedNetworks;
    if (!Object.keys(DEFAULT_ADDRESSES).includes(networkName)) {
      throw new UnsupportedNetworkError(networkName);
    }
    const args = initParamsToContract(params);
    const hexBytes = defaultAbiCoder.encode(prepareInstallationDataTypes, args);
    console.log(`network ${networkName}`);
    console.log(`repoaddress ${DEFAULT_ADDRESSES[networkName].repoAddress}`);
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
   * @param {GaslessPluginVotingSettings} params
   * @return {*}  {DaoAction}
   * @memberof GaslessVotingClientEncoding
   */
  public updatePluginSettingsAction(
    pluginAddress: string,
    params: GaslessPluginVotingSettings
  ): DaoAction {
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    // TODO: check if to and value are correct
    return {
      to: pluginAddress,
      value: BigInt(0),
      data: this.encodeUpdateVotingSettingsAction(params),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal that updates the governance configuration
   *
   * @param {AddAddressesParams} params
   * @return {*}  {DaoAction[]}
   * @memberof GaslessVotingClientEncoding
   */
  public addAddressesAction(params: AddAddressesParams): DaoAction {
    if (!isAddress(params.pluginAddress)) {
      throw new InvalidAddressError();
    }
    // TODO yup validation
    for (const member of params.members) {
      if (!isAddress(member)) {
        throw new InvalidAddressError();
      }
    }
    const votingInterface = VocdoniVoting__factory.createInterface();
    // get hex bytes
    const hexBytes = votingInterface.encodeFunctionData(
      'addExecutionMultisigMembers',
      [params.members]
    );
    return {
      to: params.pluginAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }
  /**
   * Computes the parameters to be given when creating a proposal that adds addresses to address list
   *
   * @param {RemoveAddressesParams} params
   * @return {*}  {DaoAction[]}
   * @memberof GaslessVotingClientEncoding
   */
  public removeAddressesAction(params: RemoveAddressesParams): DaoAction {
    if (!isAddress(params.pluginAddress)) {
      throw new InvalidAddressError();
    }
    // TODO yup validation
    for (const member of params.members) {
      if (!isAddress(member)) {
        throw new InvalidAddressError();
      }
    }
    const votingInterface = VocdoniVoting__factory.createInterface();
    // get hex bytes
    const hexBytes = votingInterface.encodeFunctionData(
      'removeExecutionMultisigMembers',
      [params.members]
    );
    return {
      to: params.pluginAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }

  private encodeUpdateVotingSettingsAction(
    params: GaslessPluginVotingSettings
  ): Uint8Array {
    const votingInterface = VocdoniVoting__factory.createInterface();
    const args = gaslessVotingSettingsToContract(params);
    // get hex bytes
    // const expectedfunction = votingInterface.getFunction(
    //   'updatePluginSettings((bool,uint16,uint32,uint32,uint64,uint64,address,uint256,string))'
    // );
    const hexBytes = votingInterface.encodeFunctionData(
      'updatePluginSettings',
      [
        {
          onlyExecutionMultisigProposalCreation: args[0],
          minTallyApprovals: args[1],
          minParticipation: args[2],
          supportThreshold: args[3],
          minVoteDuration: args[4],
          minTallyDuration: args[5],
          daoTokenAddress: args[6],
          minProposerVotingPower: args[7],
          censusStrategyURI: args[8],
        },
      ]
    );
    // Strip 0x => encode in Uint8Array
    return hexToBytes(hexBytes);
  }

  /**
   * Computes the parameters to be given when creating a proposal that mints an amount of ERC-20 tokens to an address
   *
   * @param {string} minterAddress
   * @param {MintTokenParams} params
   * @return {*}  {DaoAction}
   * @memberof GaslessVotingClientEncoding
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
