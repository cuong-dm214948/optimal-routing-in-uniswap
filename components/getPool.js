const { ethers } = require('ethers');
const axios = require('axios');
const uniswapPrice = require('uniswap-price');

const poolAbi = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
            { "indexed": false, "internalType": "int256", "name": "amount0", "type": "int256" },
            { "indexed": false, "internalType": "int256", "name": "amount1", "type": "int256" },
            { "indexed": false, "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
            { "indexed": false, "internalType": "uint128", "name": "liquidity", "type": "uint128" },
            { "indexed": false, "internalType": "int24", "name": "tick", "type": "int24" }
        ],
        "name": "Swap",
        "type": "event"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "slot0",
        "outputs": [
            { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
            { "internalType": "int24", "name": "tick", "type": "int24" },
            { "internalType": "uint16", "name": "observationIndex", "type": "uint16" },
            { "internalType": "uint16", "name": "observationCardinality", "type": "uint16" },
            { "internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16" },
            { "internalType": "uint8", "name": "feeProtocol", "type": "uint8" },
            { "internalType": "bool", "name": "unlocked", "type": "bool" }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

const tokenAbi = [
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

const provider = new ethers.providers.InfuraProvider(null, '98a0290a7a554c04888a2ff1ccdca49e');

const autorouter = async (sellToken, buyToken, amount) => {
    try {
        const URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

        const factoryQuery = `
        {
          factory(id: "0x1F98431c8aD98523631AE4a59f267346ea31F984") {
            poolCount
          }
        }
        `;
        const factoryResults = await axios.post(URL, { query: factoryQuery });
        const poolCount = factoryResults.data.data.factory.poolCount;
        console.log('Total number of pools:', poolCount); //22811

        const tokenIn = sellToken.toLowerCase();
        const tokenOut = buyToken.toLowerCase();

        const PER_PAGE = 1000;
        const pageCount = Math.ceil(poolCount / PER_PAGE);
        console.log(pageCount);

        let relevantPools = [];

        for (let i = 0; i < (pageCount - 17); i++) {
            const skip = i * PER_PAGE;
            const testQuery = `
                {
                    pools(first:${PER_PAGE}, skip:${skip}) {
                        id,
                        liquidity,
                        token0 {
                            id, symbol
                        },
                        token1 {
                            id, symbol
                        }
                    }
                }
            `;

            const result = await axios.post(URL, { query: testQuery });
            const pools = result.data.data.pools;

            const filteredPools = pools.filter(pool =>
                parseFloat(pool.liquidity) > 0 &&
                (pool.token0.id === tokenIn || pool.token1.id === tokenIn ||
                    pool.token0.id === tokenOut || pool.token1.id === tokenOut)
            );

            relevantPools = [...relevantPools, ...filteredPools];
        }

        console.log('Number of relevant pools:', relevantPools.length);

        // Create graph
        let graph = createGraph(relevantPools);

        let routes = findAllRoutes(graph, tokenIn, tokenOut);

        let {bestRoute, bestPrice} = await getBestPriceRoute(routes, tokenIn, tokenOut, relevantPools, amount);

        console.log('Best price route:', bestRoute);
        return {bestRoute, bestPrice};
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

const createGraph = (pools) => {
    let graph = {};
    pools.forEach(pool => {
        let { id, token0, token1 } = pool;
        if (!graph[token0.id]) graph[token0.id] = [];
        if (!graph[token1.id]) graph[token1.id] = [];
        graph[token0.id].push({ token: token1.id, poolId: id });
        graph[token1.id].push({ token: token0.id, poolId: id });
    });
    return graph;
}

const findAllRoutes = (graph, start, end, path = []) => {
    path = path.concat(start);
    if (start === end) {
        return [path];
    }
    if (!graph[start]) {
        return [];
    }
    let routes = [];
    for (let node of graph[start]) {
        if (!path.includes(node.token)) {
            let newRoutes = findAllRoutes(graph, node.token, end, path);
            for (let newRoute of newRoutes) {
                routes.push(newRoute);
            }
        }
    }
    return routes;
}

const getBestPriceRoute = async (routes, tokenIn, tokenOut, relevantPools, amount) => {
    let bestRoute = null;
    let bestPrice = Infinity;
    for (let route of routes) {
        try {
            let price = await getRouteQuote(route, tokenIn, tokenOut, relevantPools, amount);
            if (price < bestPrice) {
                bestPrice = price;
                bestRoute = route;
            }
        } catch (error) {
            console.error('Error getting quote for route', route, error);
        }
    }


    return {bestRoute,bestPrice};
}

const getRouteQuote = async (route, tokenIn, tokenOut, relevantPools, amount) => {
    const sellTokenDecimal = 18;
    let amount1 = ethers.utils.parseUnits(amount, sellTokenDecimal);  // 1 WETH in wei

    for (let i = 0; i < route.length - 1; i++) {
        let token0 = route[i];
        let token1 = route[i + 1];

        let pool = relevantPools.find(pool =>
            (pool.token0.id === token0 && pool.token1.id === token1) ||
            (pool.token1.id === token0 && pool.token0.id === token1)
        );

        let decimals0Promise = new ethers.Contract(pool.token0.id, tokenAbi, provider).decimals();
        let decimals1Promise = new ethers.Contract(pool.token1.id, tokenAbi, provider).decimals();

        let [decimals0, decimals1] = await Promise.all([decimals0Promise, decimals1Promise]);

        decimals0 = Number(decimals0); // Ensure decimals are of type number
        decimals1 = Number(decimals1); // Ensure decimals are of type number

        let data2 = await uniswapPrice.getExecutionPrice(token0, decimals0, token1, decimals1, amount1.toString());

        amount1 = ethers.utils.parseUnits(data2, decimals1);     
    }
    return amount1;
}

module.exports = { autorouter };
