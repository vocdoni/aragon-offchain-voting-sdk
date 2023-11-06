import { getPluginInstallationId } from '../commons/ids';
import { Plugin } from '../generated/schema';
import {PluginSettingsUpdated} from '../generated/templates/Plugin/VocdoniVoting';
import {handlePluginSettingsUpdated} from '../src/plugin/plugin';
import {Address, Bytes, DataSourceContext, Value, ethereum} from '@graphprotocol/graph-ts';
import {dataSourceMock, newMockEvent} from 'matchstick-as';

export function createPlugin(dao: Address, plugin: Address): Bytes{
    const installationId = getPluginInstallationId(dao, plugin);
    if(!installationId) throw new Error('Invalid installation id');

    let pluginEntity = new Plugin(installationId.toHexString());
    pluginEntity.dao = dao.toHexString();
    pluginEntity.save();

    return installationId;
}

export function pluginSettingsUpdatedEvent(
  eventAddress: string,
  daoAddress: string,
  onlyExecutionMultisigProposalCreation: boolean,
  minTallyApprovals: number,
  minParticipation: number,
  supportThreshold: number,
  minVoteDuration: number,
  minTallyDuration: number,
  daoTokenAddress: string,
  censusStrategyURI: string,
  minProposerVotingPower: number
): PluginSettingsUpdated {
    let newPluginSettingsUpdatedEvent = changetype<PluginSettingsUpdated>(
        newMockEvent()
    );
    newPluginSettingsUpdatedEvent.address = Address.fromString(eventAddress);

    // Set the data context for the event
    let context = new DataSourceContext()
    context.set('daoAddress', Value.fromString(daoAddress));
    dataSourceMock.setContext(context);

    let onlyExecutionMultisigProposalCreationParam = new ethereum.EventParam(
        'onlyExecutionMultisigProposalCreation',
        ethereum.Value.fromBoolean(onlyExecutionMultisigProposalCreation)
    );
    let minTallyApprovalsParam = new ethereum.EventParam(
        'minTallyApprovals',
        ethereum.Value.fromI32(<i32>minTallyApprovals)
    );
    let minParticipationParam = new ethereum.EventParam(
        'minParticipation',
        ethereum.Value.fromI32(<i32>minParticipation)
    );
    let supportThresholdParam = new ethereum.EventParam(
        'supportThreshold',
        ethereum.Value.fromI32(<i32>supportThreshold)
    );
    let minVoteDurationParam = new ethereum.EventParam(
        'minVoteDuration',
        ethereum.Value.fromI32(<i32>minVoteDuration)
    );
    let minTallyDurationParam = new ethereum.EventParam(
        'minTallyDuration',
        ethereum.Value.fromI32(<i32>minTallyDuration)
    );
    let daoTokenAddressParam = new ethereum.EventParam(
        'daoTokenAddress',
        ethereum.Value.fromAddress(Address.fromString(daoTokenAddress))
    );
    let censusStrategyURIParam = new ethereum.EventParam(
        'censusStrategyURI',
        ethereum.Value.fromBytes(Bytes.fromHexString(censusStrategyURI))
    );
    let minProposerVotingPowerParam = new ethereum.EventParam(
        'minProposerVotingPower',
        ethereum.Value.fromI32(<i32>minProposerVotingPower)
    );

    newPluginSettingsUpdatedEvent.parameters = new Array();
    newPluginSettingsUpdatedEvent.parameters.push(
        onlyExecutionMultisigProposalCreationParam
    );
    newPluginSettingsUpdatedEvent.parameters.push(minTallyApprovalsParam);
    newPluginSettingsUpdatedEvent.parameters.push(minParticipationParam);
    newPluginSettingsUpdatedEvent.parameters.push(supportThresholdParam);
    newPluginSettingsUpdatedEvent.parameters.push(minVoteDurationParam);
    newPluginSettingsUpdatedEvent.parameters.push(minTallyDurationParam);
    newPluginSettingsUpdatedEvent.parameters.push(daoTokenAddressParam);
    newPluginSettingsUpdatedEvent.parameters.push(censusStrategyURIParam);
    newPluginSettingsUpdatedEvent.parameters.push(minProposerVotingPowerParam);

    return newPluginSettingsUpdatedEvent;
}
