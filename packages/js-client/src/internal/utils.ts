// add internal utils
import {
  ContractMintTokenParams,
  GasslessVotingProposal,
  OffchainVotingPluginInstall,
  VocdoniVotingSettings,
  VoteOption,
  ProposalFromSC,
} from '../types';
import { MintTokenParams, SubgraphAction } from '@aragon/sdk-client';
import { DaoAction } from '@aragon/sdk-client-common';
import { hexToBytes } from '@aragon/sdk-common';
import { Result } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { VocdoniVoting } from '@vocdoni/offchain-voting-ethers';

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
  params: MintTokenParams
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
  params: VocdoniVotingSettings
): [boolean, number, number, number, BigNumber, string, BigNumber, string] {
  return [
    true,
    params.minTallyApprovals,
    params.minParticipation,
    params.supportThreshold,
    params.minDuration,
    '',
    params.minProposerVotingPower,
    params.censusStrategy,
  ];
}

export function votingSettingsfromContract(
  settings: VocdoniVoting.PluginSettingsStructOutput
): VocdoniVotingSettings {
  return {
    onlyCommitteeProposalCreation: settings[0],
    minTallyApprovals: settings[1],
    minParticipation: settings[2],
    supportThreshold: settings[3],
    minDuration: settings[4],
    daoTokenAddress: settings[5],
    minProposerVotingPower: settings[6],
    censusStrategy: settings[7],
  };
}

export function initParamsToContract(params: OffchainVotingPluginInstall) {
  let token: [string, string, string] = ['', '', ''];
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
  }
) {
  let promises = signerIds.yes.map((i) =>
    votingContract.connect(signers[i]).vote(proposalId, VoteOption.Yes, false)
  );

  promises = promises.concat(
    signerIds.no.map((i) =>
      votingContract.connect(signers[i]).vote(proposalId, VoteOption.No, false)
    )
  );
  promises = promises.concat(
    signerIds.abstain.map((i) =>
      votingContract
        .connect(signers[i])
        .vote(proposalId, VoteOption.Abstain, false)
    )
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

export function toGaslessVotingProposal(
  proposal: ProposalFromSC
): GasslessVotingProposal {
  proposal.parameters.startDate;
  const startDate = new Date(proposal.parameters.startDate.toString());
  const endDate = new Date(proposal.parameters.endDate.toString());
  const expirationDate = new Date(
    proposal.parameters.expirationDate.toString()
  );
  return {
    executed: proposal.executed,
    // TODO FIX
    // approvers: proposal.approvals,
    approvers: [],
    vochainProposalId: proposal.vochainProposalId,
    parameters: {
      censusBlock: proposal.parameters.censusBlock.toNumber(),
      securityBlock: 0,
      startDate,
      endDate,
      expirationDate,
    },
    allowFailureMap: proposal.allowFailureMap.toNumber(),
    tally: proposal.tally.map((int) => {
      return int.map((x) => x.toNumber());
    }),
    actions: proposal.actions.map((action): DaoAction => {
      return {
        data: hexToBytes(action.data),
        to: action.to,
        value: BigInt(action.value.toBigInt()),
      };
    }),
  };
}
// let usedVotingWeight: bigint = BigInt(0);
// for (const voter of proposal.voters) {
//   usedVotingWeight += BigInt(voter.votingPower);
// }
// const token = parseToken(proposal.plugin.token);
// return {
//   id: getCompactProposalId(proposal.id),
//   dao: {
//     address: proposal.dao.id,
//     name: proposal.dao.subdomain,
//   },
//   creatorAddress: proposal.creator,
//   metadata: {
//     title: metadata.title,
//     summary: metadata.summary,
//     description: metadata.description,
//     resources: metadata.resources,
//     media: metadata.media,
//   },
//   startDate,
//   endDate,
//   creationDate,
//   creationBlockNumber: parseInt(proposal.creationBlockNumber),
//   executionDate,
//   executionBlockNumber: parseInt(proposal.executionBlockNumber) || null,
//   executionTxHash: proposal.executionTxHash || null,
//   actions: proposal.actions.map(
//     (action: SubgraphAction): DaoAction => {
//       return {
//         data: hexToBytes(action.data),
//         to: action.to,
//         value: BigInt(action.value),
//       };
//     },
//   ),
//   status: computeProposalStatus(proposal),
//   result: {
//     yes: proposal.yes ? BigInt(proposal.yes) : BigInt(0),
//     no: proposal.no ? BigInt(proposal.no) : BigInt(0),
//     abstain: proposal.abstain ? BigInt(proposal.abstain) : BigInt(0),
//   },
//   settings: {
//     supportThreshold: decodeRatio(BigInt(proposal.supportThreshold), 6),
//     duration: parseInt(proposal.endDate) -
//       parseInt(proposal.startDate),
//     minParticipation: decodeRatio(
//       (BigInt(proposal.minVotingPower) * BigInt(1000000)) /
//         BigInt(proposal.totalVotingPower),
//       6,
//     ),
//   },
//   token,
//   usedVotingWeight,
//   totalVotingWeight: BigInt(proposal.totalVotingPower),
//   votes: proposal.voters.map(
//     (voter: SubgraphTokenVotingVoterListItem) => {
//       return {
//         voteReplaced: voter.voteReplaced,
//         address: voter.voter.address,
//         vote: SubgraphVoteValuesMap.get(voter.voteOption) as VoteValues,
//         weight: BigInt(voter.votingPower),
//       };
//     },
//   ),
// };
