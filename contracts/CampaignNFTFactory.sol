// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CampaignNFT.sol";

/**
 * @title CampaignNFTFactory
 * @dev Factory contract for deploying campaign-specific NFT contracts
 */
contract CampaignNFTFactory is Ownable {
    // Store all deployed campaign NFT contracts
    mapping(string => address) public campaignNFTs;

    // Events
    event CampaignNFTCreated(
        string indexed campaignId,
        address nftContract,
        address campaignOwner,
        address campaignTreasury
    );

    /**
     * @dev Create a new NFT contract for a campaign
     * @param campaignId Unique identifier for the campaign
     * @param campaignName Name of the campaign
     * @param symbol Symbol for the NFT token
     * @param defaultTokenURI IPFS link to the NFT metadata
     * @param minDonationAmount Minimum donation required for NFT eligibility
     * @param campaignOwner Address of the campaign owner
     * @param campaignTreasury Address of the campaign treasury contract
     * @return Address of the newly deployed NFT contract
     */
    function createCampaignNFT(
        string memory campaignId,
        string memory campaignName,
        string memory symbol,
        string memory defaultTokenURI,
        uint256 minDonationAmount,
        address campaignOwner,
        address campaignTreasury
    ) external returns (address) {
        require(campaignNFTs[campaignId] == address(0), "Campaign NFT already exists");

        // Ensure campaign owner is not zero address
        require(campaignOwner != address(0), "Campaign owner cannot be zero address");

        // Ensure treasury is not zero address
        require(campaignTreasury != address(0), "Treasury cannot be zero address");

        CampaignNFT newNFT = new CampaignNFT(
            campaignId,
            campaignName,
            symbol,
            defaultTokenURI,
            minDonationAmount,
            campaignOwner,
            campaignTreasury
        );

        address nftAddress = address(newNFT);
        campaignNFTs[campaignId] = nftAddress;

        emit CampaignNFTCreated(campaignId, nftAddress, campaignOwner, campaignTreasury);

        return nftAddress;
    }

    /**
     * @dev Get the NFT contract address for a specific campaign
     * @param campaignId Unique identifier for the campaign
     * @return Address of the campaign's NFT contract
     */
    function getCampaignNFT(string memory campaignId) external view returns (address) {
        return campaignNFTs[campaignId];
    }
}
