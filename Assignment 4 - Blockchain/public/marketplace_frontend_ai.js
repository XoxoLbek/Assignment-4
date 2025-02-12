import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.6.1/dist/ethers.esm.min.js"; // ✅ Версия 6

const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const MARKETPLACE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

let account = null;
let provider = null;
let signer = null;
let marketplace = null;
let token = null;

async function init() {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = await provider.getSigner();

        try {
            // Загружаем ABI
            const marketplaceABI = await fetch("/contracts/AIModelMarketplace.json").then(res => res.json()).then(data => data.abi);
            const tokenABI = await fetch("/contracts/UniversityName_GroupNameToken.json").then(res => res.json()).then(data => data.abi);

            marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI, signer);
            token = new ethers.Contract(TOKEN_ADDRESS, tokenABI, signer);
            console.log("✅ Смарт-контракты загружены и инициализированы!");

        } catch (error) {
            console.error("🚨 Ошибка загрузки ABI:", error);
        }
    } else {
        console.error("🚨 MetaMask не найден!");
    }
}

async function checkBalance() {
    if (!token || !account) {
        console.error("🚨 Контракт токена не инициализирован или аккаунт не подключен!");
        return;
    }

    try {
        const balance = await token.balanceOf(account);
        const formattedBalance = ethers.formatUnits(balance, 18);
        
        console.log(`✅ Баланс токенов: ${formattedBalance} UNGT`);

        // Обновляем баланс в HTML-элементе
        const balanceElement = document.getElementById("tokenBalance");
        if (balanceElement) {
            balanceElement.innerText = formattedBalance; // Обновляем только число
        } else {
            console.warn("⚠️ Элемент с id='tokenBalance' не найден в DOM!");
        }

    } catch (error) {
        console.error("🚨 Ошибка получения баланса токена:", error);
    }
}

async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            account = accounts[0];
            document.getElementById("accountAddress").innerText = account;
            console.log("✅ Кошелек подключен:", account);

            await checkBalance();
            await getModels();
        } catch (error) {
            console.error("🚨 Ошибка при подключении кошелька:", error);
        }
    } else {
        console.error("🚨 MetaMask не найден!");
        alert("Установите MetaMask и попробуйте снова.");
    }
}

async function getModels() {
    if (!marketplace) {
        console.error("🚨 Marketplace контракт не инициализирован!");
        return;
    }

    try {
        const modelCount = await marketplace.nextModelId();
        let items = [];
        for (let i = 0; i < modelCount; i++) {
            const model = await marketplace.models(i);
            items.push({
                id: model.id,
                name: model.name,
                description: model.description,
                price: ethers.formatUnits(model.price, 18),
                creator: model.creator,
                rating: model.rating,
            });
        }
        console.log("✅ Загруженные модели:", items);
    } catch (error) {
        console.error("🚨 Ошибка загрузки моделей:", error);
    }
}

async function listModel() {
    const name = document.getElementById("modelName").value.trim();
    const description = document.getElementById("modelDescription").value.trim();
    const price = document.getElementById("modelPrice").value.trim();

    if (!name || !description || !price) {
        alert("⚠️ Заполните все поля!");
        return;
    }

    try {
        if (!token || !marketplace) {
            console.error("🚨 Контракт токена или маркетплейса не загружен!");
            return;
        }

        const priceInTokens = ethers.parseUnits(price.toString(), 18);

        // 1️⃣ ДАЁМ РАЗРЕШЕНИЕ на списание токенов
        const approveTx = await token.approve(marketplace.address, priceInTokens);
        await approveTx.wait(); // Ждём завершения approve

        console.log("✅ Разрешение на списание токенов выдано!");

        // 2️⃣ СПИСЫВАЕМ ТОКЕНЫ и создаём модель
        const tx = await marketplace.listModel(name, description, priceInTokens);
        await tx.wait(); // Ждём завершения транзакции

        console.log("✅ Модель успешно добавлена!");
        alert("Модель успешно добавлена!");

        await getModels(); // Обновляем список моделей

    } catch (error) {
        console.error("🚨 Ошибка при добавлении модели:", error);
        alert("Ошибка: " + error.message);
    }
}

// ✅ Навешиваем обработчик на форму
document.getElementById("modelForm").addEventListener("submit", async function (event) {
    event.preventDefault(); // Останавливаем стандартное поведение формы
    await listModel();
});

// Автоматическая инициализация
window.addEventListener("load", init);

// Подключаем кнопки
document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectWallet");
    if (connectButton) {
        connectButton.addEventListener("click", connectWallet);
    } else {
        console.error("🚨 Кнопка 'Connect Wallet' не найдена в DOM!");
    }
});