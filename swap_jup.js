// const { Connection, Keypair, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const { Connection, Keypair, Transaction, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('cross-fetch');
const bs58 = require('bs58');


// Vos informations
const privateKey = '';
const userKeyPair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Endpoint RPC
const rpcEndpoint = 'https://neat-hidden-sanctuary.solana-mainnet.discover.quiknode.pro/2af5315d336f9ae920028bbb90a73b724dc1bbed/';
const connection = new Connection(rpcEndpoint, 'confirmed');

// Fonction pour récupérer la carte des routes
async function getRouteMap() {
    const indexedRouteMap = await (await fetch('https://quote-api.jup.ag/v6/indexed-route-map')).json();
    const getMint = (index) => indexedRouteMap['mintKeys'][index];
    const getIndex = (mint) => indexedRouteMap['mintKeys'].indexOf(mint);

    const generatedRouteMap = {};
    Object.keys(indexedRouteMap['indexedRouteMap']).forEach((key, index) => {
        generatedRouteMap[getMint(key)] = indexedRouteMap['indexedRouteMap'][key].map((index) => getMint(index));
    });

    return generatedRouteMap;
}

// Fonction pour obtenir la route pour un échange
async function getSwapRoute(inputMint, outputMint, amount, slippage) {
    const route = await (
        await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage}`)
    ).json();

    return route;
}

// Fonction pour effectuer l'échange
async function performSwap(quoteResponse, userPublicKey) {
    const swapTransaction = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: userPublicKey.toString(),
                wrapAndUnwrapSol: true,
            }),
        })
    ).json();

    const swapTransactionBuf = Buffer.from(swapTransaction.swapTransaction, 'base64');

    // Utilisez la fonction deserialize de la classe VersionedTransaction
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    return transaction;
}

// Fonction pour signer et exécuter la transaction
async function signAndExecuteTransaction(transaction, userKeyPair) {
    transaction.sign([userKeyPair]);
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
    });
    await connection.confirmTransaction(txid);
    console.log(`Transaction successful. Transaction ID: ${txid}`);
    console.log(`View transaction on Solscan: https://solscan.io/tx/${txid}`);
}

// Script principal
async function main() {
    try {
        // Étape 1: Récupérer la carte des routes
        const routeMap = await getRouteMap();
        // console.log('Route Map:', routeMap);

        // Étape 2: Obtenir la route pour un échange (SOL vers USDC par exemple)
        const inputMint = 'So11111111111111111111111111111111111111112'; // SOL
        const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
        const amount = 10000000; // 0.1 SOL
        const slippage = 50; // 0.5%

        const swapRoute = await getSwapRoute(inputMint, outputMint, amount, slippage);
        // console.log('Swap Route:', swapRoute);

        // Étape 3: Effectuer l'échange
        const swapTransaction = await performSwap(swapRoute, userKeyPair.publicKey);

        // Étape 4: Signer et exécuter la transaction
        await signAndExecuteTransaction(swapTransaction, userKeyPair);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Exécuter le script principal
main();
