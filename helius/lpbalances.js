import dotenv from "dotenv";
dotenv.config();
import {
    Connection,
    PublicKey,
} from '@solana/web3.js';
import { MAINNET_PROGRAM_ID, LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';

const pools = []

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
                handleNewPools(key, poolState);
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

const handleNewPools = async (poolId, poolStateInfo) => {
    // do processing
    const poolAddress = poolId;                                                            // poolId of newly created raydium pool
    console.log("🚀 ~ handleNewPools ~ poolAddress:", poolAddress)
    const poolState = poolStateInfo;                                                            // account information data decoded to json type
    console.log("🚀 ~ handleNewPools ~ poolState:", poolState)
    const baseVault = poolState.baseVault;                                                      // account address of baseVault
    console.log("🚀 ~ handleNewPools ~ baseVault:", baseVault)
    const quoteVault = poolState.quoteVault;                                                    // account address of quoteVault
    console.log("🚀 ~ handleNewPools ~ quoteVault:", quoteVault)
    const checkInterval = 1000;                                                                 // set time interval of checking balance as 1 second
    const baseBalance = await solanaConnection.getTokenAccountBalance(new PublicKey(baseVault));      // account balance of baseVault
    console.log("🚀 ~ handleNewPools ~ baseBalance:", baseBalance)
    const quoteBalance = await solanaConnection.getTokenAccountBalance(new PublicKey(quoteVault));    // account balance of quoteVault
    console.log("🚀 ~ handleNewPools ~ quoteBalance:", quoteBalance)
    sleep(3000);

    // if the number of new pools exceed 20, delete the earliest pool balance data
    if (pools.length > 20) {
        pools.pop();
    }

    // if there is a new pool, add that pool's data to the array
    pools.push(
        {
            poolId: poolAddress,
            baseVault: baseVault,
            quoteVault: quoteVault,
            baseBalance: baseBalance.value.amount / 10 ** baseBalance.value.decimals,
            quoteBalance: quoteBalance.value.amount / 10 ** quoteBalance.value.decimals
        }
    )

    // Update the balance of pool vaults, display the pool data to the console
    setInterval(async () => {
        pools.forEach(async pool => {
            const baseBalance = await solanaConnection.getTokenAccountBalance(new PublicKey(pool.baseVault));
            const quoteBalance = await solanaConnection.getTokenAccountBalance(new PublicKey(pool.quoteVault));
            sleep(3000);
            pool.baseBalance = baseBalance.value.amount / 10 ** baseBalance.value.decimals;
            pool.quoteBalance = quoteBalance.value.amount / 10 ** quoteBalance.value.decimals;
        })
        poolBalanceDisplay();
    }, checkInterval)
}

// function to display the pools data array to the console
const poolBalanceDisplay = () => {
    console.clear();
    console.log("RAYDIUM NEW POOLS' STATES\n");
    pools.forEach(
        pool => {
            console.log("PoolId: ", pool.poolId, " BaseBalnce: ", pool.baseBalance, " QuoteBalance: ", pool.quoteBalance);
        }
    )
}

const sleep = async (miliseconds) => {
    await new Promise((resolve) => setTimeout(resolve, miliseconds))
}

runListener();