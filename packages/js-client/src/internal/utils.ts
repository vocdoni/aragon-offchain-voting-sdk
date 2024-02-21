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
  GaslessVotingProposalSubgraph,
  GaslessVotingProposalListItem,
  ProposalParametersStructOutput,
} from '../types';
import {
  MintTokenParams,
  TokenVotingProposalResult,
  VoteValues,
  TokenVotingMember,
  SubgraphAction,
  Erc20TokenDetails,
  Erc721TokenDetails,
} from '@aragon/sdk-client';
import {
  DaoAction,
  EMPTY_PROPOSAL_METADATA_LINK,
  ProposalStatus,
  hexToBytes,
  encodeRatio,
  decodeRatio,
  ProposalMetadataSummary,
} from '@aragon/sdk-client-common';
import { Result } from '@ethersproject/abi';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { VocdoniVoting } from '@vocdoni/gasless-voting-ethers';
import { IChoice, IQuestion, PublishedElection, Token } from '@vocdoni/sdk';
import Big from 'big.js';
import { formatUnits as ethersFormatUnits } from 'ethers/lib/utils';

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
    params.daoTokenAddress || '0x0000000000000000000000000000000000000000',
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

export function proposalParamsfromContract(
  params: ProposalParametersStructOutput
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

export function parseSubgraphProposal(proposal: GaslessVotingProposalSubgraph) {
  return {
    ...proposal,
    tally: subgraphVoteResultsToProposal(proposal.tallySubgraph),
    startDate: dateFromSC(proposal.startDate),
    endDate: dateFromSC(proposal.endDate),
    tallyEndDate: dateFromSC(proposal.tallyEndDate),
    creationDate: dateFromSC(proposal.creationDate),
    executionDate: proposal.executionDate
      ? dateFromSC(proposal.executionDate)
      : null,
    executionBlockNumber: Number(proposal.executionBlockNumber),
    creationBlockNumber: Number(proposal.creationBlockNumber),
    actions: proposal.actionsSubgraph?.map(
      (action: SubgraphAction): DaoAction => {
        return {
          data: hexToBytes(action.data),
          to: action.to,
          value: BigInt(action.value),
        };
      }
    ),
  };
}

export function toGaslessVotingProposalListItem(
  inproposal: GaslessVotingProposalSubgraph & { census: any },
  token: Erc20TokenDetails | Erc721TokenDetails | null,
  settings: GaslessPluginVotingSettings
): GaslessVotingProposalListItem {
  const proposal = parseSubgraphProposal(
    inproposal as GaslessVotingProposalSubgraph
  );

  let result = inproposal.tally as TokenVotingProposalResult;
  const participation = getErc20VotingParticipation(
    settings.minParticipation,
    result.abstain + result.no + result.yes,
    inproposal.census.weight as bigint,
    (token as Erc20TokenDetails)?.decimals
  );
  const hasSucceeded = hasProposalSucceeded(
    result,
    settings.supportThreshold,
    participation.missingPart
  );
  const approved = proposal.approvers.length >= settings.minTallyApprovals;
  return {
    id: proposal.id,
    creatorAddress: proposal.creatorAddress,
    startDate: proposal.startDate,
    endDate: proposal.endDate,
    tallyEndDate: proposal.tallyEndDate,
    dao: {
      address: proposal.dao.address,
      name: '',
    },
    metadata: {
      title: proposal.metadata.title,
      summary: proposal.metadata.summary,
    } as ProposalMetadataSummary,
    actions: proposal.actions,
    token,
    settings,
    status: computeProposalStatus(
      proposal.executed,
      approved,
      proposal.startDate as Date,
      proposal.endDate as Date,
      proposal.tallyEndDate as Date,
      hasSucceeded
    ),
    result: inproposal.tally,
  } as GaslessVotingProposalListItem;
}

export function subgraphVoteResultsToProposal(
  tally: number[] | undefined
): TokenVotingProposalResult {
  let parsedResults = {
    yes: BigInt(0),
    no: BigInt(0),
    abstain: BigInt(0),
  };
  if (!tally || !tally.length)
    return parsedResults as TokenVotingProposalResult;
  let parsedTally = Object.values(tally[0]);
  parsedResults.yes = BigInt(parsedTally[0][0]);
  parsedResults.no = BigInt(parsedTally[0][1]);
  parsedResults.abstain = BigInt(parsedTally[0][2]);
  return parsedResults as TokenVotingProposalResult;
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
  missingParticipation: number | undefined
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
    Big(1 - supportThreshold)
      .mul(Big(results.yes.toString()))
      .gte(Big(supportThreshold).mul(results.no.toString()))
  );
}

export function computeProposalStatus(
  executed: boolean,
  approved: boolean,
  startDate: Date,
  endDate: Date,
  tallyEndDate: Date,
  hasSucceeded: boolean
): ProposalStatus {
  const now = new Date();
  if (startDate >= now) {
    return ProposalStatus.PENDING;
  }
  if (executed) {
    return ProposalStatus.EXECUTED;
  }

  if (endDate >= now) {
    return ProposalStatus.ACTIVE;
  }

  if (tallyEndDate >= now && hasSucceeded) {
    if (approved) return ProposalStatus.SUCCEEDED;
    return ProposalStatus.ACTIVE;
  }

  return ProposalStatus.DEFEATED;
}

export function dateFromSC(date: any): Date {
  return new Date(Number(date) * 1000);
}

export function toNewProposal(
  proposal: GaslessVotingProposalSubgraph,
  settings: GaslessPluginVotingSettings,
  vochainProposal: PublishedElection,
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
    participation.missingPart
  );
  // const startDate = SCProposal.parameters.startDate as Date;
  // const endDate = new Date(SCProposal.parameters.endDate);
  // const tallyEndDate  =  SCProposal.parameters.tallyEndDate as Date;
  const approved = proposal.approvers.length >= settings.minTallyApprovals;

  return {
    ...proposal,
    // id: SCproposalID, // string;
    dao: {
      address: daoAddress, //string;
      name: daoName, //string; TODO
    },
    token: {
      address: census3Token.ID.toLowerCase(),
      name: census3Token.name,
      symbol: census3Token.symbol,
      decimals: census3Token.decimals,
      type: census3Token.type,
    },
    metadata: {
      title: vochainProposal.title.default,
      description: vochainProposal.description?.default || '',
      summary: vochainProposal.questions[0].title.default,
      resources: [],
    }, //ProposalMetadata;
    status: computeProposalStatus(
      proposal.executed,
      approved,
      proposal.startDate as Date,
      proposal.endDate as Date,
      proposal.tallyEndDate as Date,
      hasSucceeded
    ),
    parameters: {
      securityBlock: proposal.creationBlockNumber,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      tallyEndDate: proposal.tallyEndDate,
      totalVotingPower: vochainProposal.census.weight,
      censusURI: vochainProposal.census.censusURI,
      censusRoot: vochainProposal.census.censusId,
    },
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
    approvers: proposal.approvers.map((x) => x.id.split('_')[1]),
    canBeApproved: hasSucceeded && vochainProposal.finalResults,
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
