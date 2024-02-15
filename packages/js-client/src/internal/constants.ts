// import { MetadataAbiInput } from './types';
import {
  IERC20MintableUpgradeable__factory,
  IGovernanceWrappedERC20__factory,
} from '@aragon/osx-ethers';
import {
  MetadataAbiInput,
  SupportedNetwork,
  getInterfaceId,
} from '@aragon/sdk-client-common';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { abi as IVOTES_UPGRADEABLE_ABI } from '@openzeppelin/contracts-upgradeable/build/contracts/IVotesUpgradeable.json';
import { abi as ERC165_ABI } from '@openzeppelin/contracts/build/contracts/ERC165.json';
import { abi as IVOTES_ABI } from '@openzeppelin/contracts/build/contracts/IVotes.json';
import { VocdoniVoting__factory } from '@vocdoni/gasless-voting-ethers';

export const DEFAULT_GASLESS_VOTING_REPO_ADDRESS =
  '0x0000000000000000000000000000000000000000';
export const DEFAULT_GASLESS_VOTING_SUBHGRAPH_URL =
  'https://api.studio.thegraph.com/query/56701/vocdoni-gasless-voting-plugin/version/latest';
export const DEFAULT_ADDRESSES: {
  [K in SupportedNetwork]: { repoAddress: string; setupAddress: string };
} = {
  homestead: {
    setupAddress: '',
    repoAddress: '',
  },
  goerli: {
    setupAddress: '0x6847B82F943D7a761F12878b93a25868408D6cc3',
    repoAddress: '0x98C60A356f03244f9C33C9cA224d960cD45FD2C1',
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
  baseSepolia: {
    setupAddress: '',
    repoAddress: '',
  },
  local: {
    setupAddress: '',
    repoAddress: '',
  },
  sepolia: {
    setupAddress: '0x5A6E29875cCa6eb7a9c39938720e6096468a8917',
    repoAddress: '0xb663C36d6fd959beeF2b82Bb40823660FEAaa55f',
  },
  arbitrum: {
    setupAddress: '',
    repoAddress: '',
  },
  arbitrumGoerli: {
    setupAddress: '',
    repoAddress: '',
  },
  arbitrumSepolia: {
    setupAddress: '',
    repoAddress: '',
  },
};

export const DEFAULT_GASLESS_VOTING_BACKEND_URL =
  'https://example.otg/gasless-voting/rpc';

const majorityVotingInterface = VocdoniVoting__factory.createInterface();

export const AVAILABLE_FUNCTION_SIGNATURES: string[] = [
  VocdoniVoting__factory.createInterface()
    .getFunction('updatePluginSettings')
    .format('minimal'),
  VocdoniVoting__factory.createInterface()
    .getFunction('addExecutionMultisigMembers')
    .format('minimal'),
  VocdoniVoting__factory.createInterface()
    .getFunction('removeExecutionMultisigMembers')
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
        name: 'onlyExecutionMultisigProposalCreation',
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
        name: 'minVoteDuration',
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
        name: 'censusStrategyURI',
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

export const ERC165_INTERFACE_ID = getInterfaceId(new Interface(ERC165_ABI));

export const GOVERNANCE_SUPPORTED_INTERFACE_IDS = [
  getInterfaceId(new Interface(IVOTES_UPGRADEABLE_ABI)),
  getInterfaceId(new Interface(IVOTES_ABI)),
  getInterfaceId(IGovernanceWrappedERC20__factory.createInterface()),
];
