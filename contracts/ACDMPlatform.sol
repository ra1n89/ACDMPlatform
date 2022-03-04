//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract ACDMPlatform {
    Token public token;
    uint256 private roundTime;
    uint256 private id = 0;
    uint256 public supply = 100000 * (10**18);
    uint256 public volumeETH = 1;
    uint256 public price;
    // uint256 public tokenBalance = token.balanceOf(address(this));
    mapping(address => address) public referals;
    mapping(uint256 => Round) public rounds;
    Order[] public orders;

    struct Round {
        uint256 roundID;
        uint256 tokenPrice;
        uint256 startTime;
        uint256 endTime;
        bool isSaleOrTradeRound;
    }

    struct Order {
        uint256 amount;
        uint256 tokenPrice; // eth
        address account;
        bool isOpen;
    }

    constructor(address _acdmToken, uint256 _roundTime) {
        roundTime = _roundTime;
        token = Token(_acdmToken);
    }

    //реферальная программа
    function register(address referrer) public {
        referals[msg.sender] = referrer;
    }

    //1 раунд одна цена, первоначальная эмиссия (длится некоторый период)
    function startSaleRound() public {
        id++;
        registerRound();
        token.mint(address(this), supply);
    }

    function buy(uint256 _amount) public payable {
        uint256 tokenBalance = token.balanceOf(address(this));
        address _buyer = msg.sender;
        Round storage currentRound = rounds[id];
        uint256 etherSumm = currentRound.tokenPrice * _amount;
        require(_amount < tokenBalance, "tokens balance is not enought");
        require(currentRound.isSaleOrTradeRound == true, "round is not active");
        require(currentRound.endTime >= block.timestamp, "Sale round is over");
        //проверка суммы Eth для покупки токена
        require(msg.value >= etherSumm, "Summ of ethers is not enought");
        token.transfer(_buyer, _amount);
    }

    function registerRound() internal {
        //расчёт цены за 1 токен в weigh
        price = (volumeETH * 10**18) / (supply / 10**18);
        rounds[id] = Round({
            roundID: id,
            tokenPrice: price,
            startTime: block.timestamp,
            endTime: block.timestamp + roundTime,
            isSaleOrTradeRound: true
        });
    }

    function startTradeRound() public payable {
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance != 0) {
            require(
                rounds[id].endTime >= block.timestamp,
                "Sale round is over"
            );
        }
        if (tokenBalance > 0) {
            token.burn(address(this), tokenBalance);
        }
        id++;
        registerRound();
        Round storage currentRound = rounds[id];
        currentRound.isSaleOrTradeRound = false;
    }

    //2 раунд пользователи которые купили в 1 раунде теперь могут продавать в трейдраунде (длится некоторый период)
    function setOrder(uint256 _amount, uint256 _tokenPrice) public {
        require(
            rounds[id].isSaleOrTradeRound == false,
            "Wait the sail round will end"
        );
        token.transferFrom(msg.sender, address(this), _amount);

        orders.push(
            Order({
                account: msg.sender,
                amount: _amount,
                tokenPrice: _tokenPrice,
                isOpen: true
            })
        );
    }

    function buyOrder(uint256 _idOrder) public payable {
        require(
            rounds[id].isSaleOrTradeRound == false,
            "Wait the sail round will end"
        );
        Order storage order = orders[_idOrder];
        token.transfer(msg.sender, order.amount);
    }
}
