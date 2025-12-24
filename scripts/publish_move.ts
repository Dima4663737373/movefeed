import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from "@aptos-labs/ts-sdk";
import * as fs from "fs";
import * as path from "path";

const PRIVATE_KEY_HEX = "0x37cf19eb836985817173a97e482dddcaa03382df58fb5a527561cbfacc2677c4"; // mines_v3
const MODULE_ADDRESS = "0xd5002c5ac88d8db0e7bc8e047760c339d9ddd14ddb790e30a9b8ff7dc37c98be";

const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1",
    faucet: "https://faucet.testnet.movementnetwork.xyz"
});

const aptos = new Aptos(config);

async function main() {
    const privateKey = new Ed25519PrivateKey(PRIVATE_KEY_HEX);
    const account = Account.fromPrivateKey({ privateKey });

    console.log(`Publishing from account: ${account.accountAddress.toString()}`);

    const packagePath = path.join(__dirname, "../move/build/Mines");
    const metadataPath = path.join(packagePath, "package-metadata.bcs");
    const bytecodePath = path.join(packagePath, "bytecode_modules");

    if (!fs.existsSync(metadataPath)) {
        console.error("Metadata not found!");
        process.exit(1);
    }

    const metadataBytes = fs.readFileSync(metadataPath);
    const metadataHex = metadataBytes.toString('hex');
    const bytecodesHex: string[] = [];

    const modulesToPublish = ["badges.mv", "challenges.mv", "donations.mv"];
    
    for (const mod of modulesToPublish) {
        const modPath = path.join(bytecodePath, mod);
        if (fs.existsSync(modPath)) {
            const bytes = fs.readFileSync(modPath);
            bytecodesHex.push(bytes.toString('hex'));
            console.log(`Loaded ${mod} (${bytes.length} bytes)`);
        } else {
            console.error(`Module ${mod} not found at ${modPath}`);
        }
    }

    if (bytecodesHex.length === 0) {
        console.error("No modules to publish!");
        process.exit(1);
    }

    console.log("Submitting transaction...");
    console.log("Metadata length:", metadataBytes.length);
    console.log("Bytecodes count:", bytecodesHex.length);

    // Ensure hex strings are prefixed with 0x if SDK requires it, or not.
    // SDK HexInput handles both usually. But let's prefix 0x just in case.
    const metadataArg = `0x${metadataHex}`;
    const bytecodeArgs = bytecodesHex.map(b => `0x${b}`);

    // Use buildTransaction directly to debug
    const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
            function: "0x1::code::publish_package_txn",
            functionArguments: [metadataArg, bytecodeArgs],
        },
    });

    // const transaction = await aptos.publishPackageTransaction({
    //     account: account.accountAddress.toString(),
    //     metadata: metadataArg,
    //     moduleBytecode: bytecodeArgs,
    // });
    
    const committedTxn = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: transaction,
    });

    console.log(`Transaction submitted: ${committedTxn.hash}`);
    
    try {
        const response = await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
        console.log(`Transaction confirmed: ${response.success ? "Success" : "Failed"}`);
        if (!response.success) {
            console.error(response);
        }
    } catch (e) {
        console.error("Error waiting for transaction:", e);
    }
}

main().catch(console.error);
