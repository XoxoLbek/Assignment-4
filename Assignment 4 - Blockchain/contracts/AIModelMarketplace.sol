// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Импорт интерфейса ERC-20

contract AIModelMarketplace {
    struct Model {
        uint256 id;
        string name;
        string description;
        uint256 price;
        address creator;
        uint8 rating;
        uint256 ratingCount;
    }

    mapping(uint256 => Model) public models;
    mapping(uint256 => mapping(address => bool)) public hasPurchased; // ✅ Фикс: теперь будем отмечать покупки
    uint256 public nextModelId;
    
    IERC20 public token;
    address public owner;

    event ModelListed(uint256 indexed id, string name, uint256 price, address indexed creator);
    event ModelPurchased(uint256 indexed id, address indexed buyer);
    event ModelRated(uint256 indexed id, uint8 rating, address indexed rater);
    event FundsWithdrawn(address indexed creator, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier hasBoughtModel(uint256 _id) {
        require(hasPurchased[_id][msg.sender], "Model not purchased");
        _;
    }

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }

    function listModel(string memory _name, string memory _description, uint256 _price) external {
        require(_price > 0, "Price must be greater than zero");
        models[nextModelId] = Model(nextModelId, _name, _description, _price, msg.sender, 0, 0);
        emit ModelListed(nextModelId, _name, _price, msg.sender);
        nextModelId++;
    }

    function purchaseModel(uint256 modelId) public {
        Model storage model = models[modelId];

        require(model.price > 0, "Model does not exist");
        require(token.allowance(msg.sender, address(this)) >= model.price, "Not enough allowance");
        require(token.balanceOf(msg.sender) >= model.price, "Not enough balance");

        // ✅ Фикс: проверяем, куплена ли модель уже
        require(!hasPurchased[modelId][msg.sender], "You already own this model");

        // ✅ Фикс: помечаем модель как купленную до транзакции
        hasPurchased[modelId][msg.sender] = true;

        // ✅ Переводим токены от покупателя к создателю модели
        require(token.transferFrom(msg.sender, model.creator, model.price), "Token transfer failed");

        emit ModelPurchased(modelId, msg.sender);
    }

    function rateModel(uint256 _id, uint8 _rating) external hasBoughtModel(_id) {
        require(_rating >= 1 && _rating <= 5, "Invalid rating value");
        Model storage model = models[_id];
        model.rating = uint8((model.rating * model.ratingCount + _rating) / (model.ratingCount + 1));
        model.ratingCount++;
        emit ModelRated(_id, _rating, msg.sender);
    }

    function withdrawFunds() external {
        uint256 amount = token.balanceOf(address(this)); // ✅ Теперь проверяем баланс контракта
        require(amount > 0, "No funds to withdraw");
        token.transfer(msg.sender, amount);
        emit FundsWithdrawn(msg.sender, amount);
    }

    function getModelDetails(uint256 _id) external view returns (string memory, string memory, uint256, address, uint8) {
        Model storage model = models[_id];
        return (model.name, model.description, model.price, model.creator, model.rating);
    }
}