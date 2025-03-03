// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NFTMetadata
 * @dev Helper contract for managing NFT metadata
 */
contract NFTMetadata {
    struct Metadata {
        string name;
        string description;
        string image; // IPFS link to the image
        string campaignId;
        uint256 supporterNumber;
        uint256 timestamp;
    }

    /**
     * @dev Create JSON metadata string for NFT
     * This function is intended for off-chain use with libraries like ethers.js
     */
    function createMetadata(
        string memory name,
        string memory description,
        string memory imageUri,
        string memory campaignId,
        uint256 supporterNumber
    ) external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "{",
                    '"name": "',
                    name,
                    '", ',
                    '"description": "',
                    description,
                    '", ',
                    '"image": "',
                    imageUri,
                    '", ',
                    '"attributes": [',
                    '{"trait_type": "Campaign", "value": "',
                    campaignId,
                    '"}, ',
                    '{"trait_type": "Supporter Number", "value": ',
                    toString(supporterNumber),
                    "}, ",
                    '{"trait_type": "Support Date", "value": ',
                    toString(block.timestamp),
                    "}",
                    "]",
                    "}"
                )
            );
    }

    /**
     * @dev Convert uint to string
     * @param value The uint value
     * @return The string representation
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;

        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
