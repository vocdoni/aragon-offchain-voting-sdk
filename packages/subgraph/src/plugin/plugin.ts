import {getPluginInstallationId} from '../../commons/ids';
import {
  Action,
  Plugin,
  PluginProposal,
  TallyElement,
} from '../../generated/schema';
import {
  AddCommitteeMembersCall,
  CommitteeMembersAdded,
  CommitteeMembersRemoved,
  InitializeCall,
  PluginSettingsUpdated,
  ProposalCreated,
  ProposalExecuted,
  TallyApproval,
  TallySet,
} from '../../generated/templates/Plugin/VocdoniVoting';
import {
  Address,
  ByteArray,
  Bytes,
  dataSource,
  BigInt,
  store,
  json,
  EthereumUtils,
  ethereum,
  crypto,
  log,
} from '@graphprotocol/graph-ts';

export function handlePluginSettingsUpdated(
  event: PluginSettingsUpdated
): void {
  const pluginAddress = event.address;

  const context = dataSource.context();
  const daoId = context.getString('daoAddress');

  const installationId = getPluginInstallationId(
    Address.fromString(daoId),
    pluginAddress
  );

  if (installationId) {
    let pluginEntity = Plugin.load(installationId.toHexString());
    if (pluginEntity) {
      pluginEntity.onlyCommitteeProposalCreation =
        event.params.onlyCommitteeProposalCreation;
      pluginEntity.minTallyApprovals = event.params.minTallyApprovals;
      pluginEntity.minParticipation = event.params.minParticipation;
      pluginEntity.supportThreshold = event.params.supportThreshold;
      pluginEntity.minDuration = event.params.minDuration;
      pluginEntity.expirationTime = event.params.expirationTime;
      pluginEntity.daoTokenAddress = event.params.daoTokenAddress.toHexString();
      pluginEntity.minProposerVotingPower = event.params.minProposerVotingPower;
      pluginEntity.censusStrategy = event.params.censusStrategy;
      pluginEntity.save();
    }
  }
}

