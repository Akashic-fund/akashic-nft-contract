import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { CampaignNFT } from "../types/contracts/CampaignNFT";

describe("CampaignNFTFactory", function () {
    async function deployCampaignNFTFactoryFixture() {
        // Get signers
        const [owner, campaignOwner, treasury, supporter] = await ethers.getSigners();

        // Deploy CampaignNFTFactory
        const CampaignNFTFactory = await ethers.getContractFactory("CampaignNFTFactory");
        const factory = await CampaignNFTFactory.deploy();

        // Campaign parameters
        const campaignId = "campaign-123";
        const campaignName = "Save the Trees";
        const symbol = "TREES";
        const defaultTokenURI = "ipfs://QmXxxx/metadata.json";
        const minDonationAmount = ethers.parseEther("0.01");

        return {
            factory,
            campaignId,
            campaignName,
            symbol,
            defaultTokenURI,
            minDonationAmount,
            owner,
            campaignOwner,
            treasury,
            supporter
        };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { factory, owner } = await loadFixture(deployCampaignNFTFactoryFixture);

            expect(await factory.owner()).to.equal(owner.address);
        });
    });

    describe("Creating Campaign NFTs", function () {
        it("Should allow any address to create a campaign NFT", async function () {
            const {
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                supporter,
                campaignOwner,
                treasury
            } = await loadFixture(deployCampaignNFTFactoryFixture);

            // Using a non-owner address (supporter) to create a campaign NFT
            const tx = await factory.connect(supporter).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            // Get the NFT address
            const nftAddress = await factory.getCampaignNFT(campaignId);

            // Verify the event with the actual address
            await expect(tx)
                .to.emit(factory, "CampaignNFTCreated")
                .withArgs(
                    campaignId,
                    nftAddress,
                    campaignOwner.address,
                    treasury.address
                );

            expect(nftAddress).to.not.equal(ethers.ZeroAddress);
        });

        it("Should not allow creating a campaign NFT with an existing ID", async function () {
            const {
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployCampaignNFTFactoryFixture);

            // Create first campaign NFT
            await factory.connect(owner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            // Try to create another with the same ID
            await expect(factory.connect(owner).createCampaignNFT(
                campaignId,
                "Another Campaign",
                "ANOTHER",
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            )).to.be.revertedWith("Campaign NFT already exists");
        });
    });

    describe("Integration with CampaignNFT", function () {
        it("Should allow minting NFTs through the created contract", async function () {
            const {
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                owner,
                campaignOwner,
                treasury,
                supporter
            } = await loadFixture(deployCampaignNFTFactoryFixture);

            // Create campaign NFT
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

            // Attach to the deployed NFT contract
            const CampaignNFT = await ethers.getContractFactory("CampaignNFT");
            const nftContract = CampaignNFT.attach(nftAddress) as CampaignNFT;

            // Mint an NFT for a supporter
            await expect(nftContract.connect(campaignOwner).mintSupporterNFT(supporter.address))
                .to.emit(nftContract, "SupporterNFTMinted")
                .withArgs(supporter.address, 1);

            expect(await nftContract.isSupporter(supporter.address)).to.be.true;
            expect(await nftContract.ownerOf(1)).to.equal(supporter.address);
        });
    });

    describe("Campaign NFT Creation", function () {
        it("Should allow any address to create a campaign NFT", async function () {
            const { factory, campaignId, campaignName, symbol, defaultTokenURI, minDonationAmount, supporter, treasury } = await loadFixture(deployCampaignNFTFactoryFixture);

            // Using a non-owner address (supporter) to create a campaign NFT
            const tx = await factory.connect(supporter).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                supporter.address,
                treasury.address
            );

            const nftAddress = await factory.getCampaignNFT(campaignId);

            // Verify the event with the actual address
            await expect(tx)
                .to.emit(factory, "CampaignNFTCreated")
                .withArgs(
                    campaignId,
                    nftAddress,
                    supporter.address,
                    treasury.address
                );

            expect(nftAddress).to.not.equal(ethers.ZeroAddress);
        });

        it("Should not allow creating a campaign with the same ID", async function () {
            const { factory, campaignId, campaignName, symbol, defaultTokenURI, minDonationAmount, owner, campaignOwner, treasury } = await loadFixture(deployCampaignNFTFactoryFixture);

            // First creation
            await factory.connect(owner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            // Second creation with same ID should fail
            await expect(factory.connect(campaignOwner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            )).to.be.revertedWith("Campaign NFT already exists");
        });

        it("Should not allow zero address as campaign owner", async function () {
            const { factory, campaignId, campaignName, symbol, defaultTokenURI, minDonationAmount, owner, treasury } = await loadFixture(deployCampaignNFTFactoryFixture);

            await expect(factory.connect(owner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                ethers.ZeroAddress,
                treasury.address
            )).to.be.revertedWith("Campaign owner cannot be zero address");
        });

        it("Should not allow zero address as treasury", async function () {
            const { factory, campaignId, campaignName, symbol, defaultTokenURI, minDonationAmount, owner, campaignOwner } = await loadFixture(deployCampaignNFTFactoryFixture);

            await expect(factory.connect(owner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                ethers.ZeroAddress
            )).to.be.revertedWith("Treasury cannot be zero address");
        });
    });
}); 