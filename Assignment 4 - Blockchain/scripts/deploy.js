const hre = require("hardhat");

async function main() {
    // Указываем начальное количество токенов (1 миллион UNGT)
    const initialSupply = hre.ethers.parseUnits("1000000", 18);

    // Развертывание ERC-20 токена
    const Token = await hre.ethers.getContractFactory("UniversityName_GroupNameToken");
    const token = await Token.deploy(initialSupply);
    await token.waitForDeployment();

    // Получение адреса токена
    const tokenAddress = await token.getAddress();

    // Развертывание маркетплейса с передачей адреса токена
    const Marketplace = await hre.ethers.getContractFactory("AIModelMarketplace");
    const marketplace = await Marketplace.deploy(tokenAddress);
    await marketplace.waitForDeployment();

    console.log(`✅ Token deployed at: ${tokenAddress}`);
    console.log(`✅ Marketplace deployed at: ${await marketplace.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});