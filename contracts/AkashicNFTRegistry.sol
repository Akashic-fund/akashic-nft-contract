// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CampaignNFTFactory.sol";

/**
 * @title AkashicNFTRegistry
 * @dev Central registry for all Akashic NFT contracts
 */
contract AkashicNFTRegistry is Ownable {
    struct CampaignNFTDetails {
        string campaignId;
        string campaignName;
        address nftContract;
        address campaignOwner;
        uint256 totalMinted;
        bool isActive;
    }

    // Maps campaignId to campaign details
    mapping(string => CampaignNFTDetails) private campaignRegistry;
    // List of all registered campaign IDs
    string[] private allCampaignIds;

    // Factory contract reference
    CampaignNFTFactory public factory;

    // Events
    event CampaignNFTRegistered(string campaignId, address nftContract, address campaignOwner);
    event CampaignNFTUpdated(string campaignId, bool isActive, uint256 totalMinted);

    constructor(address factoryAddress) {
        factory = CampaignNFTFactory(factoryAddress);
    }

    /**
     * @dev Register a new campaign NFT
     * @param campaignId Unique identifier for the campaign
     * @param campaignName Name of the campaign
     * @param nftContract Address of the NFT contract
     * @param campaignOwner Address of the campaign owner
     */
    function registerCampaignNFT(
        string memory campaignId,
        string memory campaignName,
        address nftContract,
        address campaignOwner
    ) external onlyOwner {
        require(campaignRegistry[campaignId].nftContract == address(0), "Campaign already registered");

        campaignRegistry[campaignId] = CampaignNFTDetails({
            campaignId: campaignId,
            campaignName: campaignName,
            nftContract: nftContract,
            campaignOwner: campaignOwner,
            totalMinted: 0,
            isActive: true
        });

        allCampaignIds.push(campaignId);

        emit CampaignNFTRegistered(campaignId, nftContract, campaignOwner);
    }

    /**
     * @dev Update campaign NFT details
     * @param campaignId Unique identifier for the campaign
     * @param isActive Status of the campaign
     * @param totalMinted Total NFTs minted
     */
    function updateCampaignNFT(string memory campaignId, bool isActive, uint256 totalMinted) external {
        CampaignNFTDetails storage details = campaignRegistry[campaignId];
        require(details.nftContract != address(0), "Campaign not registered");
        require(
            msg.sender == details.campaignOwner || msg.sender == owner(),
            "Only campaign owner or registry owner can update"
        );

        details.isActive = isActive;
        details.totalMinted = totalMinted;

        emit CampaignNFTUpdated(campaignId, isActive, totalMinted);
    }

    /**
     * @dev Get campaign NFT details
     * @param campaignId Unique identifier for the campaign
     * @return Campaign NFT details
     */
    function getCampaignNFTDetails(string memory campaignId) external view returns (CampaignNFTDetails memory) {
        return campaignRegistry[campaignId];
    }

    /**
     * @dev Get all registered campaign IDs
     * @return Array of campaign IDs
     */
    function getAllCampaignIds() external view returns (string[] memory) {
        return allCampaignIds;
    }

    /**
     * @dev Get active campaign details
     * @return Array of active campaign details
     */
    function getActiveCampaigns() external view returns (CampaignNFTDetails[] memory) {
        uint256 activeCount = 0;

        // Count active campaigns
        for (uint i = 0; i < allCampaignIds.length; i++) {
            if (campaignRegistry[allCampaignIds[i]].isActive) {
                activeCount++;
            }
        }

        // Create array of active campaigns
        CampaignNFTDetails[] memory activeCampaigns = new CampaignNFTDetails[](activeCount);
        uint256 index = 0;

        for (uint i = 0; i < allCampaignIds.length; i++) {
            CampaignNFTDetails storage details = campaignRegistry[allCampaignIds[i]];
            if (details.isActive) {
                activeCampaigns[index] = details;
                index++;
            }
        }

        return activeCampaigns;
    }

    /**
     * @dev Set a new factory contract
     * @param newFactory Address of the new factory contract
     */
    function setFactory(address newFactory) external onlyOwner {
        factory = CampaignNFTFactory(newFactory);
    }
}
