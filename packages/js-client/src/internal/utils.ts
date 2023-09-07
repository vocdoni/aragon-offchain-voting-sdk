// add internal utils
import {
  ContractMintTokenParams,
  OffchainVotingPluginInstall,
  VocdoniVotingSettings,
  VoteOption,
} from "./types";
import {
  MintTokenParams,
} from "@aragon/sdk-client";
import { Result } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// export function votingModeFromContracts(votingMode: number): VotingMode {
//   switch (votingMode) {
//     case 0:
//       return VotingMode.STANDARD;
//     case 1:
//       return VotingMode.EARLY_EXECUTION;
//     case 2:
//       return VotingMode.VOTE_REPLACEMENT;
//     default:
//       throw new InvalidVotingModeError();
//   }
// }

export function mintTokenParamsToContract(
  params: MintTokenParams,
): ContractMintTokenParams {
  return [params.address, BigNumber.from(params.amount)];
}

export function mintTokenParamsFromContract(result: Result): MintTokenParams {
  return {
    address: result[0],
    amount: BigInt(result[1]),
  };
}

export function votingSettingsToContract(
  params: VocdoniVotingSettings,
): [boolean, number, number, BigNumber, BigNumber, string, number, string] {
  return [
    params.onlyCommitteeProposalCreation,
    params.minTallyApprovals,
    params.minDuration,
    params.minParticipation,
    params.supportThreshold,
    params.daoTokenAddress,
    params.minProposerVotingPower,
    params.censusStrategy,
  ];
}

export function initParamsToContract(
  params: OffchainVotingPluginInstall,
) {
  let token: [string, string, string] = ["", "", ""];
  let balances: [string[], BigNumber[]] = [[], []];
  if (params.newToken) {
    token = [AddressZero, params.newToken.name, params.newToken.symbol];
    balances = [
      params.newToken.balances.map((balance) => balance.address),
      params.newToken.balances.map(({ balance }) => BigNumber.from(balance)),
    ];
  } else if (params.useToken) {
    token = [
      params.useToken?.tokenAddress,
      params.useToken.wrappedToken.name,
      params.useToken.wrappedToken.symbol,
    ];
  }
  return [
    params.committee,
    votingSettingsToContract(params.votingSettings),
    token,
    balances,
  ];
}

export const MAX_UINT64 = BigNumber.from(2).pow(64).sub(1);

export async function voteWithSigners(
  votingContract: Contract,
  proposalId: number,
  signers: SignerWithAddress[],
  signerIds: {
    yes: number[];
    no: number[];
    abstain: number[];
  },
) {
  let promises = signerIds.yes.map((i) =>
    votingContract.connect(signers[i]).vote(proposalId, VoteOption.Yes, false)
  );

  promises = promises.concat(
    signerIds.no.map((i) =>
      votingContract.connect(signers[i]).vote(proposalId, VoteOption.No, false)
    ),
  );
  promises = promises.concat(
    signerIds.abstain.map((i) =>
      votingContract
        .connect(signers[i])
        .vote(proposalId, VoteOption.Abstain, false)
    ),
  );

  await Promise.all(promises);
}

// export async function getTime(): Promise<number> {
//   const provider = this.web3.getProvider();
//   return (await provider.getBlock('latest')).timestamp;
// }

// export async function advanceTime(time: number) {
//   const provider = this.web3.getProvider();
//   await provider.send('evm_increaseTime', [time]);
//   await provider.send('evm_mine', []);
// }

// export async function advanceTimeTo(timestamp: number) {
//   const delta = timestamp - (await getTime());
//   await advanceTime(delta);
// }

// export async function timestampIn(durationInSec: number): Promise<number> {
//   const provider = this.web3.getProvider();
//   return (await provider.getBlock('latest')).timestamp + durationInSec;
// }

// export async function setTimeForNextBlock(timestamp: number): Promise<void> {
//   const provider = this.web3.getProvider();
//   await provider.send('evm_setNextBlockTimestamp', [timestamp]);
// }

// export function toBytes32(num: number): string {
//   const hex = num.toString(16);
//   return `0x${'0'.repeat(64 - hex.length)}${hex}`;
// }
