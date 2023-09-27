// add internal utils
import {
  ContractMintTokenParams,
  GaslessVotingProposal,
  OffchainVotingPluginInstall,
  GaslessPluginVotingSettings,
  VoteOption,
  ProposalFromSC,
  GaslessProposalParametersStruct,
  InvalidResults,
  GaslessVotingProposalFromSC,
} from '../types';
import { MintTokenParams, VoteValues } from '@aragon/sdk-client';
import {
  DaoAction,
  EMPTY_PROPOSAL_METADATA_LINK,
  ProposalStatus,
} from '@aragon/sdk-client-common';
import { hexToBytes, encodeRatio, decodeRatio } from '@aragon/sdk-common';
import { Result } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { VocdoniVoting } from '@vocdoni/offchain-voting-ethers';
import { ElectionStatus, PublishedElection } from '@vocdoni/sdk';

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
  return [params.address, BigInt(params.amount)];
}

export function mintTokenParamsFromContract(result: Result): MintTokenParams {
  return {
    address: result[0],
    amount: BigInt(result[1]),
  };
}

export function createProposalVotingSettingsToContract(
  params: GaslessPluginVotingSettings
): [
  boolean,
  number,
  number,
  number,
  BigNumber,
  BigNumber,
  string,
  BigNumber,
  string
] {
  return [
    true,
    params.minTallyApprovals,
    encodeRatio(params.minParticipation, 6),
    encodeRatio(params.supportThreshold, 6),
    BigNumber.from(params.minDuration),
    BigNumber.from(0),
    '0x0000000000000000000000000000000000000000',
    BigNumber.from(params.minProposerVotingPower ?? 0),
    params.censusStrategy,
  ];
}

export function votingSettingsfromContract(
  settings: VocdoniVoting.PluginSettingsStructOutput
): GaslessPluginVotingSettings {
  return {
    onlyCommitteeProposalCreation: settings[0],
    minTallyApprovals: settings[1],
    minParticipation: decodeRatio(settings[2], 6),
    supportThreshold: decodeRatio(settings[3], 6),
    minDuration: settings[4].toNumber(),
    expirationTime: settings[5].toNumber(),
    daoTokenAddress: settings[6],
    minProposerVotingPower: settings[7].toBigInt(),
    censusStrategy: settings[8],
  };
}

