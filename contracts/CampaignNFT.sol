// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./NFTMetadata.sol";

/**
 * @title CampaignNFT
 * @dev NFT contract for campaign supporter rewards
 * Each campaign can have its own NFT collection
 */
contract CampaignNFT is ERC721URIStorage, Ownable {
    // Replace Counters with native uint256
    uint256 private _nextTokenId;

    // Campaign metadata
    string public campaignId;
    string public campaignName;
    string public defaultTokenURI;
    address public campaignTreasury;
    string public campaignDescription;

    // Metadata helper
    NFTMetadata public metadataHelper;

    // Donation tracking
    mapping(address => bool) public supporters;
    mapping(address => uint256) public supporterTokenIds;
    uint256 public minDonationAmount;

    // Events
    event SupporterNFTMinted(address indexed supporter, uint256 tokenId);
    event DefaultTokenURIUpdated(string newTokenURI);
    event MinDonationAmountUpdated(uint256 amount);
    event MetadataHelperUpdated(address metadataHelper);
    event CampaignDescriptionUpdated(string description);

    constructor(
        string memory _campaignId,
        string memory _campaignName,
        string memory _symbol,
        string memory _defaultTokenURI,
        uint256 _minDonationAmount,
        address _campaignOwner,
        address _campaignTreasury
    ) ERC721(_campaignName, _symbol) Ownable() {
        campaignId = _campaignId;
        campaignName = _campaignName;
        defaultTokenURI = _defaultTokenURI;
        minDonationAmount = _minDonationAmount;
        campaignTreasury = _campaignTreasury;
        _transferOwnership(_campaignOwner);

        // Initialize token ID to 1 to match test expectations
        _nextTokenId = 1;
    }

    /**
     * @dev Set the metadata helper contract
     * @param _metadataHelper Address of the NFTMetadata contract
     */
    function setMetadataHelper(address _metadataHelper) external onlyOwner {
        metadataHelper = NFTMetadata(_metadataHelper);
        emit MetadataHelperUpdated(_metadataHelper);
    }

    /**
     * @dev Set the campaign description
     * @param _description Description of the campaign
     */
    function setCampaignDescription(string memory _description) external onlyOwner {
        campaignDescription = _description;
        emit CampaignDescriptionUpdated(_description);
    }

    /**
     * @dev Mints a new NFT for a supporter
     * @param supporter Address of the campaign supporter
     * @return tokenId of the minted NFT
     */
    function mintSupporterNFT(address supporter) external returns (uint256) {
        require(
            msg.sender == owner() || msg.sender == campaignTreasury,
            "Only campaign owner or treasury can mint NFTs"
        );
        require(!supporters[supporter], "Supporter already has an NFT");

        uint256 newTokenId = _getNextTokenId();

        _mint(supporter, newTokenId);
        _setTokenURI(newTokenId, defaultTokenURI);

        supporters[supporter] = true;
        supporterTokenIds[supporter] = newTokenId;

        emit SupporterNFTMinted(supporter, newTokenId);

        return newTokenId;
    }

    /**
     * @dev Mints a new NFT for a supporter with custom metadata
     * @param supporter Address of the campaign supporter
     * @param imageUri IPFS URI of the supporter's image
     * @return tokenId of the minted NFT
     */
    function mintSupporterNFTWithMetadata(address supporter, string memory imageUri) external returns (uint256) {
        require(
            msg.sender == owner() || msg.sender == campaignTreasury,
            "Only campaign owner or treasury can mint NFTs"
        );
        require(!supporters[supporter], "Supporter already has an NFT");
        require(address(metadataHelper) != address(0), "Metadata helper not set");

        uint256 newTokenId = _getNextTokenId();

        // Generate metadata JSON
        string memory metadata = metadataHelper.createMetadata(
            campaignName,
            campaignDescription,
            imageUri,
            campaignId,
            newTokenId
        );

        _mint(supporter, newTokenId);
        _setTokenURI(newTokenId, metadata);

        supporters[supporter] = true;
        supporterTokenIds[supporter] = newTokenId;

        emit SupporterNFTMinted(supporter, newTokenId);

        return newTokenId;
    }

    /**
     * @dev Update the default token URI for new NFTs
     * @param newTokenURI IPFS link to the NFT metadata
     */
    function updateDefaultTokenURI(string memory newTokenURI) external onlyOwner {
        defaultTokenURI = newTokenURI;
        emit DefaultTokenURIUpdated(newTokenURI);
    }

    /**
     * @dev Update minimum donation amount for NFT eligibility
     * @param amount New minimum amount
     */
    function updateMinDonationAmount(uint256 amount) external onlyOwner {
        minDonationAmount = amount;
        emit MinDonationAmountUpdated(amount);
    }

    /**
     * @dev Custom token URI for individual NFTs (if needed)
     * @param tokenId NFT token ID
     * @param newTokenURI New IPFS URI for this specific token
     */
    function setCustomTokenURI(uint256 tokenId, string memory newTokenURI) external onlyOwner {
        // In OpenZeppelin 5.0.0, we need to use _ownerOf instead of _exists
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _setTokenURI(tokenId, newTokenURI);
    }

    /**
     * @dev Check if an address is a supporter
     * @param supporter Address to check
     * @return boolean indicating if address has supporter NFT
     */
    function isSupporter(address supporter) external view returns (bool) {
        return supporters[supporter];
    }

    /**
     * @dev Get the token ID owned by a supporter
     * @param supporter Address of the supporter
     * @return tokenId of the supporter's NFT, 0 if not a supporter
     */
    function getSupporterTokenId(address supporter) external view returns (uint256) {
        return supporterTokenIds[supporter];
    }

    /**
     * @dev Get total number of supporter NFTs minted
     * @return Total number of NFTs
     */
    function getTotalSupporters() external view returns (uint256) {
        // Subtract 1 because we start from 1, not 0
        return _nextTokenId - 1;
    }

    /**
     * @dev Helper function to get the next token ID and increment the counter
     * @return The next token ID
     */
    function _getNextTokenId() private returns (uint256) {
        return _nextTokenId++;
    }

    // Required override for the inherited contract
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // Required override for the inherited contract
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Required override for the inherited contract
    function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
        super._burn(tokenId);
    }
}
