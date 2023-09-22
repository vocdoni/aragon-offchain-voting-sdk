import { TEST_WALLET_ADDRESS } from "../constants";
import * as ganacheSetup from "../helpers/ganache-setup";
import {
  Context,
  ContextCore,
  ContextParams,
  SupportedNetworksArray,
} from "@aragon/sdk-client-common";
import { Server } from "ganache";
import { OffchainVotingClient } from "../../src";
import { GaslessPluginVotingSettings } from "../../src/internal/types";
import { AddressZero } from "@ethersproject/constants";
import { BigNumber } from "@ethersproject/bignumber";
import { encodeRatio } from "@aragon/sdk-common";
import { Client, DaoCreationSteps } from "@aragon/sdk-client";
import { Wallet } from "@ethersproject/wallet";

jest.spyOn(SupportedNetworksArray, "includes").mockReturnValue(true);
jest
  .spyOn(ContextCore.prototype, "network", "get")
  .mockReturnValue({ chainId: 5, name: "goerli" });

describe("Encoding", () => {
  let server: Server;
  // let deployment: deployContracts.Deployment;
  beforeAll(async () => {
    server = await ganacheSetup.start();
    // deployment = await deployContracts.deploy();
    // const dao = await buildMyPluginDao(deployment);
    // contextParamsLocalChain.myPluginRepoAddress =
    //   deployment.myPluginRepo.address;
    // contextParamsLocalChain.myPluginPluginAddress = dao!.plugins[0];
    // contextParamsLocalChain.ensRegistryAddress = deployment.ensRegistry.address;
  });

  afterAll(async () => {
    server.close();
  });

  it("should encode an install action", async () => {
    const token = {
      name: "test",
      symbol: "TST",
      decimals: 18,
      balances: [
        {
          address: TEST_WALLET_ADDRESS,
          balance: BigInt(100),
        },
      ],
    };

    const GaslessPluginVotingSettings: GaslessPluginVotingSettings = {
      onlyCommitteeProposalCreation: true,
      minTallyApprovals: 1,
      minDuration: 3600,
      minParticipation: BigNumber.from(encodeRatio(0.2, 6)),
      supportThreshold: BigNumber.from(encodeRatio(0.5, 6)),
      daoTokenAddress: AddressZero,
      minProposerVotingPower: 0,
      censusStrategy: "",
    };

    const pluginInstallItem = OffchainVotingClient.encoding
      .getPluginInstallItem(
        {
          committee: [TEST_WALLET_ADDRESS],
          votingSettings: GaslessPluginVotingSettings,
          newToken: token,
        },
        "maticmum",
      );
    // TODO
    // remove this dao creation example
    const contextParams: ContextParams = {
      signer: new Wallet(
        ""
      ),
      web3Providers: [
        "https://ethereum-goerli.publicnode.com",
      ],
      network: "goerli",
    };
    pluginInstallItem.id = "0xA4d97d64BCe2ab128Be10F5604D1f82C6D2781F5";

    const context = new Context(contextParams);

    const client = new Client(context);
    const number = Math.round(Math.random() * 10000);
    // const metadataCid = await client.methods.pinMetadata({
    //   name: "Test Vocdoni DAO " + number,
    //   description: "this is a test",
    //   links: [],
    // });

    const steps = client.methods.createDao(
      {
        ensSubdomain: "test-vocdoni-dao-" + number,
        metadataUri: "metadataCid",
        plugins: [
          pluginInstallItem,
        ],
      },
    );

    for await (const step of steps) {
      switch (step.key) {
        case DaoCreationSteps.CREATING:
          console.log("Creating DAO...");
          break;
        case DaoCreationSteps.DONE:
          console.log("DAO created!");
          console.log(step.pluginAddresses);
          console.log(step.address);
          break;
      }
    }

    expect(pluginInstallItem.id).toBe(
      "0xaca70d8c462940b839de386bcdd4cacf745632ca",
    );
    expect(pluginInstallItem.data instanceof Uint8Array).toBe(true);
  });
});
