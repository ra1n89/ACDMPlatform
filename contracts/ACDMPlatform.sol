//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Token.sol";

/** @title ERC20 Token marketplace
 * @dev users can buy token on sale round and then sell and buy tokens on trade round
 * @author Rishat Akhmetzyanov
 * @notice not for using in real projects beacause it's not audited
 */
contract ACDMPlatform is ReentrancyGuard {
    Token public token;

    uint256 private roundTime;
    uint256 private id = 0;
    uint256 public supply = 100000 * (10**18);
    uint256 public volumeETH = 1 ether;
    uint256 public price = volumeETH / (supply / 10**18);
    uint256 public refBonusPercent = 5;
    uint256 public priceMultiplicator = 3; //1,03

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
        uint256 tokenPrice;
        address account;
        bool isOpen;
    }

    constructor(address _acdmToken, uint256 _roundTime) {
        roundTime = _roundTime;
        token = Token(_acdmToken);
    }

    /// @dev referal program registering
    function register(address referrer) public {
        referals[msg.sender] = referrer;
    }

    /// @dev start sale round during which users can only buy tokens from the Token Marketplace
    function startSaleRound() public {
        // if it's not first round, we cancel all open orders from trade  round
        if (id > 0) {
            for (uint256 i = 0; i < orders.length; i++) {
                token.transfer(orders[i].account, orders[i].amount);
            }
        }
        id++;
        registerRound();
        Round storage round = rounds[id];
        uint256 mintAmount = (volumeETH) / round.tokenPrice;
        token.mint(address(this), supply);
        // reset to zero for further calculations in buyOrder()
        volumeETH = 0;
        // calculating token price for following rounds
        price = price + (price * priceMultiplicator) / 100 + 0.000004 ether;
    }

    /// @dev buying tokens during sale round
    function buy(uint256 _amount) public payable nonReentrant {
        uint256 tokenBalance = token.balanceOf(address(this));
        uint256 refBonus = (refBonusPercent * msg.value) / 100;
        address _buyer = msg.sender;
        Round storage currentRound = rounds[id];
        uint256 etherSumm = currentRound.tokenPrice * _amount;
        require(_amount < tokenBalance, "tokens balance is not enought");
        require(currentRound.isSaleOrTradeRound == true, "round is not active");
        require(currentRound.endTime >= block.timestamp, "Sale round is over");
        //check summ of Eth for buying tokens
        require(msg.value >= etherSumm, "Summ of ethers is not enought");
        //sendind bonus to reffer
        withdraw(referals[msg.sender], refBonus);
        //sending token to buyer
        token.transfer(_buyer, _amount);
    }

    function registerRound() internal {
        rounds[id] = Round({
            roundID: id,
            tokenPrice: price,
            startTime: block.timestamp,
            endTime: block.timestamp + roundTime,
            isSaleOrTradeRound: true
        });
    }

    /// @dev start trade round during wich users can sell and buy token between each other
    function startTradeRound() public payable {
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance != 0) {
            require(
                rounds[id].endTime <= block.timestamp,
                "Sale round isn't over"
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

    function cancelOrder(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(order.account == msg.sender, "It's not your order");
        require(order.isOpen, "Order canceled already");

        token.transfer(order.account, order.amount);
        order.amount = 0;
        order.isOpen = false;
    }

    function buyOrder(uint256 _idOrder) public payable nonReentrant {
        Round storage round = rounds[id];
        require(
            round.isSaleOrTradeRound == false,
            "Wait the sail round will end"
        );
        require(round.endTime >= block.timestamp, "Trade round is over");

        Order storage order = orders[_idOrder];
        //counting amount of tokens which were paid
        uint256 amountPayedTokens = (msg.value / order.tokenPrice);

        token.transfer(msg.sender, amountPayedTokens);
        //saving left tokens
        order.amount -= amountPayedTokens;
        volumeETH += msg.value;
    }

    function withdraw(address _to, uint256 _amount) private {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }
}
