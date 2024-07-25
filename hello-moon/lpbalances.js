require('dotenv').config();
const WebSocket = require('ws');
const { Token, Pool, AirdropWallet } = require('./dbObjects.js');
const Utils = require('./misc/utils');

const quoteTokens = [
    // USDC
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    // SOL
    'So11111111111111111111111111111111111111112',
];

class WebsocketClient {
    constructor() {
        this.ws = null;
    }

    async connect() {
        this.ws = new WebSocket('wss://kiki-stream.hellomoon.io');

        this.ws.on('open', () => {
            console.log('connected');
            this.subscribe();
        });

        this.ws.on('message', data => {
            if (!data) return;
            data = JSON.parse(data);
            if (data === 'You have successfully subscribed') {
                console.log('You have successfully subscribed');
                return;
            }
            this.handleMessage(data);
        });

        this.ws.on('close', () => {
            console.log('closed');
            this.connect();
        });

        this.ws.on('error', error => {
            console.error('WebSocket error:', error);
            this.connect();
        });
    }

    async handleMessage(data) {
        // Kill USDC/SOL pools
        const relevantTxs = data.filter(tx => {
            return (quoteTokens.includes(tx.mintTokenA) || quoteTokens.includes(tx.mintTokenB)) && !(quoteTokens.includes(tx.mintTokenA) && quoteTokens.includes(tx.mintTokenB));
        });
        const lastTxsPerBlock = {};
        relevantTxs.forEach(obj => {
            lastTxsPerBlock[obj.poolAddress] = obj;
        });
        for (const balanceChanges of Object.values(lastTxsPerBlock)) {
            // do processing
        }
    }

    subscribe() {
        this.ws.send(
            JSON.stringify({
                action: 'subscribe',
                apiKey: process.env.HELLO_MOON_API_KEY,
                subscriptionId: process.env.HELLO_MOON_LP_BALANCES_SUBSCRIPTION_ID,
            }),
        );
    }
}

// Initial connection
const socket = new WebsocketClient();
socket.connect();
