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
