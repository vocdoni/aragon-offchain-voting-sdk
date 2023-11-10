import {getPluginInstallationId} from '../../commons/ids';
import {
  Action,
  Plugin,
  PluginProposal,
  TallyElement,
} from '../../generated/schema';
import {
  ExecutionMultisigMembersAdded,
  ExecutionMultisigMembersRemoved,
  PluginSettingsUpdated,
  ProposalCreated,
  ProposalExecuted,
  TallyApproval,
  TallySet,
} from '../../generated/templates/Plugin/VocdoniVoting';
import {Address, dataSource} from '@graphprotocol/graph-ts';

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
      pluginEntity.address = pluginAddress.toHexString();
      pluginEntity.onlyExecutionMultisigProposalCreation =
        event.params.onlyExecutionMultisigProposalCreation;
      pluginEntity.minTallyApprovals = event.params.minTallyApprovals;
      pluginEntity.minParticipation = event.params.minParticipation;
      pluginEntity.supportThreshold = event.params.supportThreshold;
      pluginEntity.minVoteDuration = event.params.minVoteDuration;
      pluginEntity.minTallyDuration = event.params.minTallyDuration;
      pluginEntity.daoTokenAddress = event.params.daoTokenAddress.toHexString();
      pluginEntity.minProposerVotingPower = event.params.minProposerVotingPower;
      pluginEntity.censusStrategyURI = event.params.censusStrategyURI;
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
        proposalEntity.plugin = pluginEntity.id;

        proposalEntity.pluginProposalId = proposalId;
        proposalEntity.vochainProposalId = event.params.vochainProposalId;

        proposalEntity.creator = event.params.creator;
        proposalEntity.startDate = event.params.startDate;
        proposalEntity.voteEndDate = event.params.voteEndDate;
        proposalEntity.tallyEndDate = event.params.tallyEndDate;
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

export function handleExecutionMultisigMembersAdded(
  event: ExecutionMultisigMembersAdded
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
      let members: string[] = [];
      for (let i = 0; i < event.params.newMembers.length; i++) {
        members.push(event.params.newMembers[i].toHexString());
      }
      pluginEntity.executionMultisigMembers = members;
      pluginEntity.save();
    }
  }
}

export function handleExecutionMultisigMembersRemoved(
  event: ExecutionMultisigMembersRemoved
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
      const members = pluginEntity.executionMultisigMembers;
      if (members) {
        // Remove members that are in event.params.removedMembers
        for (let i = 0; i < event.params.removedMembers.length; i++) {
          const index = members.indexOf(
            event.params.removedMembers[i].toHexString()
          );
          if (index > -1) {
            members.splice(index, 1);
          }
        }
        pluginEntity.executionMultisigMembers = members;
        pluginEntity.save();
      }
    }
  }
}

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
