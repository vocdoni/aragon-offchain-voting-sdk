// import { MetadataAbiInput } from './types';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import { MetadataAbiInput, SupportedNetwork } from '@aragon/sdk-client-common';
import { BigNumber } from '@ethersproject/bignumber';
import { VocdoniVoting__factory } from '@vocdoni/offchain-voting-ethers';

export const DEFAULT_OFFCHAIN_VOTING_REPO_ADDRESS =
  '0x0000000000000000000000000000000000000000';
export const DEFAULT_ADDRESSES: {
  [K in SupportedNetwork]: { repoAddress: string; setupAddress: string };
} = {
  homestead: {
    setupAddress: '',
    repoAddress: '',
  },
  goerli: {
    setupAddress: '0xAe0c94AB8289C6fb0a45CA7733a84f549808F75b',
    repoAddress: '0x2a5Cc5974D3ab30d4B0a6e6a605e06956c975171',
  },
  matic: {
    setupAddress: '',
    repoAddress: '',
  },
  maticmum: {
    setupAddress: '0x5A6E29875cCa6eb7a9c39938720e6096468a8917',
    repoAddress: '0x5BD8F8Dc73476d24F37c4d885c4528d5abB8cBe6',
  },
  base: {
    setupAddress: '',
    repoAddress: '',
  },
  baseGoerli: {
    setupAddress: '',
    repoAddress: '',
  },
  local: {
    setupAddress: '',
    repoAddress: '',
  },
  sepolia: {
    setupAddress: '',
    repoAddress: '',
  },
};

export const DEFAULT_OFFCHAIN_VOTING_BACKEND_URL =
  'https://example.otg/offchain-voting/rpc';

const majorityVotingInterface = VocdoniVoting__factory.createInterface();

export const AVAILABLE_FUNCTION_SIGNATURES: string[] = [
  VocdoniVoting__factory.createInterface()
    .getFunction('updatePluginSettings')
    .format('minimal'),
  IERC20MintableUpgradeable__factory.createInterface()
    .getFunction('mint')
    .format('minimal'),
];

export const FAILING_PROPOSAL_AVAILABLE_FUNCTION_SIGNATURES = [
  majorityVotingInterface.getFunction('updatePluginSettings').format('minimal'),
];

export const INSTALLATION_ABI: MetadataAbiInput[] = [
  {
    components: [
      {
        internalType: 'bool',
        name: 'onlyCommitteeProposalCreation',
        type: 'bool',
        description: '',
      },
      {
        internalType: 'uint16',
        name: 'minTallyApprovals',
        type: 'uint16',
        description: '',
      },
      {
        internalType: 'uint32',
        name: 'minParticipation',
        type: 'uint32',
        description: '',
      },
      {
        internalType: 'uint32',
        name: 'supportThreshold',
        type: 'uint32',
        description: '',
      },
      {
        internalType: 'uint64',
        name: 'minDuration',
        type: 'uint64',
        description: '',
      },
      {
        internalType: 'address',
        name: 'daoTokenAddress',
        type: 'address',
        description: '',
      },
      {
        internalType: 'uint256',
        name: 'minProposerVotingPower',
        type: 'uint256',
        description: '',
      },
      {
        internalType: 'string',
        name: 'censusStrategy',
        type: 'string',
        description: '',
      },
    ],
    internalType: 'struct VocdoniVoting.PluginSettings',
    name: 'pluginSettings',
    type: 'tuple',
    description: '',
  },
  {
    components: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
        description: '',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
        description: '',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
        description: '',
      },
    ],
    internalType: 'struct IDAO.Action[]',
    name: 'actions',
    type: 'tuple[]',
    description: '',
  },
];

export const MAX_UINT64 = BigNumber.from(2).pow(64).sub(1);