export function handleProposalCreated(event: ProposalCreated): void {
  const pluginAddress = event.address;

  const context = dataSource.context();
  const daoId = context.getString('daoAddress');

  const installationId = getPluginInstallationId(
    Address.fromString(daoId),
    pluginAddress
  );

  if (installationId) {
    let pluginEntity = Plugin.load(installationId.toHexString());
    if (pluginEntity) {
      const proposalId = event.params.proposalId;
      const proposalEntityId = [
        pluginAddress.toHexString(),
        proposalId.toHexString(),
      ].join('_');

      let proposalEntity = PluginProposal.load(proposalEntityId);
      if (!proposalEntity) {
        proposalEntity = new PluginProposal(proposalEntityId);

        proposalEntity.dao = daoId;
        proposalEntity.allowFailureMap = event.params.allowFailureMap;
        proposalEntity.plugin = pluginAddress.toHexString();

        proposalEntity.pluginProposalId = proposalId;
        proposalEntity.vochainProposalId = event.params.vochainProposalId;

        proposalEntity.creator = event.params.creator;
        proposalEntity.startDate = event.params.startDate;
        proposalEntity.endDate = event.params.endDate;
        proposalEntity.expirationDate = event.params.expirationDate;
        proposalEntity.createdAt = event.block.timestamp;
        proposalEntity.creationBlockNumber = event.block.number;
        proposalEntity.snapshotBlock = event.block.number;
        proposalEntity.executed = false;

        proposalEntity.tallyApproved = false;

        // store action entities
        const actions = event.params.actions;
        for (let index = 0; index < actions.length; index++) {
          const action = actions[index];

          const actionId = [proposalEntityId, index.toString()].join('_');

          let actionEntity = new Action(actionId);
          actionEntity.to = action.to;
          actionEntity.value = action.value;
          actionEntity.data = action.data;
          actionEntity.dao = daoId;
          actionEntity.proposal = proposalEntityId;
          actionEntity.save();
        }

        proposalEntity.save();
      }
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  const pluginAddress = event.address;

  const proposalId = event.params.proposalId;
  const proposalEntityId = [
    pluginAddress.toHexString(),
    proposalId.toHexString(),
  ].join('_');

  const proposalEntity = PluginProposal.load(proposalEntityId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.executionTxHash = event.transaction.hash;
    proposalEntity.save();
  }
}

export function handleCommitteeMembersAdded(
  event: CommitteeMembersAdded
): void {
  // Params which have complex types, for example arrays, will get keccak256 hashed and will be represented as Bytes
  // Indexed params become log topics, and can be used to filter the logs
  if (!event.receipt) {
    return;
  }

  const functionInput = event.transaction.input.subarray(4);
  const tuplePrefix = ByteArray.fromHexString(
    '0x0000000000000000000000000000000000000000000000000000000000000020'
  );
  const functionInputAsTuple = new Uint8Array(
    tuplePrefix.length + functionInput.length
  );
  //concat prefix & original input
  functionInputAsTuple.set(tuplePrefix, 0);
  functionInputAsTuple.set(functionInput, tuplePrefix.length);

  const tupleInputBytes = Bytes.fromUint8Array(functionInputAsTuple);
  const decoded = ethereum.decode(
    '(address,string,string,bytes),(((uint8,uint16),address),bytes)[]',
    tupleInputBytes
  );

  if (!decoded) {
    log.warning('ERROR DECODING CALL', []);
    return;
  }
  const t = decoded.toTuple();
  const decodedPluginSettings = ethereum.decode(
    'address[], (bool,uint16,uint32,uint32,uint64,uint64,address,uint256,string), (address,string,string), (address[],uint256[]))',
    t[1].toBytes()
  );
  if (!decodedPluginSettings) {
    log.warning('ERROR DECODING PLUGIN SETTINGS', []);
    return;
  }

  const t2 = decodedPluginSettings.toTuple();
  if (!t2) return;
  const members: Address[] = t2[0].toAddressArray();

  const pluginAddress = event.address;

  const context = dataSource.context();
  const daoId = context.getString('daoAddress');

  const installationId = getPluginInstallationId(
    Address.fromString(daoId),
    pluginAddress
  );

  if (installationId) {
    let pluginEntity = Plugin.load(installationId.toHexString());
    if (pluginEntity) {
      // Convert members Address[] to string[]
      const membersString: string[] = [];
      for (let i = 0; i < members.length; i++) {
        membersString.push(members[i].toHexString());
      }
      pluginEntity.committeeMembers = membersString;
      pluginEntity.cmBytes = event.params.newMembers;
      pluginEntity.save();
    }
  }
}

// export function handleCommitteeMembersRemoved(
//   event: CommitteeMembersRemoved
// ): void {
//   const pluginAddress = event.address;
//   for (let i = 0; i < event.params.removedMembers.length; i++) {
//     let memberAddress = event.params.removedMembers[i] as unknown as Address;
//     const memberId = [
//       pluginAddress.toHexString(),
//       memberAddress.toHexString(),
//     ].join('_');
//     let member = CommitteeMember.load(memberId);
//     if (member) {
//       store.remove('CommitteeMember', memberId);
//     }
//   }
// }

export function handleTallySet(event: TallySet): void {
  const pluginAddress = event.address;

  const proposalId = event.params.proposalId;
  const proposalEntityId = [
    pluginAddress.toHexString(),
    proposalId.toHexString(),
  ].join('_');

  const proposalEntity = PluginProposal.load(proposalEntityId);
  if (proposalEntity) {
    const tally = event.params.tally;

    for (let i = 0; i < tally.length; i++) {
      const tallyElementId = [
        pluginAddress.toHexString(),
        proposalId.toHexString(),
        i.toString(),
      ].join('_');
      let tallyElement = new TallyElement(tallyElementId);
      tallyElement.proposal = proposalEntityId;
      tallyElement.values = tally[i];
      tallyElement.save();
    }
  }
}

export function handleTallyApproval(event: TallyApproval): void {
  const pluginAddress = event.address;

  const proposalId = event.params.proposalId;
  const proposalEntityId = [
    pluginAddress.toHexString(),
    proposalId.toHexString(),
  ].join('_');

  const proposalEntity = PluginProposal.load(proposalEntityId);
  if (proposalEntity) {
    proposalEntity.tallyApproved = true;
    proposalEntity.save();
  }
}

/**
 * callHandlers (not working on Goerli)
 */
// export function handleInitialize(call: InitializeCall): void {
//   storeCommitteeMembers(call.inputs._committeeAddresses);
// }

// export function handleAddCommitteeMembers(call: AddCommitteeMembersCall): void {
//   storeCommitteeMembers(call.inputs._members);
// }

// export function storeCommitteeMembers(membersAddresses: Address[]): void {
//   let members: string[] = [];
//   let membersByteArray: ByteArray = ByteArray.fromHexString('0x');
//   for (let i = 0; i < membersAddresses.length; i++) {
//     let address = membersAddresses[i].toHexString();
//     membersByteArray.concat(ByteArray.fromHexString(address) as ByteArray);
//     members.push(membersAddresses[i].toHexString());
//   }

//   const hash = crypto.keccak256(membersByteArray);
//   const committeeMembersId = hash.toHexString();

//   let cmEntity = CommitteeMember.load(committeeMembersId);
//   if (!cmEntity) {
//     cmEntity = new CommitteeMember(committeeMembersId);
//   }
//   cmEntity.members = members;
//   cmEntity.save();
// }
