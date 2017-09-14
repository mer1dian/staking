const HumanStandardToken = artifacts.require("./HumanStandardToken.sol");
const Stake = artifacts.require("./Stake.sol");

const expect = require("expect.js");
const fs = require('fs');
const BN = require('bn.js');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');

const ethRPC = new EthRPC(new HttpProvider('http://localhost:8545'));
const ethQuery = new EthQuery(new HttpProvider('http://localhost:8545'));

contract('Stake', (accounts) => {
  let token, stake;
  let user1 = accounts[1];
  let user2 = accounts[2];


  before(async function () {
    let token1 = await HumanStandardToken.new(100000, "LEV", 0, "LEV");
    token = await HumanStandardToken.at(token1.address);
    await token1.transfer(user1, 100);
    await token1.transfer(user2, 200);
    let stake = await Stake.deployed();
    await stake.setBlocks(100, 300);
    await token1.transfer(stake.address, 1000);
    await stake.setToken(token.address);
    await forceMine(new BN(200))
  });

  it('user should be able to put tokens for stake', async function () {
    stake = await Stake.deployed();
    await stakeit(10, user1, stake, token);
    await stakeit(15, user2, stake, token);
    await forceMine(new BN(250));
    await stakeit(15, user1, stake, token);
    await stakeit(20, user2, stake, token);
    expect(await balance(user1, token)).to.be.eql(75);
    expect(await balance(user2, token)).to.be.eql(165);
    expect(await balance(stake.address, token)).to.be.eql(1060);
    expect((await stake.totalLevs()).toNumber()).to.be.eql(60);
    expect((await stake.totalLevBlocks()).toNumber()).to.be.eql(10 * 98 + 15 * 48 + 15 * 96 + 20 * 46);
    expect((await stake.getStakes(user1)).toNumber()).to.be.eql(25);
    expect((await stake.getStakes(user2)).toNumber()).to.be.eql(35);
    expect((await stake.getLevBlocks(user1)).toNumber()).to.be.eql(10 * 98 + 15 * 48);
    expect((await stake.getLevBlocks(user2)).toNumber()).to.be.eql(15 * 96 + 20 * 46);
  });
});


async function stakeit(count, user, stake, token) {
  await token.approve(stake.address, count, {from: user});
  await stake.stakeTokens(count, {from: user});
}

function forceMine(blockToMine) {
  return new Promise(async (resolve, reject) => {
    if (!BN.isBN(blockToMine)) {
      reject('Supplied block number must be a BN.');
    }
    const blockNumber = await ethQuery.blockNumber();
    if (blockNumber.lt(blockToMine)) {
      ethRPC.sendAsync({method: 'evm_mine'}, (err) => {
        if (err !== undefined && err !== null) {
          reject(err);
        }
        resolve(forceMine(blockToMine));
      });
    } else {
      resolve();
    }
  });
}


async function balance(address, token) {
  return (await token.balanceOf(address)).toNumber();
}

