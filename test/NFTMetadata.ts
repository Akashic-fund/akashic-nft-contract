import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("NFTMetadata", function () {
    async function deployNFTMetadataFixture() {
        const [owner] = await ethers.getSigners();

        const NFTMetadataFactory = await ethers.getContractFactory("NFTMetadata");
        const nftMetadata = await NFTMetadataFactory.deploy();

        return { nftMetadata, owner };
    }

    describe("Metadata Generation", function () {
        it("Should generate proper JSON metadata", async function () {
            const { nftMetadata } = await loadFixture(deployNFTMetadataFixture);

            const name = "Save the Trees";
            const description = "Support our reforestation campaign";
            const imageUri = "ipfs://QmXxxx/image.png";
            const campaignId = "campaign-123";
            const supporterNumber = 1;

            const metadata = await nftMetadata.createMetadata(
                name,
                description,
                imageUri,
                campaignId,
                supporterNumber
            );

            // Parse the JSON to verify structure
            const metadataObj = JSON.parse(metadata);

            expect(metadataObj.name).to.equal(name);
            expect(metadataObj.description).to.equal(description);
            expect(metadataObj.image).to.equal(imageUri);
            expect(metadataObj.attributes).to.be.an('array');
            expect(metadataObj.attributes[0].trait_type).to.equal("Campaign");
            expect(metadataObj.attributes[0].value).to.equal(campaignId);
            expect(metadataObj.attributes[1].trait_type).to.equal("Supporter Number");
            expect(parseInt(metadataObj.attributes[1].value)).to.equal(supporterNumber);
        });
    });
}); 