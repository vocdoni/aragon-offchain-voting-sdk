import {getPluginInstallationId} from '../../commons/ids';
import {Action, Plugin, PluginProposal} from '../../generated/schema';
import {
  ProposalCreated,
  ProposalExecuted,
} from '../../generated/templates/Plugin/VocdoniVoting';
import {Address, dataSource} from '@graphprotocol/graph-ts';

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

        proposalEntity.executed = false;

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
