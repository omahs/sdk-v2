import { BigNumber } from "ethers";
import { getEventFee, getDepositFee, getRefundFee } from "./UBAFeeSpokeCalculatorAnalog";
import { toBN } from "../utils";
import { MockUBAConfig } from "../clients/mocks";

describe("UBAFeeSpokeCalculatorAnalog", () => {
  const defaultConfig = new MockUBAConfig();

  describe("getEventFee", () => {
    it("should calculate the balancing fee for an inflow event", () => {
      const amount = BigNumber.from(10);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(1000);
      const chainId = 1;
      const flowType = "inflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("20");
    });

    it("should calculate the balancing fee for an outflow event", () => {
      const amount = BigNumber.from(10);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(1000);

      const chainId = 1;
      const flowType = "outflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("0");
    });

    it("should return a balanceFee of 0 if the amount is 0", () => {
      const amount = BigNumber.from(0);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(1000);
      const chainId = 1;
      const flowType = "outflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("0");
    });

    it("should return a balance fee 0 if lastIncentiveBalance is negative", () => {
      const amount = BigNumber.from(10);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(-1000);
      const chainId = 1;
      const flowType = "outflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("0");
    });

    it("should return a balance fee 0 if lastIncentiveBalance is 0", () => {
      const amount = BigNumber.from(10);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(0);
      const chainId = 1;
      const flowType = "outflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("0");
    });

    describe("getEventFee should correctly apply a reward multiplier", () => {
      for (const multiplier of [-23, 0, 23]) {
        const signToZero = multiplier === 0 ? "==" : multiplier > 0 ? ">" : "<";
        it(`should return a discounted balance fee if the multiplier is ${signToZero} 0`, () => {
          const amount = BigNumber.from(10);
          const lastRunningBalance = BigNumber.from(1000);
          const lastIncentiveBalance = BigNumber.from(1000);
          const chainId = 1;
          const flowType = "outflow";

          const originalFee = getEventFee(
            amount,
            flowType,
            lastRunningBalance,
            lastIncentiveBalance,
            chainId,
            defaultConfig
          );

          const config = new MockUBAConfig();
          config.setRewardMultiplier(chainId.toString(), toBN(multiplier));

          const modifiedFee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, config);
          expect(modifiedFee.balancingFee.toString()).toEqual(originalFee.balancingFee.mul(multiplier).toString());
        });
      }
    });

    it("should return a discounted balance fee if the lastIncentiveBalance is positive", () => {
      const amount = BigNumber.from(10);
      const lastRunningBalance = BigNumber.from(1000);
      const lastIncentiveBalance = BigNumber.from(1000);
      const chainId = 1;
      const flowType = "inflow";
      const fee = getEventFee(amount, flowType, lastRunningBalance, lastIncentiveBalance, chainId, defaultConfig);
      expect(fee.balancingFee.toString()).toEqual("20");
    });
  });

  // The following tests are designed around ensuring that our `getEventFee` specific functions (getDepositFee and getRefundFee) are
  // calculating the same fee as the `getEventFee` function. This is to ensure that the `getEventFee` function is working as expected
  // as well as the `getDepositFee` and `getRefundFee` functions.
  // Based on their design, these calculation functions should always return the same fee as the `getEventFee` function.
  for (const [flowName, flowType] of [
    ["getDepositFee", "inflow"],
    ["getRefundFee", "outflow"],
  ]) {
    describe(flowName, () => {
      it("should calculate the same fee as its corresponding event fee", () => {
        // Test this function over a range of random values.
        // In all cases, it should be the same as the event fee for an inflow.
        for (let i = 0; i < 1000; i++) {
          // Generate random values for the amount parameter
          const amount = BigNumber.from(Math.floor(Math.random() * 100000));
          // Generate a random number between -50_000 and 50_000 for the lastRunningBalance
          const lastRunningBalance = BigNumber.from(Math.floor(Math.random() * 100000) - 100000);
          // Generate a random number between -50_000 and 50_000 for the lastIncentiveBalance
          const lastIncentiveBalance = BigNumber.from(Math.floor(Math.random() * 100000) - 100000);
          // Generate a random chainId
          const chainId = Math.floor(Math.random() * 100000);
          // Calculate the fee using the function under test
          const fee = (flowType == "inflow" ? getDepositFee : getRefundFee)(
            amount,
            lastRunningBalance,
            lastIncentiveBalance,
            chainId,
            defaultConfig
          );
          const eventFee = getEventFee(
            amount,
            flowType === "inflow" ? "inflow" : "outflow",
            lastRunningBalance,
            lastIncentiveBalance,
            chainId,
            defaultConfig
          );
          expect(fee.balancingFee.toString()).toEqual(eventFee.balancingFee.toString());
        }
      });
    });
  }
});