// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CampaignNFT
 * @dev NFT contract for campaign supporter rewards
 * Each campaign can have its own NFT collection
 */
contract CampaignNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Campaign metadata
    string public campaignId;
    string public campaignName;
    string public defaultTokenURI;
    address public campaignTreasury;

    // Donation tracking
    mapping(address => bool) public supporters;
    uint256 public minDonationAmount;

    // Events
    event SupporterNFTMinted(address indexed supporter, uint256 tokenId);
    event DefaultTokenURIUpdated(string newTokenURI);
    event MinDonationAmountUpdated(uint256 amount);

    constructor(
        string memory _campaignId,
        string memory _campaignName,
        string memory _symbol,
        string memory _defaultTokenURI,
        uint256 _minDonationAmount,
        address _campaignOwner,
        address _campaignTreasury
    ) ERC721(_campaignName, _symbol) {
        campaignId = _campaignId;
        campaignName = _campaignName;
        defaultTokenURI = _defaultTokenURI;
        minDonationAmount = _minDonationAmount;
        campaignTreasury = _campaignTreasury;
        transferOwnership(_campaignOwner);
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

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(supporter, newTokenId);
        _setTokenURI(newTokenId, defaultTokenURI);

        supporters[supporter] = true;

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
        require(_exists(tokenId), "Token does not exist");
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
     * @dev Get total number of supporter NFTs minted
     * @return Total number of NFTs
     */
    function getTotalSupporters() external view returns (uint256) {
        return _tokenIds.current();
    }

    // Required overrides for the inherited contracts
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
