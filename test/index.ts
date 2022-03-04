import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
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
    const roundTime = 3 * 60 * 60;
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

  // it("buy: should send token to buyer", async () => {
  //   const supply1 = 100000;
  //   const supply = ethers.utils.parseEther(`${supply1}`);
  //   const _amount1 = 100;
  //   const tokenPrice1 = 0.00001;
  //   const ethToPay1 = _amount1 * tokenPrice1;
  //   const ethToPay = ethers.utils.parseEther(`${ethToPay1}`);
  //   await acdmPlatform.startSaleRound();
  //   await acdmPlatform.buy(_amount1, { value: ethToPay });
  //   const diff = supply1 - 
  //   expect(await token.balanceOf(acdmPlatform.address)).to.be.equal();
  // });

  it("startTradeRound", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await acdmPlatform.startTradeRound();
    console.log(await token.balanceOf(acdmPlatform.address));
  });

  it("startTradeRound", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await acdmPlatform.startTradeRound();
    console.log(await token.balanceOf(acdmPlatform.address));
  });

  it("setOrder", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = 1;
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(100, 1);
    console.log(await token.balanceOf(acdmPlatform.address));
  });

  it("buyOrder", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = 1;
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(100, 1);
    await acdmPlatform.buyOrder(0, { value: ethToPay });
    console.log(await token.balanceOf(acdmPlatform.address));
  });

  it("cancelOrder", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = 1;
    await acdmPlatform.startSaleRound();
    await acdmPlatform.buy(100, { value: ethToPay });
    await acdmPlatform.startTradeRound();
    await token.approve(acdmPlatform.address, _amount);
    await acdmPlatform.setOrder(100, 1);
    console.log(await token.balanceOf(acdmPlatform.address));
    await acdmPlatform.cancelOrder(0);
    console.log(await token.balanceOf(acdmPlatform.address));
  });

  it("check refBonus come to referal", async () => {
    const ethToPay = ethers.utils.parseEther("0.001");
    const _amount = 100;
    const _tokenPrice = 1;
    await acdmPlatform.register(alice.address);
    await acdmPlatform.startSaleRound();
    console.log(await alice.getBalance());
    await acdmPlatform.buy(100, { value: ethToPay });
    console.log(await alice.getBalance());
    // await acdmPlatform.startTradeRound();
    // await token.approve(acdmPlatform.address, _amount);
    // await acdmPlatform.setOrder(100, 1);
    // console.log(await token.balanceOf(acdmPlatform.address));
    // await acdmPlatform.cancelOrder(0);
    // console.log(await token.balanceOf(acdmPlatform.address));
  });







})
