import {
  handlePluginSettingsUpdated,
  handleProposalCreated,
} from '../src/plugin/plugin';
import {
  createPlugin,
  pluginProposalCreatedEvent,
  pluginSettingsUpdatedEvent,
} from './utils';
import {Address, BigInt, ethereum, log} from '@graphprotocol/graph-ts';
import {
  describe,
  test,
  afterEach,
  clearStore,
  assert,
  logStore,
} from 'matchstick-as/assembly/index';

const PLUGIN_ENTITY_TYPE = 'Plugin';
const PROPOSAL_ENTITY_TYPE = 'PluginProposal';

describe('Plugin Events', () => {
  afterEach(() => {
    clearStore();
  });

  test('Plugin entity creation and update', () => {
    const firstDaoAString = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const firstPluginAString = '0x758b8178A9A4B7206D1f648c4a77C515CbaC7000';
    const firstDaoTokenAString = '0xa66ab9d321273fb415ff2539d38dd1a6e8b78a25';
    const firstPluginId = createPlugin(
      Address.fromString(firstDaoAString),
      Address.fromString(firstPluginAString)
    );

    let newPluginEvent = pluginSettingsUpdatedEvent(
      firstPluginAString,
      firstDaoAString,
      true,
      1,
      1,
      1,
      1,
      1,
      firstDaoTokenAString,
      '0x2a1290d5d0Dd792Ad8e1C257a691F24E97675644',
      1
    );
    handlePluginSettingsUpdated(newPluginEvent);

    const anotherDaoAString = '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5';
    const anotherPluginAString = '0x763c396673F9c391DCe3361A9A71C8E161388000';
    const anotherDaoTokenAString = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e8';
    const secondPluginId = createPlugin(
      Address.fromString(anotherDaoAString),
      Address.fromString(anotherPluginAString)
    );

    let anotherPluginEvent = pluginSettingsUpdatedEvent(
      anotherPluginAString,
      anotherDaoAString,
      false,
      1,
      1,
      1,
      1,
      1,
      anotherDaoTokenAString,
      '0x974CaA59e49682CdA0AD2bbe82983419A2ECC400',
      1
    );
    handlePluginSettingsUpdated(anotherPluginEvent);

    assert.fieldEquals(
      PLUGIN_ENTITY_TYPE,
      firstPluginId.toHexString(),
      'daoTokenAddress',
      firstDaoTokenAString
    );
    assert.fieldEquals(
      PLUGIN_ENTITY_TYPE,
      firstPluginId.toHexString(),
      'onlyExecutionMultisigProposalCreation',
      'true'
    );

    assert.fieldEquals(
      PLUGIN_ENTITY_TYPE,
      secondPluginId.toHexString(),
      'daoTokenAddress',
      anotherDaoTokenAString
    );
    assert.fieldEquals(
      PLUGIN_ENTITY_TYPE,
      secondPluginId.toHexString(),
      'onlyExecutionMultisigProposalCreation',
      'false'
    );
  });

  test('Proposal creation', () => {
    const firstDaoAString = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const firstPluginAString = '0x758b8178A9A4B7206D1f648c4a77C515CbaC7000';
    const firstDaoTokenAString = '0xa66ab9d321273fb415ff2539d38dd1a6e8b78a25';
    const firstPluginId = createPlugin(
      Address.fromString(firstDaoAString),
      Address.fromString(firstPluginAString)
    );

    let newPluginEvent = pluginSettingsUpdatedEvent(
      firstPluginAString,
      firstDaoAString,
      true,
      1,
      1,
      1,
      1,
      1,
      firstDaoTokenAString,
      '0x2a1290d5d0Dd792Ad8e1C257a691F24E97675644',
      1
    );
    handlePluginSettingsUpdated(newPluginEvent);

    let newProposalEvent = pluginProposalCreatedEvent(
      firstPluginAString,
      firstDaoAString,
      1,
      '0x2a1290d5d0dd792ad8e1c257a691f24e97675644'
    );

    handleProposalCreated(newProposalEvent);
    logStore();
  });

  //   test('Proposal execution', () => {});
  //   test('Committee members added', () => {});
  //   test('Committee members removed', () => {});
  //   test('Tally set', () => {});
  //   test('Tally approve', () => {});
});
