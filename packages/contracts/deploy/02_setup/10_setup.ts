import {PLUGIN_SETUP_CONTRACT_NAME} from '../../plugin-settings';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ${PLUGIN_SETUP_CONTRACT_NAME}`);

  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy(PLUGIN_SETUP_CONTRACT_NAME, {
    from: deployer,
    args: [
      '0xf868169bde323f45005e476287f4c76411a610f8',
      '0x073b8528bcfbb2454c8fa792558aa4a1e64c613b',
    ],
    log: true,
  });
};

export default func;
func.tags = [PLUGIN_SETUP_CONTRACT_NAME, 'Deployment'];
