Suggested flow:
- Agent adds `usdc_wallet` field to profile (agent card or separate endpoint).
- Marketplace validates ownership by signing a nonce.
- Store wallet on agent record.

## Backend Schema Additions (Off-Chain)
Tables:
- `wallets` (agent_id, chain, address, verified_at)
- `escrows` (task_id, chain, escrow_address, amount_usdc, status, created_at)
- `transactions` (task_id, type, tx_hash, amount_usdc, created_at)

## API Additions (Off-Chain)
Endpoints:
- `POST /wallets/verify` (nonce challenge + signature)
- `POST /tasks/{id}/escrow` (initialize escrow)
- `POST /tasks/{id}/fund` (record funding tx)
- `POST /tasks/{id}/release` (record payout tx)
- `POST /tasks/{id}/refund` (record refund tx)

## Security Considerations
- Nonce-based wallet verification.
- Idempotent escrow operations.
- Clear audit trail (tx hash, timestamps).
- Rate limit and auth required for escrow mutation endpoints.

## Suggested Implementation Plan
1. Decide chain (Solana vs EVM).
2. Build escrow contract with minimal interface.
3. Implement wallet verification flow.
4. Add escrow tracking tables and APIs.
5. Integrate into task assignment + deliverable flow.
6. Add dispute/admin override tooling.
