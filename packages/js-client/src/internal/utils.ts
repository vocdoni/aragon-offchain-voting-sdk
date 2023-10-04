// add internal utils
import {
  ContractMintTokenParams,
  GaslessVotingProposal,
  OffchainVotingPluginInstall,
  GaslessPluginVotingSettings,
  VoteOption,
  ProposalFromSC,
  GaslessProposalParametersStruct,
  GaslessVotingProposalFromSC,
} from '../types';
import {
  MintTokenParams,
  TokenVotingProposalResult,
  VoteValues,
} from '@aragon/sdk-client';
import {
  DaoAction,
  EMPTY_PROPOSAL_METADATA_LINK,
  ProposalStatus,
} from '@aragon/sdk-client-common';
import { hexToBytes, encodeRatio, decodeRatio } from '@aragon/sdk-common';
import { Result } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { VocdoniVoting } from '@vocdoni/offchain-voting-ethers';
import {
  ElectionStatus,
  IChoice,
  IQuestion,
  PublishedElection,
  Token,
} from '@vocdoni/sdk';
import Big from 'big.js';
import { formatUnits as ethersFormatUnits } from 'ethers/lib/utils';

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

/**
 * Creates an array of proposal voting settings to be sent to the contract.
 * @param params - The gasless plugin voting settings.
 * @returns An array of the following values:
 * - A boolean indicating whether voting is enabled.
 * - The minimum number of approvals required for a proposal to pass.
 * - The minimum participation ratio required for a proposal to pass.
 * - The support threshold ratio required for a proposal to pass.
 * - The minimum duration for a proposal to be open for voting.
 * - The expiration time for a proposal in milliseconds.
 * - The address of the voting strategy contract.
 * - The minimum voting power required for a proposer to create a proposal.
 * - The census strategy used for the proposal.
 */
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
    BigNumber.from(params.minDuration * 1000),
    BigNumber.from(params.expirationTime * 1000), //convert to milliseconds
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
    startDate: Number(params.startDate) * 1000,
    endDate: Number(params.endDate) * 1000,
    expirationDate: Number(params.expirationDate) * 1000,
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

export function vochainVoteResultsToProposal(
  questions: IQuestion[]
): TokenVotingProposalResult {
  let parsedResults: { [key: string]: bigint } = {};
  questions[0].choices.map((choice: IChoice) => {
    if (VoteValues[choice.title.default.toUpperCase() as any] !== undefined) {
      parsedResults[choice.title.default.toLowerCase()] =
        choice.results !== undefined ? BigInt(choice.results) : BigInt(0);
    }
  });
  return parsedResults as TokenVotingProposalResult;
}

export function canProposalBeApproved(
  results: TokenVotingProposalResult,
  supportThreshold: number | undefined,
  missingParticipation: number | undefined,
  totalVotingWeight: bigint,
  usedVotingWeight: bigint,
  tokenDecimals: number
): boolean {
  if (
    missingParticipation === undefined ||
    supportThreshold === undefined || // early execution disabled
    !results // no mapped data
  ) {
    return false;
  }

  // those who didn't vote (this is NOT voting abstain)
  const absentee = formatUnits(
    totalVotingWeight - usedVotingWeight,
    tokenDecimals
  );

  if (results.yes === BigInt(0)) return false;

  return (
    // participation reached
    missingParticipation === 0 &&
    // support threshold met even if absentees show up and all vote against, still cannot change outcome
    results.yes / (results.yes + results.no + BigInt(absentee)) >
      supportThreshold
  );
}

