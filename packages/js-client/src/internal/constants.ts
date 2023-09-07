// import { MetadataAbiInput } from './types';
import { IERC20MintableUpgradeable__factory } from '@aragon/osx-ethers';
import { MetadataAbiInput, SupportedNetwork } from '@aragon/sdk-client-common';
import { VocdoniVoting__factory } from '@vocdoni/offchain-voting-ethers';

export const DEFAULT_OFFCHAIN_VOTING_REPO_ADDRESS =
  '0x0000000000000000000000000000000000000000';
export const DEFAULT_ADDRESSES:{ [K in SupportedNetwork] : {repoAddress: string, setupAddress:string}} = {
  homestead:{
    setupAddress: "",
    repoAddress: "",
  },
  goerli: {
    setupAddress: "",
    repoAddress: "",
  },
  matic: {
    setupAddress: "",
    repoAddress: "",
  },
  maticmum: {
    setupAddress: "",
    repoAddress: "0xaca70d8c462940b839de386bcdd4cacf745632ca",
  }
}

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
