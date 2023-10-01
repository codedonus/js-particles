const { Block } = require("./blockchain");
const fetch = require("node-fetch-npm");
const config = require("./config");
const p2p = require("./p2p");
const { calculateHash, sleep } = require("./utils");

// Get latest block from the pool
async function getMiningInfo() {
  let miningInfo;
  try {
    const response = await fetch(config.pool + "/get-mining-info", {
      method: "GET",
    });

    const responseData = await response.json();
    miningInfo = responseData;
  } catch (error) {
    console.error(
      "Error fetch info from the pool wait 1 second and try again",
      error
    );
    await sleep(1000);
  }
  return miningInfo;
}

async function submitBlock(block) {
  // Send mined block to the pool
  try {
    const response = await fetch(config.pool + "/submit-block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(block),
    });

    const responseData = await response.json();
  } catch (error) {
    console.error(
      "Error submitting block to the pool wait 1 second and try again"
    );
    await sleep(1000);
  }
}

async function minePendingTransactions(miningRewardAddress) {
  const miningInfo = await getMiningInfo();
  if (!miningInfo) return;
  const latestBlock = miningInfo.latestBlock;
  const difficulty = miningInfo.difficulty;
  const miningReward = miningInfo.miningReward;
  const pendingTransactions = miningInfo.pendingTransactions;

  const coninbaseTx = {
    coninbase: miningRewardAddress,
    amount: miningReward,
  };
  pendingTransactions.push(coninbaseTx);

  const index = latestBlock.index + 1;
  let block = new Block(
    index,
    Date.now(),
    latestBlock.hash,
    "",
    pendingTransactions,
    0,
    difficulty
  );
  block = await mineBlock(block);
  await submitBlock(block);
}

async function mineBlock(block) {
  let checkTime = Date.now();
  let startTime = Date.now();
  let hashesTried = 0;

  while (
    block.hash.substring(0, block.difficulty) !==
    Array(block.difficulty + 1).join("0")
  ) {
    block.nonce++;
    block.hash = calculateHash(
      block.index,
      block.previousHash,
      block.data,
      block.timestamp,
      block.nonce
    );
    hashesTried++;

    // Output rate every second
    if (Date.now() - startTime > 1000) {
      process.stdout.write(`\rHashing rate: ${hashesTried} hashes/sec`);
      hashesTried = 0; // Reset the counter
      startTime = Date.now(); // Reset the timestamp
    }
    if (checkTime - Date.now() > 5000) {
      const miningInfo = await getMiningInfo();
      if (!miningInfo) return;
      const latestBlock = miningInfo.latestBlock;
      if (latestBlock.index >= block.index) {
        console.log("Block already mined by another miner");
        return;
      }
      checkTime = Date.now();
    }
  }

  console.log("\n"); // New line to ensure subsequent outputs are on a new line
  console.log(
    `Block mined: ${block.hash} height: ${block.index} difficulty: ${block.difficulty} nonce: ${block.nonce} coinbase :${block.data[0].coninbase}}`
  );
  return block;
}

async function autoMine(miningRewardAddress) {
  while (true) {
    await minePendingTransactions(miningRewardAddress);
  }
}
p2p.listen({ port: 3666 });

if (config.isMiner == 1) {
  autoMine(config.minerAddress);
}
