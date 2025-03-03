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
        it("Should allow owner to create a new campaign NFT", async function () {
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

            // Create a new campaign NFT
            const tx = await factory.connect(owner).createCampaignNFT(
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
            expect(await factory.campaignNFTs(campaignId)).to.equal(nftAddress);

            // Verify the deployed NFT contract has the correct parameters
            const CampaignNFT = await ethers.getContractFactory("CampaignNFT");
            const nftContract = CampaignNFT.attach(nftAddress) as CampaignNFT;

            expect(await nftContract.campaignId()).to.equal(campaignId);
            expect(await nftContract.campaignName()).to.equal(campaignName);
            expect(await nftContract.defaultTokenURI()).to.equal(defaultTokenURI);
            expect(await nftContract.minDonationAmount()).to.equal(minDonationAmount);
            expect(await nftContract.owner()).to.equal(campaignOwner.address);
            expect(await nftContract.campaignTreasury()).to.equal(treasury.address);
        });

        it("Should not allow non-owner to create a campaign NFT", async function () {
            const {
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner,
                treasury,
                supporter
            } = await loadFixture(deployCampaignNFTFactoryFixture);

            await expect(factory.connect(supporter).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            )).to.be.revertedWith("Ownable: caller is not the owner");
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
}); 