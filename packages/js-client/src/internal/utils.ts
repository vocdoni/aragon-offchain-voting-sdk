// add internal utils
import {
  ContractMintTokenParams,
  GaslessVotingProposal,
  GaslessVotingPluginInstall,
  GaslessPluginVotingSettings,
  ProposalFromSC,
  GaslessProposalParametersStruct,
  GaslessVotingProposalFromSC,
  SCVoteValues,
  SubgraphVotingMember,
} from '../types';
import {
  MintTokenParams,
  TokenVotingProposalResult,
  VoteValues,
  TokenVotingMember,
} from '@aragon/sdk-client';
import {
  DaoAction,
  EMPTY_PROPOSAL_METADATA_LINK,
  ProposalStatus,
  hexToBytes,
  encodeRatio,
  decodeRatio,
} from '@aragon/sdk-client-common';
import { Result } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { VocdoniVoting } from '@vocdoni/gasless-voting-ethers';
import { IChoice, IQuestion, PublishedElection, Token } from '@vocdoni/sdk';
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
export function gaslessVotingSettingsToContract(
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
    params.onlyExecutionMultisigProposalCreation || false,
    params.minTallyApprovals,
    encodeRatio(params.minParticipation, 6),
    encodeRatio(params.supportThreshold, 6),
    BigNumber.from(params.minDuration),
    BigNumber.from(params.minTallyDuration),
    '0x0000000000000000000000000000000000000000',
    BigNumber.from(params.minProposerVotingPower ?? 0),
    params.censusStrategy,
  ];
}

export function votingSettingsfromContract(
  settings: VocdoniVoting.PluginSettingsStructOutput
): GaslessPluginVotingSettings {
  return {
    onlyExecutionMultisigProposalCreation: settings[0],
    minTallyApprovals: settings[1],
    minParticipation: decodeRatio(settings[2], 6),
    supportThreshold: decodeRatio(settings[3], 6),
    minDuration: settings[4].toNumber(),
    minTallyDuration: settings[5].toNumber(),
    daoTokenAddress: settings[6],
    minProposerVotingPower: settings[7].toBigInt(),
    censusStrategy: settings[8],
  };
}

// export function fromSubgraphToVotingSettings(
//   settings: GaslessPluginVotingSettings
// ): GaslessPluginVotingSettings {
//   return {
//     onlyExecutionMultisigProposalCreation:
//       settings.onlyExecutionMultisigProposalCreation,
//     minTallyApprovals: settings.minTallyApprovals,
//     minParticipation: decodeRatio(settings.minParticipation, 6),
//     supportThreshold: decodeRatio(settings.supportThreshold, 6),
//     minDuration: settings.minDuration,
//     minTallyDuration: settings.minTallyDuration,
//     daoTokenAddress: settings.daoTokenAddress,
//     minProposerVotingPower: settings.minProposerVotingPower,
//     censusStrategy: settings.censusStrategy,
//   };
// }

export function proposalParamsfromContract(
  params: VocdoniVoting.ProposalParametersStructOutput
): GaslessProposalParametersStruct {
  return {
    securityBlock: params.securityBlock.toNumber(),
    startDate: new Date(Number(params.startDate) * 1000),
    endDate: new Date(Number(params.voteEndDate) * 1000),
    tallyEndDate: new Date(Number(params.tallyEndDate) * 1000),
    totalVotingPower: params.totalVotingPower.toBigInt(),
    censusURI: params.censusURI,
    censusRoot: params.censusRoot,
  };
}

export function initParamsToContract(params: GaslessVotingPluginInstall) {
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
    params.multisig,
    gaslessVotingSettingsToContract(params.votingSettings),
    token,
    balances,
  ];
}

