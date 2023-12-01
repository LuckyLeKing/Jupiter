const { Connection, Keypair, Transaction, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const { Token } = require('@solana/spl-token');
const fetch = require('cross-fetch');
const bs58 = require('bs58');
const yargs = require('yargs');


// Réception des arguments de la ligne de commande
const argv = yargs
    .option('action', {
        describe: 'Specify the action',
        type: 'string',
    })
    .option('contract', {
        describe: 'Specify the contract',
        type: 'string',
    })
    .option('slip', {
        describe: 'Specify the slip',
        type: 'number',
    })
    .option('quantity', {
        describe: 'Specify the quantity',
        type: 'number',
    })
    .option('wallet', {
        describe: 'Specify your secret key',
        type: 'string',
    })
    .help()
    .argv;

const inputAction = argv.action;
const inputContract = argv.contract;
const inputSlip = argv.slip;
const inputQuantity = argv.quantity;
const inputWallet = argv.wallet;


// Si inputAction est vide on met buy par défaut
if (inputAction === undefined) {
    inputAction = 'buy';
}
// Si inputContract est vide on retourne une erreur: "Contract is required""
if (inputContract === undefined) {
    console.log('Contract is required');
    return;
}
// Si inputSlip est vide on met 0.5 par défaut
if (inputSlip === undefined) {
    inputSlip = 0.5;
}
// Si inputQuantity est vide on retourne une erreur: "Quantity is required""
if (inputQuantity === undefined) {
    console.log('Quantity is required');
    return;
}
// Si inputWallet est vide on retourne une erreur: "Wallet is required""
if (inputWallet === undefined) {
    console.log('Wallet is required !');
    return;
}
// Vos informations
const privateKey = inputWallet;
const userKeyPair = Keypair.fromSecretKey(bs58.decode(privateKey));

// Endpoint RPC
const rpcEndpoint = 'https://neat-hidden-sanctuary.solana-mainnet.discover.quiknode.pro/2af5315d336f9ae920028bbb90a73b724dc1bbed/';
const connection = new Connection(rpcEndpoint, 'confirmed');

// Fonction qui récupère le nombre de décimales d'un token
async function getTokenDecimals(connection, tokenMintAddress) {
    let mint = await connection.getParsedAccountInfo(
        new PublicKey(tokenMintAddress)
    )
    decimals = mint.value.data.parsed.info.decimals
    // Si decimals est vide on retourne une erreur: "Token not found"
    if (decimals === undefined) {
        console.log('Token not found');
        return false;
    }
    return (decimals)
}

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
async function main(inputAction, inputContract, inputSlip, inputQuantity) {

    // Exemple d'utilisation
    const decimals = await getTokenDecimals(connection, inputContract);
    multiplicateur = Math.pow(10, decimals);


    try {
        // Étape 1: Récupérer la carte des routes
        const routeMap = await getRouteMap();
        // console.log('Route Map:', routeMap);

        if (inputAction === 'buy') {
            var inputMint = 'So11111111111111111111111111111111111111112'; // SOL
            var outputMint = inputContract;
        } else if (inputAction === 'sell') {
            var inputMint = inputContract;
            var outputMint = 'So11111111111111111111111111111111111111112'; // SOL
        }
        // 10000000 = 1 SOL
        const amount = inputQuantity * multiplicateur;
        const slippage = inputSlip * 100;
        // récupérer les arguments de la ligne de commande, le premier correspond à l'adresse du token à recevoir, le second à la quantité à échanger, le troisième au slippage

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
main(inputAction, inputContract, inputSlip, inputQuantity);