export function vochainStatusToProposalStatus(
  vochainStatus: ElectionStatus,
  finalResults: boolean,
  executed: boolean,
  canProposalBeApproved: boolean
): ProposalStatus {
  //TODO probably need to check also the state of the contract
  if ([ElectionStatus.UPCOMING, ElectionStatus.PAUSED].includes(vochainStatus))
    return ProposalStatus.PENDING;
  if (ElectionStatus.ONGOING === vochainStatus) return ProposalStatus.ACTIVE;
  // if ([].includes[vochainStatus])
  if (ElectionStatus.RESULTS) {
    if (executed) return ProposalStatus.EXECUTED;
    else if (finalResults) {
      return canProposalBeApproved
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
  SCProposal: GaslessVotingProposalFromSC,
  census3Token: Token
): GaslessVotingProposal {
  let metadata = EMPTY_PROPOSAL_METADATA_LINK;
  metadata.title = vochainProposal.title.default;
  metadata.description =
    vochainProposal.description?.default || metadata.description;
  const result = vochainVoteResultsToProposal(vochainProposal.questions);
  const participation = getErc20VotingParticipation(
    settings.minParticipation,
    result.abstain + result.no + result.yes,
    vochainProposal.census.weight as bigint,
    census3Token.decimals
  );
  const totalUsedWeight = result.abstain + result.no + result.yes;
  const canBeApproved = canProposalBeApproved(
    result,
    settings.supportThreshold,
    participation.minPart,
    vochainProposal.census.weight || BigInt(0),
    totalUsedWeight,
    census3Token.decimals
  );
  return {
    id: `0x${SCproposalID.toString()}`, // string;
    dao: {
      address: daoAddress, //string;
      name: daoName, //string; TODO
    },
    creatorAddress: vochainProposal.organizationId, //string;
    metadata: {
      title: vochainProposal.title.default,
      description: vochainProposal.description?.default || '',
      summary: vochainProposal.questions[0].title.default,
    }, //ProposalMetadata; //TODO
    startDate: vochainProposal.startDate, //Date;
    endDate: vochainProposal.endDate, //Date;
    creationDate: vochainProposal.creationTime, //Date;
    actions: SCProposal.actions, //DaoAction[];
    status: vochainStatusToProposalStatus(
      vochainProposal.status,
      vochainProposal.finalResults,
      SCProposal.executed,
      canBeApproved
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
    vochain: {
      metadata: vochainProposal,
      tally: {
        final: vochainProposal.finalResults,
        value: vochainProposal.results[0].map((y) => BigInt(y)),
        parsed: result,
      },
    },
    totalVotingWeight: vochainProposal.census.weight,
    totalUsedWeight,
    participation: {
      currentParticipation: participation.currentPart,
      currentPercentage: participation.currentPercentage,
      missingParticipation: participation.missingPart,
    },
    canBeApproved,
  } as GaslessVotingProposal;
}

/*    TOKEN     */
/**
 * Get formatted minimum participation for an ERC20 proposal
 * @param minParticipation minimum number of tokens needed to participate in vote
 * @param totalVotingWeight total number of tokens able to vote
 * @param tokenDecimals proposal token decimals
 * @returns
 */
function getErc20MinParticipation(
  minParticipation: number,
  totalVotingWeight: bigint,
  tokenDecimals: number
) {
  return Big(formatUnits(totalVotingWeight, tokenDecimals))
    .mul(minParticipation)
    .toNumber();
}

function getErc20VotingParticipation(
  minParticipation: number,
  usedVotingWeight: bigint,
  totalVotingWeight: bigint,
  tokenDecimals: number
) {
  // calculate participation summary
  const totalWeight = Number(formatUnits(totalVotingWeight, tokenDecimals));

  // current participation
  const currentPart = Number(formatUnits(usedVotingWeight, tokenDecimals));

  const currentPercentage = Big(usedVotingWeight.toString())
    .mul(100)
    .div(totalVotingWeight.toString())
    .toNumber();

  // minimum participation
  const minPart = getErc20MinParticipation(
    minParticipation,
    totalVotingWeight,
    tokenDecimals
  );

  // missing participation
  const missingRaw = Big(formatUnits(usedVotingWeight, tokenDecimals))
    .minus(
      Big(formatUnits(totalVotingWeight, tokenDecimals)).mul(minParticipation)
    )
    .toNumber();

  let missingPart;

  if (Math.sign(missingRaw) === 1) {
    // number of votes greater than required minimum participation
    missingPart = 0;
  } else missingPart = Math.abs(missingRaw);
  // const missingPart = Math.sign(Number(missingRaw)) === 1 ? Math.abs(Number(missingRaw));

  return { currentPart, currentPercentage, minPart, missingPart, totalWeight };
}

function formatUnits(amount: BigNumberish, decimals: number) {
  if (amount.toString().includes('.') || !decimals) {
    return amount.toString();
  }
  return ethersFormatUnits(amount, decimals);
}