export function proposalParamsfromContract(
  params: VocdoniVoting.ProposalParametersStructOutput
): GaslessProposalParametersStruct {
  return {
    censusBlock: params.censusBlock,
    securityBlock: 0,
    startDate: Number(params.startDate),
    endDate: Number(params.endDate),
    expirationDate: Number(params.expirationDate),
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
    createProposalVotingSettingsToContract(params.votingSettings),
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

// export async function advanceTime(timmmme: number) {
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
): GaslessVotingProposalFromSC {
  // const startDate = new Date(proposal.parameters.startDate.toString());
  // const endDate = new Date(proposal.parameters.endDate.toString());
  // const expirationDate = new Date(
  //   proposal.parameters.expirationDate.toString()
  // );
  return {
    executed: proposal.executed,
    // TODO FIX
    // approvers: proposal.approvals,
    approvers: [],
    vochainProposalId: proposal.vochainProposalId,
    parameters: proposalParamsfromContract(proposal.parameters),
    allowFailureMap: proposal.allowFailureMap.toNumber(),
    tally: proposal.tally.map((int) => {
      return int.map((x) => Number(x));
    }),
    actions: proposal.actions.map((action): DaoAction => {
      return {
        data: hexToBytes(action.data),
        to: action.to,
        value: action.value.toBigInt(),
      };
    }),
  };
}

function vochainVoteResultsToProposal(results: string[][]): {
  [key: string]: number;
} {
  let parsedResults: { [key: string]: number } = {};
  Object.keys(VoteValues)
    .filter((key) => isNaN(Number(key)))
    .forEach((key, i) => {
      parsedResults[key] = Number(results[i]);
    });
  return parsedResults;
}

function hasSupportThreshold(
  yes: number,
  no: number,
  supportThreshold: number
): boolean {
  return (1 - supportThreshold) * yes > supportThreshold * no;
}

function hasMinParticipation(
  yes: number,
  no: number,
  abstain: number,
  totalVotes: number,
  minParticipation: number
): boolean {
  return yes + no + abstain > minParticipation * totalVotes;
}

function isProposalApproved(
  results: string[][],
  totalVotes: number,
  supportThreshold: number,
  minParticipation: number
): boolean {
  const parsedResults = vochainVoteResultsToProposal(results);
  const calculatedTotal = Object.keys(VoteValues)
    .filter((key) => isNaN(Number(key)))
    .map((x) => parsedResults[x])
    .reduce((a, b) => a + b);
  if (calculatedTotal != totalVotes) throw new InvalidResults();

  return (
    hasSupportThreshold(
      parsedResults[VoteValues.YES.toString()],
      parsedResults[VoteValues.NO.toString()],
      supportThreshold
    ) &&
    hasMinParticipation(
      parsedResults[VoteValues.YES.toString()],
      parsedResults[VoteValues.NO.toString()],
      parsedResults[VoteValues.ABSTAIN.toString()],
      totalVotes,
      minParticipation
    )
  );
}

export function vochainStatusToProposalStatus(
  vochainProposal: PublishedElection,
  executed: boolean,
  supportThreshold: number,
  minParticipation: number
): ProposalStatus {
  //TODO probably need to check also the state of the contract
  const vochainStatus = vochainProposal.status;
  if ([ElectionStatus.UPCOMING, ElectionStatus.PAUSED].includes(vochainStatus))
    return ProposalStatus.PENDING;
  if (ElectionStatus.ONGOING === vochainStatus) return ProposalStatus.ACTIVE;
  // if ([].includes[vochainStatus])
  if (ElectionStatus.RESULTS) {
    if (executed) return ProposalStatus.EXECUTED;
    else if (vochainProposal.finalResults) {
      return isProposalApproved(
        vochainProposal.results,
        vochainProposal.voteCount,
        supportThreshold,
        minParticipation
      )
        ? ProposalStatus.SUCCEEDED
        : ProposalStatus.DEFEATED;
    } else {
      //TODO decide how to handle this cases
      return ProposalStatus.PENDING;
    }
  }
  // TODO decide how to handle this cases
  if (
    [ElectionStatus.CANCELED, ElectionStatus.PROCESS_UNKNOWN].includes(
      vochainStatus
    )
  )
    return ProposalStatus.PENDING;
  // TODO decide which is the generic one
  return ProposalStatus.PENDING;
}

export function toNewProposal(
  SCproposalID: number,
  daoName: string,
  daoAddress: string,
  settings: GaslessPluginVotingSettings,
  vochainProposal: PublishedElection,
  SCProposal: GaslessVotingProposalFromSC
): GaslessVotingProposal {
  return {
    id: `0x${SCproposalID.toString()}`, // string;
    dao: {
      address: daoAddress, //string;
      name: daoName, //string; TODO
    },
    creatorAddress: vochainProposal.organizationId, //string;
    metadata: EMPTY_PROPOSAL_METADATA_LINK, //ProposalMetadata; //TODO
    startDate: vochainProposal.startDate, //Date;
    endDate: vochainProposal.endDate, //Date;
    creationDate: vochainProposal.creationTime, //Date;
    actions: SCProposal.actions, //DaoAction[];
    status: vochainStatusToProposalStatus(
      vochainProposal,
      SCProposal.executed,
      settings.supportThreshold,
      settings.minParticipation
    ), //ProposalStatus; //TODO
    creationBlockNumber: 0, //number; //TODO
    executionDate: null, //Date | null; //TODO
    executionBlockNumber: null, //number | null; //TODO
    executionTxHash: null, //string | null;
    executed: SCProposal.executed, //boolean;
    approvers: SCProposal.approvers, //string[];
    vochainProposalId: SCProposal.vochainProposalId, //string;
    parameters: SCProposal.parameters, //GaslessProposalParametersStruct;
    allowFailureMap: SCProposal.allowFailureMap, //number;
    tally: SCProposal.tally, //number[][];
    settings,
    vochainMetadata: vochainProposal,
    tallyVochain: vochainProposal.results.map((x) => x.map((y) => Number(y))),
    tallyVochainFinal: vochainProposal.finalResults,
  } as GaslessVotingProposal;
}
