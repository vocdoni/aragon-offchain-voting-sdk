import {PLUGIN_SETUP_CONTRACT_NAME} from '../../plugin-settings';
import {getTokensAddresses} from '../../utils/helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ${PLUGIN_SETUP_CONTRACT_NAME}`);

  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const addresses = getTokensAddresses(hre.network.name);
  console.log('addresses', addresses);

  await deploy(PLUGIN_SETUP_CONTRACT_NAME, {
    from: deployer,
    args: [
      addresses[0], // GovernanceERC20
      addresses[1], // GovernanceWrappedERC20
    ],
    log: true,
    skipIfAlreadyDeployed: false,
  });
};

export default func;
func.tags = [PLUGIN_SETUP_CONTRACT_NAME, 'Deployment'];
