import {
  TEST_WALLET_ADDRESS,
} from "../constants";
import * as ganacheSetup from "../helpers/ganache-setup";
import { ContextCore, SupportedNetworksArray } from "@aragon/sdk-client-common";
import { Server } from "ganache";
import { OffchainVotingClient } from "../../src";
import { VocdoniVotingSettings } from "../../src/internal/types";
import { AddressZero } from "@ethersproject/constants";
import { BigNumber } from "@ethersproject/bignumber";

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

  it("should encode an action", async () => {
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
    const RATIO_BASE = BigNumber.from(10).pow(6); // 100% => 10**6

    const pctToRatio = (x: number) => RATIO_BASE.mul(x).div(100);

    const vocdoniVotingSettings: VocdoniVotingSettings = {
      onlyCommitteeProposalCreation: true,
      minTallyApprovals: 1,
      minDuration: 3600,
      minParticipation: pctToRatio(20),
      supportThreshold: pctToRatio(0.5),
      daoTokenAddress: AddressZero,
      minProposerVotingPower: 0,
      censusStrategy: "",
    };

    const pluginInstallItem = OffchainVotingClient.encoding
      .getPluginInstallItem(
        {
          committee: [TEST_WALLET_ADDRESS],
          votingSettings: vocdoniVotingSettings,
          newToken: token,
        },
        "todoNetwork",
      );
    expect(pluginInstallItem.id).toBe("");
  });
});
