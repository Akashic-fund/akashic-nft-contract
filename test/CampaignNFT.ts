import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import { Signer } from "ethers";

describe("CampaignNFT", function () {
    // We define a fixture to reuse the same setup in every test
    async function deployCampaignNFTFixture() {
        // Get signers
        const [owner, treasury, supporter1, supporter2] = await ethers.getSigners();

        // Campaign parameters
        const campaignId = "campaign-123";
        const campaignName = "Save the Trees";
        const symbol = "TREES";
        const defaultTokenURI = "ipfs://QmXxxx/metadata.json";
        const minDonationAmount = ethers.parseEther("0.01");

        // Deploy CampaignNFT contract
        const CampaignNFT = await ethers.getContractFactory("CampaignNFT");
        const campaignNFT = await CampaignNFT.deploy(
            campaignId,
            campaignName,
            symbol,
            defaultTokenURI,
            minDonationAmount,
            owner.address,
            treasury.address
        );

        return {
            campaignNFT,
            campaignId,
            campaignName,
            symbol,
            defaultTokenURI,
            minDonationAmount,
            owner,
            treasury,
            supporter1,
            supporter2
        };
    }

    describe("Deployment", function () {
        it("Should set the correct campaign metadata", async function () {
            const { campaignNFT, campaignId, campaignName, defaultTokenURI, minDonationAmount, owner, treasury } =
                await loadFixture(deployCampaignNFTFixture);

            expect(await campaignNFT.campaignId()).to.equal(campaignId);
            expect(await campaignNFT.campaignName()).to.equal(campaignName);
            expect(await campaignNFT.defaultTokenURI()).to.equal(defaultTokenURI);
            expect(await campaignNFT.minDonationAmount()).to.equal(minDonationAmount);
            expect(await campaignNFT.owner()).to.equal(owner.address);
            expect(await campaignNFT.campaignTreasury()).to.equal(treasury.address);
        });
    });

    describe("Minting NFTs", function () {
        it("Should allow owner to mint NFTs for supporters", async function () {
            const { campaignNFT, owner, supporter1 } = await loadFixture(deployCampaignNFTFixture);

            await expect(campaignNFT.connect(owner).mintSupporterNFT(supporter1.address))
                .to.emit(campaignNFT, "SupporterNFTMinted")
                .withArgs(supporter1.address, 1);

            expect(await campaignNFT.isSupporter(supporter1.address)).to.be.true;
            expect(await campaignNFT.getSupporterTokenId(supporter1.address)).to.equal(1);
            expect(await campaignNFT.ownerOf(1)).to.equal(supporter1.address);
            expect(await campaignNFT.tokenURI(1)).to.equal(await campaignNFT.defaultTokenURI());
        });

        it("Should allow treasury to mint NFTs for supporters", async function () {
            const { campaignNFT, treasury, supporter1 } = await loadFixture(deployCampaignNFTFixture);

            await expect(campaignNFT.connect(treasury).mintSupporterNFT(supporter1.address))
                .to.emit(campaignNFT, "SupporterNFTMinted")
                .withArgs(supporter1.address, 1);

            expect(await campaignNFT.isSupporter(supporter1.address)).to.be.true;
        });

        it("Should not allow non-owner/treasury to mint NFTs", async function () {
            const { campaignNFT, supporter1, supporter2 } = await loadFixture(deployCampaignNFTFixture);

            await expect(campaignNFT.connect(supporter1).mintSupporterNFT(supporter2.address))
                .to.be.revertedWith("Only campaign owner or treasury can mint NFTs");
        });

        it("Should not allow minting multiple NFTs for the same supporter", async function () {
            const { campaignNFT, owner, supporter1 } = await loadFixture(deployCampaignNFTFixture);

            await campaignNFT.connect(owner).mintSupporterNFT(supporter1.address);

            await expect(campaignNFT.connect(owner).mintSupporterNFT(supporter1.address))
                .to.be.revertedWith("Supporter already has an NFT");
        });

        it("Should track total number of supporters correctly", async function () {
            const { campaignNFT, owner, supporter1, supporter2 } = await loadFixture(deployCampaignNFTFixture);

            expect(await campaignNFT.getTotalSupporters()).to.equal(0);

            await campaignNFT.connect(owner).mintSupporterNFT(supporter1.address);
            expect(await campaignNFT.getTotalSupporters()).to.equal(1);

            await campaignNFT.connect(owner).mintSupporterNFT(supporter2.address);
            expect(await campaignNFT.getTotalSupporters()).to.equal(2);
        });
    });

    describe("Updating metadata", function () {
        it("Should allow owner to update default token URI", async function () {
            const { campaignNFT, owner } = await loadFixture(deployCampaignNFTFixture);

            const newTokenURI = "ipfs://QmNewURI/metadata.json";

            await expect(campaignNFT.connect(owner).updateDefaultTokenURI(newTokenURI))
                .to.emit(campaignNFT, "DefaultTokenURIUpdated")
                .withArgs(newTokenURI);

            expect(await campaignNFT.defaultTokenURI()).to.equal(newTokenURI);
        });

        it("Should not allow non-owner to update default token URI", async function () {
            const { campaignNFT, supporter1 } = await loadFixture(deployCampaignNFTFixture);

            const newTokenURI = "ipfs://QmNewURI/metadata.json";

            await expect(campaignNFT.connect(supporter1).updateDefaultTokenURI(newTokenURI))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to update minimum donation amount", async function () {
            const { campaignNFT, owner } = await loadFixture(deployCampaignNFTFixture);

            const newAmount = ethers.parseEther("0.05");

            await expect(campaignNFT.connect(owner).updateMinDonationAmount(newAmount))
                .to.emit(campaignNFT, "MinDonationAmountUpdated")
                .withArgs(newAmount);

            expect(await campaignNFT.minDonationAmount()).to.equal(newAmount);
        });

        it("Should allow owner to set custom token URI for specific NFTs", async function () {
            const { campaignNFT, owner, supporter1 } = await loadFixture(deployCampaignNFTFixture);

            // First mint an NFT
            await campaignNFT.connect(owner).mintSupporterNFT(supporter1.address);

            const customURI = "ipfs://QmCustomURI/special.json";
            await campaignNFT.connect(owner).setCustomTokenURI(1, customURI);

            expect(await campaignNFT.tokenURI(1)).to.equal(customURI);
        });

        it("Should not allow setting custom URI for non-existent tokens", async function () {
            const { campaignNFT, owner } = await loadFixture(deployCampaignNFTFixture);

            const customURI = "ipfs://QmCustomURI/special.json";
            await expect(campaignNFT.connect(owner).setCustomTokenURI(999, customURI))
                .to.be.revertedWith("Token does not exist");
        });
    });
}); 