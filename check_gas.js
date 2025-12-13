
const { Aptos, AptosConfig, Network } = require('@aptos-labs/ts-sdk');

const MOVEMENT_TESTNET_RPC = "https://aptos.testnet.bardock.movementlabs.xyz/v1";

const aptosConfig = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: MOVEMENT_TESTNET_RPC,
});

const aptos = new Aptos(aptosConfig);

async function checkGas() {
    try {
        const estimation = await aptos.getGasPriceEstimation();
        console.log("Gas Estimation:", estimation);
    } catch (error) {
        console.error("Error fetching gas:", error);
    }
}

checkGas();
