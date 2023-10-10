import { AVAILABLE_FUNCTION_SIGNATURES } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientDecoding } from '../interfaces';
import { mintTokenParamsFromContract } from '../utils';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import { MintTokenParams } from '@aragon/sdk-client';
import {
  InterfaceParams,
  getFunctionFragment,
} from '@aragon/sdk-client-common';
import { bytesToHex } from '@aragon/sdk-common';

export class OffchainVotingClientDecoding
  extends OffchainVotingClientCore
  implements IOffchainVotingClientDecoding
{
  // add your action decoders here
  /**
   * Decodes a dao metadata from an encoded update metadata action
   *
   * @param {Uint8Array} data
   * @return {*}  {VotingSettings}
   * @memberof OffchainVotingClientDecoding
   */
  // public updatePluginSettingsAction(data: Uint8Array): VotingSettings {
  //   return decodeUpdatePluginSettingsAction(data);
  // }

  /**
   * Decodes the mint token params from an encoded mint token action
   *
   * @param {Uint8Array} data
   * @return {*}  {MintTokenParams}
   * @memberof OffchainVotingClientDecoding
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
   * @memberof OffchainVotingClientDecoding
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
