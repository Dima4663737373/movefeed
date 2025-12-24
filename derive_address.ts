
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const pkHex = "4a760b2b7f235f0ceb8a150d6877cc60ace2838ec63343cc268ebec20e4a03b6";
const privateKey = new Ed25519PrivateKey(pkHex);
const account = Account.fromPrivateKey({ privateKey });
console.log(account.accountAddress.toString());
