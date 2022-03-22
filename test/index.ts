import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import { TcpSocketConnectOpts } from "net";
import { ACDMPlatform, ACDMPlatform__factory, Token, Token__factory } from "../typechain";


describe("ACDMPlatform", function () {
  let bob: SignerWithAddress,
    alice: SignerWithAddress;
  let token: Token;
  let acdmPlatform: ACDMPlatform;

  before(async () => {
    [bob, alice] = await ethers.getSigners();
  })

  beforeEach(async () => {
    const roundTime = 3 * 24 * 60 * 60;
    const Token = await ethers.getContractFactory("Token") as Token__factory;
    token = await Token.deploy() as Token;
    await token.deployed();
    const ACDMPlatform = await ethers.getContractFactory("ACDMPlatform") as ACDMPlatform__factory;
    acdmPlatform = await ACDMPlatform.deploy(token.address, roundTime) as ACDMPlatform;
    await acdmPlatform.deployed();
  })

  it("startSaleRound: should mint tokens for first round", async () => {
    const supply = ethers.utils.parseEther("100000")
    await acdmPlatform.startSaleRound();
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(supply);
  });

  it("buy: should send token to buyer", async () => {
    const supply1 = 100000;
    const supply = ethers.utils.parseEther(`${supply1}`);
    const _amount = 100;
    const tokenPrice1 = 0.00001
    const ethToPay1 = (_amount * tokenPrice1)
    const ethToPay = ethers.utils.parseEther(`${ethToPay1}`);
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    const diff = supply.sub(_amount);
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(diff);
  });

  it("startTradeRound: should revert if token balance > 0 and timeLock isn't over", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await expect(acdmPlatform.startTradeRound()).to.be.revertedWith("Sale round isn't over");
  });

  it("startTradeRound: should burn all tokens on ACDM if they are remaind", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const roundTime = 3 * 24 * 60 * 60;
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });

    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");

    await acdmPlatform.startTradeRound();
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(0);
  });


  it("setOrder: should revert if it's not a sail round", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = 1;
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });

    await token.approve(acdmPlatform.address, _amount);
    await expect(acdmPlatform.setOrder(_amount, _tokenPrice)).to.be.revertedWith("Wait the sail round will end")
  });

  it("setOrder: should transfer tokens from seller to ACDM contract", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = 1;

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(_amount);
  });


  it("buyOrder: should revert if sale round is going", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = ethers.utils.parseEther("1");
    const ethToPayTradeRound1 = _tokenPrice.mul(_amount);
    const ethToPayTradeRound = (`${ethToPayTradeRound1}`);

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await expect(acdmPlatform.buyOrder(0, { value: ethToPayTradeRound })).to.be.revertedWith("Wait the sail round will end");
  });

  it("buyOrder: should transfer tokens from contract to buyer", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = ethers.utils.parseEther("1");
    const ethToPayTradeRound1 = _tokenPrice.mul(_amount);
    const ethToPayTradeRound = (`${ethToPayTradeRound1}`);

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await expect(acdmPlatform.buyOrder(0, { value: ethToPayTradeRound })).to.be.revertedWith("Trade round is over");
  });

  it("buyOrder: should transfer tokens from contract to buyer", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = ethers.utils.parseEther("1");
    const ethToPayTradeRound1 = _tokenPrice.mul(_amount);
    const ethToPayTradeRound = (`${ethToPayTradeRound1}`);

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await acdmPlatform.buyOrder(0, { value: ethToPayTradeRound });
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(0);
  });

  it("cancelOrder: should revert if caller isn't an owner of order", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = 1;

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await expect(acdmPlatform.connect(alice).cancelOrder(0)).to.be.revertedWith("It's not your order");
  });

  it("cancelOrder: should revert if order was canceled already", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = 1;

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await acdmPlatform.cancelOrder(0);
    await expect(acdmPlatform.cancelOrder(0)).to.be.revertedWith("Order canceled already");
  });

  it("cancelOrder: should give back tokens to owner", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = 1;

    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(_amount);
    await acdmPlatform.cancelOrder(0);
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(0);
  });

  it("startTradeRound: should cancel all orders and give back tokens for sellers", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = ethers.utils.parseEther("1");

    await acdmPlatform.register(alice.address);
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await acdmPlatform.buyOrder(0, { value: _tokenPrice });
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startSaleRound();
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    await acdmPlatform.buyOrder(1, { value: _tokenPrice });
  });

  it("startSaleRound: should mint tokens for first round", async () => {
    const supply = ethers.utils.parseEther("100000")
    await acdmPlatform.startSaleRound();
    expect(await token.balanceOf(acdmPlatform.address)).to.be.equal(supply);
  });

  it("startSaleRound", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const roundTime = 3 * 24 * 60 * 60;
    const _amount = 100;
    const _tokenPrice = ethers.utils.parseEther("1");
    await acdmPlatform.register(alice.address);
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(_amount, { value: ethToPay });
    expect(await token.balanceOf(bob.address)).to.be.equal(_amount);
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(_amount, _tokenPrice);
    expect(await token.balanceOf(bob.address)).to.be.equal(0);
    await network.provider.send("evm_increaseTime", [roundTime]);
    await network.provider.send("evm_mine");
    await acdmPlatform.startSaleRound();
    expect(await token.balanceOf(bob.address)).to.be.equal(_amount);
  });
})
