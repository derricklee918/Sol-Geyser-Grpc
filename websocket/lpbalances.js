import WebSocket from 'ws';

// Create a WebSocket connection
const ws = new WebSocket('wss://atlas-mainnet.helius-rpc.com?api-key=6fe59704-cd28-40dd-b0f7-911b4be71c17');

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: '2.0',
        id: 420,
        method: 'transactionSubscribe',
        params: [
            {
                failed: false,
                accountInclude: ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'],
            },
            {
                commitment: 'confirmed',
                encoding: 'jsonParsed',
                transactionDetails: 'full',
                maxSupportedTransactionVersion: 0,
            },
        ],
    };
    ws.send(JSON.stringify(request));
}

ws.on('open', function open() {
    console.log('WebSocket is open');
    sendRequest(ws);
});

ws.on('message', async function incoming(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        const result = messageObj.params.result;
        const logs = result.transaction.meta.logMessages;

        // Filter the logs that includes Transfer transaction
        if (logs && logs.some(log => log.includes('Transfer'))) {

            const poolInstructions = result.transaction.transaction.message.instructions.find(instruction => instruction.programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
            
            // Extract the accounts property from the targetObject
            const poolAccounts = poolInstructions.accounts;

            const postTokenBalances = result.transaction.meta.postTokenBalances;
            const poolTokenBalances = postTokenBalances.filter(balance => {
                return (balance.owner.includes('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'));
            });

            const signature = result.signature;
            let index = 0;
            let tokenMintA, tokenMintB, tokenBalanceA, tokenBalanceB, poolAddress;
            for (let i = 0; i < poolTokenBalances.length; i++) {
                if(i % 2 == 0) {
                    tokenMintA = poolTokenBalances[0].mint;
                    tokenBalanceA = poolTokenBalances[0].uiTokenAmount.uiAmount;
                    index++
                }
                if(i % 2 == 1) {
                    tokenMintB = poolTokenBalances[1].mint;
                    tokenBalanceB = poolTokenBalances[1].uiTokenAmount.uiAmount;
                    index++
                }
                poolAddress = poolTokenBalances[0].owner;
                // 
                if(index == 2) {
                    const pool = {
                        mintTokenA: tokenMintA,
                        mintTokenB: tokenMintB,
                        poolAddress: poolAccounts[1],
                        balanceTokenA: tokenBalanceA,
                        balanceTokenB: tokenBalanceB,
                        transactionId: signature
                    }
                    console.log("🚀 ~ incoming ~ pool:", pool)
                    index = 0;
                }
            }
        }
    } catch (err) {}
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket is closed');
});
