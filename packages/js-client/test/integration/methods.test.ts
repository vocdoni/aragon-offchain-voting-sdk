
import * as mockedGraphqlRequest from '../mocks/graphql-request';
import {
  // NumbersQueryParams,
  // NumbersSortBy,
  GaslessVotingContext,
  GaslessVotingClient,
} from '../../src';
// import { QueryNumber, QueryNumbers } from '../../src/internal/graphql-queries';
// import {
//   SubgraphNumber,
//   SubgraphNumberListItem,
// } from '../../src/internal/types';
import { contextParamsLocalChain } from '../constants';
import { buildVocdoniVotingDao } from '../helpers/build-daos';
import * as deployContracts from '../helpers/deploy-contracts';
import * as ganacheSetup from '../helpers/ganache-setup';
import {
  ContextCore,
  LIVE_CONTRACTS,
  PrepareInstallationStep,
  SortDirection,
  SupportedNetworksArray,
} from '@aragon/sdk-client-common';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Server } from 'ganache';

jest.spyOn(SupportedNetworksArray, 'includes').mockReturnValue(true);
jest
  .spyOn(ContextCore.prototype, 'network', 'get')
  .mockReturnValue({ chainId: 80001, name: 'polygonMumbai' });

describe('Methods', () => {
  let server: Server;
  let deployment: deployContracts.Deployment;
  let dao: { dao: string; plugins: string[] };
  beforeAll(async () => {
    // server = await ganacheSetup.start();
    // deployment = await deployContracts.deploy();
    dao = await buildVocdoniVotingDao(deployment);
    contextParamsLocalChain.gaslessVotingRepoAddress =
      deployment.vocdoniVotingRepo.address;
    contextParamsLocalChain.ensRegistryAddress = deployment.ensRegistry.address;
    LIVE_CONTRACTS.goerli.pluginSetupProcessor =
      deployment.pluginSetupProcessor.address;
  });

  afterAll(async () => {
    server.close();
  });

  it('Should prepare an installation', async () => {
    const context = new GaslessVotingContext(contextParamsLocalChain);
    const client = new GaslessVotingClient(context);
    client.methods.prepareInstallation(
      {

      }
    )

  });

//   it('Should get a number', async () => {
//     const context = new MyPluginContext(contextParamsLocalChain);
//     const client = new MyPluginClient(context);
//     const mockedClient = mockedGraphqlRequest.getMockedInstance(
//       client.graphql.getClient()
//     );
//     const subgraphResponse: SubgraphNumber = {
//       number: {
//         value: '1',
//       },
//     };
//     mockedClient.request.mockResolvedValueOnce({
//       dao: subgraphResponse,
//     });

//     const number = await client.methods.getNumber(dao.dao);

//     expect(number.toString()).toBe('1');

//     expect(mockedClient.request).toHaveBeenCalledWith(QueryNumber, {
//       id: dao.dao,
//     });
//   });

//   it('Should get a list of numbers', async () => {
//     const context = new MyPluginContext(contextParamsLocalChain);
//     const client = new MyPluginClient(context);
//     const mockedClient = mockedGraphqlRequest.getMockedInstance(
//       client.graphql.getClient()
//     );
//     const limit = 5;
//     const params: NumbersQueryParams = {
//       limit,
//       sortBy: NumbersSortBy.CREATED_AT,
//       direction: SortDirection.ASC,
//       skip: 0,
//     };
//     const subgraphResponse: SubgraphNumberListItem[] = [
//       {
//         id: dao.dao,
//         subdomain: 'test',
//         number: {
//           value: '1',
//         },
//       },
//     ];
//     mockedClient.request.mockResolvedValueOnce({
//       daos: subgraphResponse,
//     });

//     const numbers = await client.methods.getNumbers(params);

//     for (const [index, subgraphNumber] of subgraphResponse.entries()) {
//       expect(subgraphNumber.id).toBe(numbers[index].id);
//       expect(subgraphNumber.subdomain).toBe(numbers[index].subdomain);
//       expect(subgraphNumber.number.value).toBe(numbers[index].value.toString());
//     }

//     expect(mockedClient.request).toHaveBeenCalledWith(QueryNumbers, params);
//   });
// });
