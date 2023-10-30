import { GaslessPluginVotingSettings } from '../../types';
import { AVAILABLE_FUNCTION_SIGNATURES } from '../constants';
import { GaslessVotingClientCore } from '../core';
import { IGaslessVotingClientDecoding } from '../interfaces';
import {
  mintTokenParamsFromContract,
  votingSettingsfromContract,
} from '../utils';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import { MintTokenParams } from '@aragon/sdk-client';
import {
  InterfaceParams,
  getFunctionFragment,
} from '@aragon/sdk-client-common';
import { bytesToHex } from '@aragon/sdk-common';
import {
  VocdoniVoting,
  VocdoniVoting__factory,
} from '@vocdoni/gasless-voting-ethers';

export class GaslessVotingClientDecoding
  extends GaslessVotingClientCore
  implements IGaslessVotingClientDecoding
{
  // add your action decoders here
  /**
   * Decodes a dao metadata from an encoded update metadata action
   *
   * @param {Uint8Array} data
   * @return {*}  {VotingSettings}
   * @memberof GaslessVotingClientDecoding
   */
  public updatePluginSettingsAction(
    data: Uint8Array
  ): GaslessPluginVotingSettings {
    return this.decodeUpdatePluginSettingsAction(data);
  }

  private decodeUpdatePluginSettingsAction(
    data: Uint8Array
  ): GaslessPluginVotingSettings {
    const votingInterface = VocdoniVoting__factory.createInterface();
    const hexBytes = bytesToHex(data);
    const expectedfunction = votingInterface.getFunction(
      'updatePluginSettings'
    );
    const result = votingInterface.decodeFunctionData(
      expectedfunction,
      hexBytes
    ) as VocdoniVoting.PluginSettingsStructOutput;

    return votingSettingsfromContract(result);
  }

  /**
   * Decodes the mint token params from an encoded mint token action
   *
   * @param {Uint8Array} data
   * @return {*}  {MintTokenParams}
   * @memberof GaslessVotingClientDecoding
   */
  public mintTokenAction(data: Uint8Array): MintTokenParams {
    const votingInterface =
      IERC20MintableUpgradeable__factory.createInterface();
    const hexBytes = bytesToHex(data);
    const expectedfunction = votingInterface.getFunction('mint');
    const result = votingInterface.decodeFunctionData(
      expectedfunction,
      hexBytes
    );
    return mintTokenParamsFromContract(result);
  }

  /**
   * Returns the decoded function info given the encoded data of an action
   *
   * @param {Uint8Array} data
   * @return {*}  {(InterfaceParams | null)}
   * @memberof GaslessVotingClientDecoding
   */
  public findInterface(data: Uint8Array): InterfaceParams | null {
    try {
      const func = getFunctionFragment(data, AVAILABLE_FUNCTION_SIGNATURES);
      return {
        id: func.format('minimal'),
        functionName: func.name,
        hash: bytesToHex(data).substring(0, 10),
      };
    } catch {
      return null;
    }
  }
}