export function toGaslessVotingProposal(
  proposal: ProposalFromSC
): GaslessVotingProposalFromSC {
  return {
    executed: proposal.executed,
    approvers: proposal.approvers,
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

export function hasProposalSucceeded(
  results: TokenVotingProposalResult,
  supportThreshold: number | undefined,
  missingParticipation: number | undefined,
  totalVotingWeight: bigint,
  usedVotingWeight: bigint
  // tokenDecimals: number
): boolean {
  if (
    missingParticipation === undefined ||
    supportThreshold === undefined || // early execution disabled
    !results // no mapped data
  ) {
    return false;
  }

  // those who didn't vote (this is NOT voting abstain)
  // const absentee = formatUnits(
  //   totalVotingWeight - usedVotingWeight,
  //   tokenDecimals
  // );

  if (results.yes === BigInt(0)) return false;
  Big.DP = 2;
  return (
    // participation reached
    missingParticipation === 0 &&
    // support threshold met even if absentees show up and all vote against, still cannot change outcome
    Big(results.yes.toString())
      .div(
        Big(
          BigInt(
            results.yes + results.no + totalVotingWeight - usedVotingWeight
          ).toString()
        )
      )
      .gte(supportThreshold)
    // (results.yes + results.no + (totalVotingWeight - usedVotingWeight)) >
    // supportThreshold
  );
}

export function computeProposalStatus(
  executed: boolean,
  hasSucceeded: boolean,
  startDate: Date,
  endDate: Date
): ProposalStatus {
  const now = new Date();
  if (startDate >= now) {
    return ProposalStatus.PENDING;
  }
  if (endDate >= now) {
    return ProposalStatus.ACTIVE;
  }
  if (executed) {
    return ProposalStatus.EXECUTED;
  }
  if (hasSucceeded) {
    return ProposalStatus.SUCCEEDED;
  }
  return ProposalStatus.DEFEATED;
}

export function toNewProposal(
  SCproposalID: string,
  settings: GaslessPluginVotingSettings,
  vochainProposal: PublishedElection,
  SCProposal: GaslessVotingProposalFromSC,
  census3Token: Token,
  voters: string[],
  daoName = '',
  daoAddress = ''
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
  const hasSucceeded = hasProposalSucceeded(
    result,
    settings.supportThreshold,
    participation.missingPart,
    vochainProposal.census.weight || BigInt(0),
    totalUsedWeight
    // census3Token.decimals
  );
  const startDate = SCProposal.parameters.startDate as Date;
  const endDate = new Date(SCProposal.parameters.endDate);

  return {
    id: SCproposalID, // string;
    dao: {
      address: daoAddress, //string;
      name: daoName, //string; TODO
    },
    token: {
      address: census3Token.ID,
      name: census3Token.name,
      symbol: census3Token.symbol,
      decimals: census3Token.decimals,
      type: census3Token.type,
    },
    creatorAddress: vochainProposal.organizationId, //string;
    metadata: {
      title: vochainProposal.title.default,
      description: vochainProposal.description?.default || '',
      summary: vochainProposal.questions[0].title.default,
    }, //ProposalMetadata;
    startDate, //Date;
    endDate, //Date;
    creationDate: vochainProposal.creationTime, //Date;
    tallyEndDate: new Date(SCProposal.parameters.tallyEndDate as Date),
    actions: SCProposal.actions, //DaoAction[];
    status: computeProposalStatus(
      SCProposal.executed,
      hasSucceeded,
      startDate,
      endDate
    ),
    creationBlockNumber: SCProposal.parameters?.securityBlock || 0, //number; //TODO
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
    voters,
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

export function vochainResultsToSCResults(
  proposal: PublishedElection
): bigint[][] {
  let results: bigint[][] = [[BigInt(0), BigInt(0), BigInt(0)]];
  const appResults = vochainVoteResultsToProposal(proposal.questions);
  Object.keys(SCVoteValues)
    .filter((key) => isNaN(Number(key)))
    .map((value, index) => {
      results[0][index] = appResults[value as keyof TokenVotingProposalResult];
    });
  return results;
}

export function toTokenVotingMember(
  member: SubgraphVotingMember
): TokenVotingMember {
  return {
    address: member.address,
    votingPower: BigInt(member.votingPower),
    balance: BigInt(member.balance),
    delegatee:
      member.delegatee?.address === member.address || !member.delegatee
        ? null
        : member.delegatee.address,
    delegators: member.delegators
      .filter((delegator) => delegator.address !== member.address)
      .map((delegator) => {
        return {
          address: delegator.address,
          balance: BigInt(delegator.balance),
        };
      }),
  };
}
