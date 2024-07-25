import { Connection } from '@solana/web3.js';
import { MAINNET_PROGRAM_ID, LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';

const solanaConnection = new Connection("https://mainnet.helius-rpc.com/?api-key=6fe59704-cd28-40dd-b0f7-911b4be71c17", { commitment: "confirmed" });

const existingLiquidityPools = new Set();

const runListener = async () => {
    const runTimestamp = Math.floor(new Date().getTime() / 1000)
    solanaConnection.onProgramAccountChange(
        MAINNET_PROGRAM_ID.AmmV4,
        async (updatedAccountInfo) => {
            const key = updatedAccountInfo.accountId.toString()
            const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data)
            const poolOpenTime = parseInt(poolState.poolOpenTime.toString())
            const existing = existingLiquidityPools.has(key)

            if (poolOpenTime > runTimestamp && !existing) {
                existingLiquidityPools.add(key)
                // const _ = processRaydiumPool(updatedAccountInfo.accountId, poolState)
                handleNewPools(poolState);
            }
        },
        "confirmed",
        [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
            {
                memcmp: {
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
                    bytes: MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('status'),
                    bytes: bs58.encode([6, 0, 0, 0, 0, 0, 0, 0]),
                },
            },
        ],
    )
}

const handleNewPools = (poolState) => {
    console.log("🚀 ~ handleNewPools ~ poolState:", poolState)
}

runListener();