const { Blockchain } = require("./blockchain");

const fastify = require("fastify")();
const cors = require("@fastify/cors");
fastify.register(cors);
// Blockchain and Block class (as defined earlier)
// ...
const miners = new Set();
const coin = new Blockchain();

fastify.post("/submit-block", async (request, reply) => {
  const proposedBlock = request.body;

  const success = await coin.mineBlock(proposedBlock);

  if (success) {
    proposedBlock.data.forEach((tx) => {
      if (tx.coninbase) {
        miners.add(tx.coninbase);
      }
    });

    return { result: "Block accepted. Thank you for mining!" };
  } else {
    return { result: "Block rejected. Invalid solution." };
  }
});

fastify.get("/get-mining-info", async (request, reply) => {
  const info = await coin.miningInfo();
  return info;
});

fastify.get("/get-balance", async (request, reply) => {
  const address = request.query.address;
  const wallet = coin.getBalanceOfAddress(address);
  return wallet;
});

fastify.get("/get-miners", async (request, reply) => {
  return coin.wallets;
});

module.exports = fastify;
