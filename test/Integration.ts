import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { CampaignNFT } from "../types/contracts/CampaignNFT";

describe("Akashic NFT System Integration", function () {
    async function deployFullSystemFixture() {
        const [owner, campaignOwner, treasury, supporter1, supporter2] = await ethers.getSigners();

        // Deploy NFTMetadata
        const NFTMetadataFactory = await ethers.getContractFactory("NFTMetadata");
        const metadataHelper = await NFTMetadataFactory.deploy();

        // Deploy CampaignNFTFactory
        const CampaignNFTFactory = await ethers.getContractFactory("CampaignNFTFactory");
        const factory = await CampaignNFTFactory.deploy();

        // Deploy AkashicNFTRegistry
        const AkashicNFTRegistry = await ethers.getContractFactory("AkashicNFTRegistry");
        const registry = await AkashicNFTRegistry.deploy(await factory.getAddress());

        // Campaign parameters
        const campaignId = "campaign-123";
        const campaignName = "Save the Trees";
        const campaignDescription = "Help us plant 1 million trees worldwide";
        const symbol = "TREES";
        const defaultTokenURI = "ipfs://QmXxxx/metadata.json";
        const minDonationAmount = ethers.parseEther("0.01");
        const imageUri = "ipfs://QmYyyy/tree.png";

        return {
            metadataHelper,
            factory,
            registry,
            campaignId,
            campaignName,
            campaignDescription,
            symbol,
            defaultTokenURI,
            minDonationAmount,
            imageUri,
            owner,
            campaignOwner,
            treasury,
            supporter1,
            supporter2
        };
    }

    describe("End-to-End Campaign Creation and NFT Minting", function () {
        it("Should create a campaign, register it, and mint NFTs with metadata", async function () {
            const {
                metadataHelper,
                factory,
                registry,
                campaignId,
                campaignName,
                campaignDescription,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                imageUri,
                owner,
                campaignOwner,
                treasury,
                supporter1,
                supporter2
            } = await loadFixture(deployFullSystemFixture);

            // 1. Create a campaign NFT contract
            await factory.connect(owner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            const nftAddress = await factory.getCampaignNFT(campaignId);
            expect(nftAddress).to.not.equal(ethers.ZeroAddress);

            // 2. Register the campaign in the registry
            await registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            );

            const details = await registry.getCampaignNFTDetails(campaignId);
            expect(details.campaignId).to.equal(campaignId);
            expect(details.nftContract).to.equal(nftAddress);

            // 3. Set up the campaign NFT with metadata helper
            const CampaignNFT = await ethers.getContractFactory("CampaignNFT");
            const nftContract = CampaignNFT.attach(nftAddress) as CampaignNFT;

            await nftContract.connect(campaignOwner).setMetadataHelper(await metadataHelper.getAddress());
            await nftContract.connect(campaignOwner).setCampaignDescription(campaignDescription);

            // 4. Mint NFTs for supporters
            // First with default URI
            await nftContract.connect(campaignOwner).mintSupporterNFT(supporter1.address);
            expect(await nftContract.isSupporter(supporter1.address)).to.be.true;
            expect(await nftContract.tokenURI(1)).to.equal(defaultTokenURI);

            // Then with custom metadata
            await nftContract.connect(campaignOwner).mintSupporterNFTWithMetadata(supporter2.address, imageUri);
            expect(await nftContract.isSupporter(supporter2.address)).to.be.true;

            const tokenURI = await nftContract.tokenURI(2);
            expect(tokenURI).to.not.equal(defaultTokenURI);

            // 5. Update the registry with the new minted count
            await registry.connect(campaignOwner).updateCampaignNFT(
                campaignId,
                true,
                await nftContract.getTotalSupporters()
            );

            const updatedDetails = await registry.getCampaignNFTDetails(campaignId);
            expect(updatedDetails.totalMinted).to.equal(2);
        });
    });
}); 