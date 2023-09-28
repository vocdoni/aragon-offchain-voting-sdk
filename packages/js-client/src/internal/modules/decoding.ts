import { AVAILABLE_FUNCTION_SIGNATURES } from '../constants';
import { OffchainVotingClientCore } from '../core';
import { IOffchainVotingClientDecoding } from '../interfaces';
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
