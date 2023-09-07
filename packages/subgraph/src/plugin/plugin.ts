import {getPluginInstallationId} from '../../commons/ids';
import {Plugin} from '../../generated/schema';
import {ProposalCreated} from '../../generated/templates/Plugin/VocdoniVoting';
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
    if (!pluginEntity) {
      pluginEntity = new Plugin(installationId.toHexString());
      pluginEntity.dao = daoId;
      pluginEntity.save();
    }
  }
}
