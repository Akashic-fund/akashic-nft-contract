import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AkashicNFTRegistry", function () {
    async function deployRegistryFixture() {
        const [owner, campaignOwner, treasury, supporter] = await ethers.getSigners();

        // Deploy CampaignNFTFactory
        const CampaignNFTFactory = await ethers.getContractFactory("CampaignNFTFactory");
        const factory = await CampaignNFTFactory.deploy();

        // Deploy AkashicNFTRegistry
        const AkashicNFTRegistry = await ethers.getContractFactory("AkashicNFTRegistry");
        const registry = await AkashicNFTRegistry.deploy(await factory.getAddress());

        // Campaign parameters
        const campaignId = "campaign-123";
        const campaignName = "Save the Trees";
        const symbol = "TREES";
        const defaultTokenURI = "ipfs://QmXxxx/metadata.json";
        const minDonationAmount = ethers.parseEther("0.01");

        return {
            registry,
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
        it("Should set the correct factory address", async function () {
            const { registry, factory } = await loadFixture(deployRegistryFixture);

            expect(await registry.factory()).to.equal(await factory.getAddress());
        });
    });

    describe("Campaign Registration", function () {
        it("Should register a campaign NFT", async function () {
            const {
                registry,
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployRegistryFixture);

            // Create a campaign NFT
            await factory.connect(campaignOwner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            const nftAddress = await factory.getCampaignNFT(campaignId);

            // Register the campaign NFT
            await expect(registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            ))
                .to.emit(registry, "CampaignNFTRegistered")
                .withArgs(campaignId, nftAddress, campaignOwner.address);

            // Verify registration
            const details = await registry.getCampaignNFTDetails(campaignId);
            expect(details.campaignId).to.equal(campaignId);
            expect(details.campaignName).to.equal(campaignName);
            expect(details.nftContract).to.equal(nftAddress);
            expect(details.campaignOwner).to.equal(campaignOwner.address);
            expect(details.totalMinted).to.equal(0);
            expect(details.isActive).to.be.true;
        });

        it("Should not allow registering the same campaign twice", async function () {
            const {
                registry,
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployRegistryFixture);

            // Create a campaign NFT
            await factory.connect(campaignOwner).createCampaignNFT(
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                campaignOwner.address,
                treasury.address
            );

            const nftAddress = await factory.getCampaignNFT(campaignId);

            // Register the campaign NFT
            await registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            );

            // Try to register again
            await expect(registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            )).to.be.revertedWith("Campaign already registered");
        });
    });

    describe("Campaign Updates", function () {
        it("Should allow campaign owner to update campaign details", async function () {
            const {
                registry,
                factory,
                campaignId,
                campaignName,
                symbol,
                defaultTokenURI,
                minDonationAmount,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployRegistryFixture);

            // Create and register a campaign NFT
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

            await registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            );

            // Update campaign details
            const newTotalMinted = 5;
            const newIsActive = false;

            await expect(registry.connect(campaignOwner).updateCampaignNFT(
                campaignId,
                newIsActive,
                newTotalMinted
            ))
                .to.emit(registry, "CampaignNFTUpdated")
                .withArgs(campaignId, newIsActive, newTotalMinted);

            // Verify update
            const details = await registry.getCampaignNFTDetails(campaignId);
            expect(details.totalMinted).to.equal(newTotalMinted);
            expect(details.isActive).to.equal(newIsActive);
        });

        it("Should not allow non-owner to update campaign details", async function () {
            const {
                registry,
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
            } = await loadFixture(deployRegistryFixture);

            // Create and register a campaign NFT
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

            await registry.connect(owner).registerCampaignNFT(
                campaignId,
                campaignName,
                nftAddress,
                campaignOwner.address
            );

            // Try to update campaign details as non-owner
            await expect(registry.connect(supporter).updateCampaignNFT(
                campaignId,
                false,
                5
            )).to.be.revertedWith("Only campaign owner or registry owner can update");
        });
    });

    describe("Campaign Queries", function () {
        it("Should return all campaign IDs", async function () {
            const {
                registry,
                factory,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployRegistryFixture);

            // Create and register multiple campaigns
            const campaigns = [
                { id: "campaign-1", name: "Save the Trees", symbol: "TREES" },
                { id: "campaign-2", name: "Clean Oceans", symbol: "OCEAN" },
                { id: "campaign-3", name: "Protect Wildlife", symbol: "WILD" }
            ];

            for (const campaign of campaigns) {
                await factory.connect(owner).createCampaignNFT(
                    campaign.id,
                    campaign.name,
                    campaign.symbol,
                    "ipfs://QmXxxx/metadata.json",
                    ethers.parseEther("0.01"),
                    campaignOwner.address,
                    treasury.address
                );

                const nftAddress = await factory.getCampaignNFT(campaign.id);

                await registry.connect(owner).registerCampaignNFT(
                    campaign.id,
                    campaign.name,
                    nftAddress,
                    campaignOwner.address
                );
            }

            // Get all campaign IDs
            const allCampaignIds = await registry.getAllCampaignIds();

            expect(allCampaignIds.length).to.equal(campaigns.length);
            for (let i = 0; i < campaigns.length; i++) {
                expect(allCampaignIds[i]).to.equal(campaigns[i].id);
            }
        });

        it("Should return only active campaigns", async function () {
            const {
                registry,
                factory,
                owner,
                campaignOwner,
                treasury
            } = await loadFixture(deployRegistryFixture);

            // Create and register multiple campaigns
            const campaigns = [
                { id: "campaign-1", name: "Save the Trees", symbol: "TREES", active: true },
                { id: "campaign-2", name: "Clean Oceans", symbol: "OCEAN", active: false },
                { id: "campaign-3", name: "Protect Wildlife", symbol: "WILD", active: true }
            ];

            for (const campaign of campaigns) {
                await factory.connect(owner).createCampaignNFT(
                    campaign.id,
                    campaign.name,
                    campaign.symbol,
                    "ipfs://QmXxxx/metadata.json",
                    ethers.parseEther("0.01"),
                    campaignOwner.address,
                    treasury.address
                );

                const nftAddress = await factory.getCampaignNFT(campaign.id);

                await registry.connect(owner).registerCampaignNFT(
                    campaign.id,
                    campaign.name,
                    nftAddress,
                    campaignOwner.address
                );

                if (!campaign.active) {
                    await registry.connect(campaignOwner).updateCampaignNFT(
                        campaign.id,
                        false,
                        0
                    );
                }
            }

            // Get active campaigns
            const activeCampaigns = await registry.getActiveCampaigns();

            const expectedActiveCampaigns = campaigns.filter(c => c.active);
            expect(activeCampaigns.length).to.equal(expectedActiveCampaigns.length);

            for (let i = 0; i < activeCampaigns.length; i++) {
                expect(activeCampaigns[i].campaignId).to.equal(expectedActiveCampaigns[i].id);
                expect(activeCampaigns[i].campaignName).to.equal(expectedActiveCampaigns[i].name);
                expect(activeCampaigns[i].isActive).to.be.true;
            }
        });
    });

    describe("Factory Management", function () {
        it("Should allow owner to update factory address", async function () {
            const { registry, owner } = await loadFixture(deployRegistryFixture);

            // Deploy a new factory
            const NewCampaignNFTFactory = await ethers.getContractFactory("CampaignNFTFactory");
            const newFactory = await NewCampaignNFTFactory.deploy();

            // Update factory address
            await registry.connect(owner).setFactory(await newFactory.getAddress());

            // Verify update
            expect(await registry.factory()).to.equal(await newFactory.getAddress());
        });

        it("Should not allow non-owner to update factory address", async function () {
            const { registry, supporter } = await loadFixture(deployRegistryFixture);

            // Deploy a new factory
            const NewCampaignNFTFactory = await ethers.getContractFactory("CampaignNFTFactory");
            const newFactory = await NewCampaignNFTFactory.deploy();

            // Try to update factory address as non-owner
            await expect(registry.connect(supporter).setFactory(await newFactory.getAddress()))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
}); 