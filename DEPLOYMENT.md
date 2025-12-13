cd move
aptos move compile
```

This will:
- Compile `TipJar.move`
- Generate bytecode
- Show you the module address

### 4. Deploy to Movement Testnet

```bash
aptos move publish \
  --named-addresses tipjar_addr=<your-deployer-address> \
  --url https://testnet.movementnetwork.xyz/v1
```

Replace `<your-deployer-address>` with your account address from step 1.

Example:
```bash
aptos move publish \
  --named-addresses tipjar_addr=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --url https://testnet.movementnetwork.xyz/v1
```

### 5. Verify Deployment

After successful deployment, you'll see:
```
{
  "Result": {
    "transaction_hash": "0x...",
    "gas_used": 1234,
    "success": true
  }
}
```

### 6. Update Frontend Configuration

Copy your deployed module address and update `src/lib/movement.ts`:

```typescript
export const TIPJAR_MODULE_ADDRESS = "0x1234..."; // Your deployed address
```

The full module identifier will be:
```
<your-address>::TipJar::tip_self
```

## Verification

### Check Module on Explorer

Visit Movement Explorer:
```
https://explorer.movementnetwork.xyz/account/<your-address>?network=testnet
```

Look for the `TipJar` module under "Modules".

### Test the Module

You can test calling the module using Aptos CLI:

```bash
aptos move run \
  --function-id <your-address>::TipJar::tip_self \
  --url https://testnet.movementnetwork.xyz/v1
```

## Troubleshooting

### Error: Insufficient balance
- Make sure your account is funded from the faucet
- Check balance: `aptos account list --account <your-address>`

### Error: Module already exists
- You're trying to republish to the same address
- Either use a new address or upgrade the module (advanced)

### Error: Compilation failed
- Check that `Move.toml` has correct dependencies
- Verify `TipJar.move` syntax is correct
- Make sure you're in the `move/` directory

## Module Address Format

Movement/Aptos addresses are 32-byte hex strings:
- Format: `0x` + 64 hex characters
- Example: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

## Next Steps

After deployment:
1. Update `TIPJAR_MODULE_ADDRESS` in `src/lib/movement.ts`
2. Restart the Next.js dev server
3. Test the "Send test tip" functionality on the dashboard
4. Verify transactions on Movement Explorer

## Resources

- Movement Docs: https://docs.movementnetwork.xyz/
- Aptos Move Book: https://aptos.dev/move/book/SUMMARY
- Movement Explorer: https://explorer.movementnetwork.xyz/
- Movement Faucet: https://faucet.movementnetwork.xyz/
