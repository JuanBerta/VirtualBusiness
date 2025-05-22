// script.js
console.log('--- Script Start ---');

// --- Utility for Logging ---
function logFunctionStart(functionName) {
    console.log(`--- Function Start: ${functionName} ---`);
}
function logFunctionEnd(functionName) {
    console.log(`--- Function End: ${functionName} ---`);
}

// Define basic data structures for the game
class Product {
    constructor(name, basePrice) {
        this.name = name;
        this.basePrice = basePrice;
        // console.log(`New Product created: ${name}, Base Price: ${basePrice}`);
    }
}

class Supplier {
    constructor(name) {
        this.name = name;
        this.inventory = []; // Array of {product: Product, quantity: number, price: number, basePrice: number}
    }

    addProduct(product, quantity, price) {
        this.inventory.push({ product, quantity, price, basePrice: product.basePrice });
    }

    updatePrices() {
        logFunctionStart('Supplier.updatePrices for ' + this.name);
        this.inventory.forEach(item => {
            const oldPrice = item.price;
            const basePrice = item.basePrice; 
            let currentPrice = item.price;
            if (item.quantity > 150) currentPrice -= basePrice * 0.015; 
            else if (item.quantity < 50) currentPrice += basePrice * 0.015; 
            item.price = parseFloat(Math.max(basePrice * 0.7, Math.min(currentPrice, basePrice * 1.5)).toFixed(2));
            if (oldPrice !== item.price) console.log(`Price for ${item.product.name} in ${this.name} changed from $${oldPrice} to $${item.price} (Qty: ${item.quantity})`);
        });
        logFunctionEnd('Supplier.updatePrices for ' + this.name);
    }
}

class Wholesaler {
    constructor(name) {
        this.name = name;
        this.demand = []; 
    }

    addDemand(product, quantity, price) {
        this.demand.push({ 
            product, quantity, price, 
            initialDemandPrice: price, 
            unitsPurchasedLastTurn: 0, turnsWithoutPurchase: 0 
        });
    }

    generateContract() {
        logFunctionStart('Wholesaler.generateContract for ' + this.name);
        if (this.demand.length === 0) {
            logFunctionEnd('Wholesaler.generateContract for ' + this.name);
            return null;
        }
        const demandItem = this.demand[Math.floor(Math.random() * this.demand.length)];
        const product = demandItem.product;
        const contractQuantity = Math.floor(Math.random() * 31) + 10; 
        const contractPricePerUnit = parseFloat((demandItem.price * 1.05).toFixed(2)); 
        const deadline = currentTurn + Math.floor(Math.random() * 6) + 5; 
        const newContract = new Contract(product.name, contractQuantity, contractPricePerUnit, deadline, this.name);
        console.log(`Generated contract by ${this.name}: ${newContract.quantity} of ${newContract.productName} @ $${newContract.pricePerUnit}, deadline Turn ${newContract.deadlineTurns}`);
        logFunctionEnd('Wholesaler.generateContract for ' + this.name);
        return newContract;
    }

    updateDemandPrices() {
        logFunctionStart('Wholesaler.updateDemandPrices for ' + this.name);
        this.demand.forEach(item => {
            const oldPrice = item.price;
            const initialPrice = item.initialDemandPrice;
            let currentPrice = item.price;
            if (item.unitsPurchasedLastTurn > 0) {
                currentPrice -= initialPrice * 0.02 * (item.unitsPurchasedLastTurn / 10); 
                item.turnsWithoutPurchase = 0;
            } else {
                item.turnsWithoutPurchase++;
                if (item.turnsWithoutPurchase > 2) currentPrice += initialPrice * 0.01;
            }
            item.unitsPurchasedLastTurn = 0;
            item.price = parseFloat(Math.max(initialPrice * 0.7, Math.min(currentPrice, initialPrice * 1.3)).toFixed(2));
            if (oldPrice !== item.price) console.log(`Demand price for ${item.product.name} in ${this.name} changed from $${oldPrice} to $${item.price}`);
        });
        logFunctionEnd('Wholesaler.updateDemandPrices for ' + this.name);
    }
}

class Contract {
    constructor(productName, quantity, pricePerUnit, deadlineTurns, issuerNPC) {
        this.productName = productName; 
        this.quantity = quantity;
        this.pricePerUnit = pricePerUnit;
        this.deadlineTurns = deadlineTurns; 
        this.issuerNPC = issuerNPC; 
        this.status = 'pending'; 
        this.id = Date.now().toString(36) + Math.random().toString(36).substr(2); 
    }
}

class Player {
    constructor(initialMoney = 1000) {
        this.money = initialMoney;
        this.inventory = []; 
        this.acceptedContracts = []; 
    }

    addProductToInventory(product, quantity, purchasePrice = 0) { 
        const existingProductItem = this.inventory.find(item => item.product.name === product.name);
        if (existingProductItem) existingProductItem.quantity += quantity;
        else this.inventory.push({ product: product, quantity: quantity });
    }

    removeProductFromInventory(productName, quantity) {
        const productIndex = this.inventory.findIndex(item => item.product.name === productName);
        if (productIndex > -1) {
            if (this.inventory[productIndex].quantity > quantity) {
                this.inventory[productIndex].quantity -= quantity;
                return true;
            } else if (this.inventory[productIndex].quantity === quantity) {
                this.inventory.splice(productIndex, 1);
                return true;
            }
        }
        return false; 
    }

    hasEnoughProduct(productName, quantity) {
        const productItem = this.inventory.find(item => item.product.name === productName);
        return productItem && productItem.quantity >= quantity;
    }
}

// --- UI Feedback ---
let notificationTimeout;
function showNotification(message, type = 'info') {
    logFunctionStart('showNotification');
    console.log(`Notification: [${type.toUpperCase()}] ${message}`);
    const notificationsArea = document.getElementById('notifications-area');
    if (!notificationsArea) {
        logFunctionEnd('showNotification');
        return;
    }
    if (notificationTimeout) clearTimeout(notificationTimeout);
    const notification = document.createElement('p');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationsArea.innerHTML = ''; 
    notificationsArea.appendChild(notification);
    notificationTimeout = setTimeout(() => {
        if (notificationsArea.contains(notification)) {
            notificationsArea.removeChild(notification);
        }
    }, 5000);
    logFunctionEnd('showNotification');
}


// --- NPC Generation Functions ---
function generateSupplierNPCs(products, count) {
    logFunctionStart('generateSupplierNPCs');
    const suppliers = [];
    const supplierNames = ["Farm Fresh Co.", "Reliable Goods Inc.", "Speedy Supplies Ltd.", "Global Produce"];
    for (let i = 0; i < count; i++) {
        const name = supplierNames[i % supplierNames.length] + (Math.floor(i / supplierNames.length) > 0 ? ` ${Math.floor(i / supplierNames.length) +1}` : '');
        const supplier = new Supplier(name);
        const numProductsToOffer = Math.floor(Math.random() * Math.min(products.length, 2)) + 1; 
        const shuffledProducts = [...products].sort(() => 0.5 - Math.random()); 
        for (let j = 0; j < numProductsToOffer; j++) {
            const product = shuffledProducts[j];
            const quantity = Math.floor(Math.random() * 101) + 50; // 50-150 units - OK
            const priceVariation = (Math.random() * 0.2) - 0.1; 
            const price = parseFloat((product.basePrice * (1 + priceVariation)).toFixed(2));
            supplier.addProduct(product, quantity, price); 
        }
        suppliers.push(supplier);
    }
    console.log(`Generated ${suppliers.length} suppliers.`);
    logFunctionEnd('generateSupplierNPCs');
    return suppliers;
}

function generateWholesalerNPCs(products, count) {
    logFunctionStart('generateWholesalerNPCs');
    const wholesalers = [];
    const wholesalerNames = ["City Mart", "General Traders", "Bulk Buyers LLC", "Super Value Grocers"];
    for (let i = 0; i < count; i++) {
        const name = wholesalerNames[i % wholesalerNames.length] + (Math.floor(i / wholesalerNames.length) > 0 ? ` ${Math.floor(i / wholesalerNames.length) +1}` : '');
        const wholesaler = new Wholesaler(name);
        const numProductsToDemand = Math.floor(Math.random() * Math.min(products.length, 2)) + 1; 
        const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numProductsToDemand; j++) {
            const product = shuffledProducts[j];
            const quantity = Math.floor(Math.random() * 61) + 20; // 20-80 units - OK
            const priceVariation = (Math.random() * 0.2) + 0.05; 
            const price = parseFloat((product.basePrice * (1 + priceVariation)).toFixed(2));
            wholesaler.addDemand(product, quantity, price); 
        }
        wholesalers.push(wholesaler);
    }
    console.log(`Generated ${wholesalers.length} wholesalers.`);
    logFunctionEnd('generateWholesalerNPCs');
    return wholesalers;
}

// --- Game State Variables ---
let gameProducts = [];
let gameSuppliers = [];
let gameWholesalers = [];
let player;
let marketContracts = []; 
let currentTurn = 0;

// --- Display Functions ---
function displayPlayerInfo() {
    logFunctionStart('displayPlayerInfo');
    const playerInfoDiv = document.getElementById('player-info');
    if (!playerInfoDiv || !player) {
        logFunctionEnd('displayPlayerInfo');
        return;
    }
    let inventoryHTML = '<ul>';
    if (player.inventory.length === 0) inventoryHTML += '<li>Empty</li>';
    else player.inventory.forEach(item => inventoryHTML += `<li>${item.product.name}: ${item.quantity}</li>`);
    inventoryHTML += '</ul>';
    playerInfoDiv.innerHTML = `
        <p><strong>Money:</strong> $${player.money.toFixed(2)}</p>
        <p><strong>Turn:</strong> ${currentTurn}</p>
        <p><strong>Inventory:</strong></p>${inventoryHTML}
        <p><strong>Accepted Contracts:</strong></p><div id="player-contracts"></div>`;
    console.log(`Player Info: Money $${player.money.toFixed(2)}, Turn ${currentTurn}, Inventory items: ${player.inventory.length}`);
    displayPlayerAcceptedContracts(); // This is a sub-display function, logs within it.
    logFunctionEnd('displayPlayerInfo');
}

function displayPlayerAcceptedContracts() {
    logFunctionStart('displayPlayerAcceptedContracts');
    const playerContractsDiv = document.getElementById('player-contracts');
    if(!playerContractsDiv || !player) {
        logFunctionEnd('displayPlayerAcceptedContracts');
        return;
    }
    let contractsHTML = '<ul>';
    if (player.acceptedContracts.length === 0) contractsHTML += '<li>None</li>';
    else {
        player.acceptedContracts.forEach((contract) => {
            let fulfillButtonHTML = '';
            let note = '';
            if (contract.status === 'active') {
                const canFulfill = player.hasEnoughProduct(contract.productName, contract.quantity);
                fulfillButtonHTML = `<button onclick="fulfillContract('${contract.id}')" ${!canFulfill ? 'disabled' : ''}>Attempt Fulfill</button>`;
                if (!canFulfill) note = ` <small style="color: #777;">(Not enough ${contract.productName})</small>`;
            }
            contractsHTML += `
                <li>
                    ${contract.quantity} of ${contract.productName} for ${contract.issuerNPC} 
                    @ $${contract.pricePerUnit}/unit. Deadline: Turn ${contract.deadlineTurns}. 
                    Status: ${contract.status}${fulfillButtonHTML}${note}
                </li>`;
        });
    }
    contractsHTML += '</ul>';
    playerContractsDiv.innerHTML = contractsHTML;
    console.log(`Displayed ${player.acceptedContracts.length} accepted contracts for player.`);
    logFunctionEnd('displayPlayerAcceptedContracts');
}

function displaySuppliers() {
    logFunctionStart('displaySuppliers');
    const suppliersInfoDiv = document.getElementById('suppliers-info');
    if (!suppliersInfoDiv) {
        logFunctionEnd('displaySuppliers');
        return;
    }
    suppliersInfoDiv.innerHTML = '<h2>Suppliers</h2>';
    gameSuppliers.forEach((supplier, supplierIndex) => {
        let productsHTML = '<ul>';
        supplier.inventory.forEach((item, productIndex) => {
            const افورڈ = player.money >= item.price; 
            const buttonDisabled = !افورڈ || item.quantity === 0;
            let note = '';
            if (item.quantity === 0) note = ` <small style="color: #777;">(Out of stock)</small>`;
            else if (!افورڈ) note = ` <small style="color: #777;">(Cannot afford)</small>`;
            
            productsHTML += `
                <li>
                    ${item.product.name} (Qty: ${item.quantity}, Price: $${item.price.toFixed(2)})
                    <input type="number" id="buyQty-${supplierIndex}-${productIndex}" value="1" min="1" max="${item.quantity}" ${buttonDisabled ? 'disabled' : ''}>
                    <button onclick="buyFromSupplier(${supplierIndex}, ${productIndex}, document.getElementById('buyQty-${supplierIndex}-${productIndex}').value)" ${buttonDisabled ? 'disabled' : ''}>Buy</button>${note}
                </li>`;
        });
        productsHTML += '</ul>';
        suppliersInfoDiv.innerHTML += `<div><h3>${supplier.name}</h3>${productsHTML}</div>`;
    });
    console.log(`Displayed ${gameSuppliers.length} suppliers.`);
    logFunctionEnd('displaySuppliers');
}

function displayWholesalers() {
    logFunctionStart('displayWholesalers');
    const wholesalersInfoDiv = document.getElementById('wholesalers-info');
    if (!wholesalersInfoDiv) {
        logFunctionEnd('displayWholesalers');
        return;
    }
    wholesalersInfoDiv.innerHTML = '<h2>Wholesalers</h2>';
    gameWholesalers.forEach((wholesaler, wholesalerIndex) => {
        let demandsHTML = '<ul>';
        wholesaler.demand.forEach((item, productIndex) => {
            const canSell = player.hasEnoughProduct(item.product.name, 1); 
            const buttonDisabled = !canSell || item.quantity === 0; 
            let note = '';
            if (item.quantity === 0) note = ` <small style="color: #777;">(Not demanding)</small>`;
            else if (!canSell) note = ` <small style="color: #777;">(Not enough in stock)</small>`;

            demandsHTML += `
                <li>
                    ${item.product.name} (Wants: ${item.quantity}, Offers: $${item.price.toFixed(2)})
                    <input type="number" id="sellQty-${wholesalerIndex}-${productIndex}" value="1" min="1" max="${item.quantity}" ${buttonDisabled ? 'disabled' : ''}>
                    <button onclick="sellToWholesaler(${wholesalerIndex}, ${productIndex}, document.getElementById('sellQty-${wholesalerIndex}-${productIndex}').value)" ${buttonDisabled ? 'disabled' : ''}>Sell</button>${note}
                </li>`;
        });
        demandsHTML += '</ul>';
        wholesalersInfoDiv.innerHTML += `<div><h3>${wholesaler.name}</h3>${demandsHTML}</div>`;
    });
    console.log(`Displayed ${gameWholesalers.length} wholesalers.`);
    logFunctionEnd('displayWholesalers');
}

function displayContracts() {
    logFunctionStart('displayContracts');
    const contractsInfoDiv = document.getElementById('contracts-info');
    if (!contractsInfoDiv) {
        logFunctionEnd('displayContracts');
        return;
    }
    contractsInfoDiv.innerHTML = '<h2>Market Contracts (Pending)</h2>';
    let pendingContractsHTML = '<ul>';
    const pendingMarketContracts = marketContracts.filter(c => c.status === 'pending');
    if (pendingMarketContracts.length === 0) pendingContractsHTML += '<li>No new contracts available this turn.</li>';
    else {
        pendingMarketContracts.forEach((contract) => { 
            let note = '';
            if (contract.deadlineTurns - currentTurn <= 2 && !player.hasEnoughProduct(contract.productName, 1)) {
                note = ` <small style="color: #e67e22;">(Challenging: Low stock, short deadline)</small>`;
            }
            pendingContractsHTML += `
                <li>
                    ${contract.issuerNPC} offers: ${contract.quantity} of ${contract.productName} 
                    @ $${contract.pricePerUnit}/unit. Deadline: Turn ${contract.deadlineTurns}.
                    <button onclick="acceptContract('${contract.id}')">Accept</button>${note}
                </li>`;
        });
    }
    contractsInfoDiv.innerHTML += pendingContractsHTML;
    console.log(`Displayed ${pendingMarketContracts.length} pending market contracts.`);
    logFunctionEnd('displayContracts');
}

function refreshAllDisplays() {
    logFunctionStart('refreshAllDisplays');
    displayPlayerInfo();
    displaySuppliers();
    displayWholesalers();
    displayContracts();
    logFunctionEnd('refreshAllDisplays');
}

// --- Player Action Functions ---
function acceptContract(contractId) {
    logFunctionStart('acceptContract');
    console.log(`Input: contractId = ${contractId}`);
    const contractIndex = marketContracts.findIndex(c => c.id === contractId && c.status === 'pending');
    if (contractIndex > -1) {
        const contract = marketContracts[contractIndex];
        contract.status = 'active'; 
        player.acceptedContracts.push(contract);
        marketContracts.splice(contractIndex, 1); 
        showNotification(`Accepted contract for ${contract.quantity} of ${contract.productName} from ${contract.issuerNPC}.`, 'success');
        console.log(`Player accepted contract: ${contract.productName} from ${contract.issuerNPC}. Player money: $${player.money.toFixed(2)}`);
        refreshAllDisplays();
    } else {
        showNotification(`Error: Contract with ID ${contractId} not found or not pending.`, 'error');
    }
    logFunctionEnd('acceptContract');
}

function buyFromSupplier(supplierIndex, productIndex, quantityStr) {
    logFunctionStart('buyFromSupplier');
    const quantity = parseInt(quantityStr);
    console.log(`Inputs: supplierIndex=${supplierIndex}, productIndex=${productIndex}, quantity=${quantity}`);
    console.log(`Player money before: $${player.money.toFixed(2)}`);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Please enter a valid quantity to buy.", 'error');
        logFunctionEnd('buyFromSupplier');
        return;
    }
    const supplier = gameSuppliers[supplierIndex];
    const productItem = supplier.inventory[productIndex];
    const cost = productItem.price * quantity;

    if (productItem.quantity < quantity) {
        showNotification(`Supplier ${supplier.name} does not have ${quantity} of ${productItem.product.name}. Available: ${productItem.quantity}.`, 'error');
        logFunctionEnd('buyFromSupplier');
        return;
    }
    if (player.money < cost) {
        showNotification(`Not enough money to buy ${quantity} of ${productItem.product.name}. Cost: $${cost.toFixed(2)}, You have: $${player.money.toFixed(2)}.`, 'error');
        logFunctionEnd('buyFromSupplier');
        return;
    }
    
    player.money -= cost; 
    player.addProductToInventory(productItem.product, quantity, productItem.price); 
    productItem.quantity -= quantity;
    const priceIncreaseFactor = 0.01 + (Math.random() * 0.04); 
    productItem.price = parseFloat(Math.min(productItem.price * (1 + priceIncreaseFactor), productItem.basePrice * 1.5).toFixed(2)); 
    showNotification(`Bought ${quantity} of ${productItem.product.name} from ${supplier.name} for $${cost.toFixed(2)}.`, 'success');
    console.log(`Item bought: ${quantity} of ${productItem.product.name}. Player money after: $${player.money.toFixed(2)}. Supplier item new price: $${productItem.price.toFixed(2)}`);
    refreshAllDisplays();
    logFunctionEnd('buyFromSupplier');
}

function sellToWholesaler(wholesalerIndex, productIndex, quantityStr) {
    logFunctionStart('sellToWholesaler');
    const quantity = parseInt(quantityStr);
    console.log(`Inputs: wholesalerIndex=${wholesalerIndex}, productIndex=${productIndex}, quantity=${quantity}`);
    console.log(`Player money before: $${player.money.toFixed(2)}`);

    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Please enter a valid quantity to sell.", 'error');
        logFunctionEnd('sellToWholesaler');
        return;
    }
    const wholesaler = gameWholesalers[wholesalerIndex];
    const demandItem = wholesaler.demand[productIndex];
    const revenue = demandItem.price * quantity;

    if (demandItem.quantity < quantity) {
        showNotification(`Wholesaler ${wholesaler.name} does not demand ${quantity} of ${demandItem.product.name}. Demands: ${demandItem.quantity}.`, 'error');
        logFunctionEnd('sellToWholesaler');
        return;
    }
    if (!player.hasEnoughProduct(demandItem.product.name, quantity)) {
        showNotification(`Not enough ${demandItem.product.name} in inventory to sell ${quantity}.`, 'error');
        logFunctionEnd('sellToWholesaler');
        return;
    }
    
    if(player.removeProductFromInventory(demandItem.product.name, quantity)) {
        player.money += revenue; 
        demandItem.quantity -= quantity; 
        demandItem.unitsPurchasedLastTurn += quantity; 
        const priceDecreaseFactor = 0.01 + (Math.random() * 0.02); 
        demandItem.price = parseFloat(Math.max(demandItem.price * (1 - priceDecreaseFactor), demandItem.initialDemandPrice * 0.7).toFixed(2)); 
        showNotification(`Sold ${quantity} of ${demandItem.product.name} to ${wholesaler.name} for $${revenue.toFixed(2)}.`, 'success');
        console.log(`Item sold: ${quantity} of ${demandItem.product.name}. Player money after: $${player.money.toFixed(2)}. Wholesaler item new offer price: $${demandItem.price.toFixed(2)}`);
    } else {
        showNotification(`Error selling ${demandItem.product.name}. Inventory inconsistency.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('sellToWholesaler');
}

function fulfillContract(contractId) {
    logFunctionStart('fulfillContract');
    console.log(`Input: contractId = ${contractId}`);
    console.log(`Player money before: $${player.money.toFixed(2)}`);
    const contractIndex = player.acceptedContracts.findIndex(c => c.id === contractId);

    if (contractIndex === -1 || player.acceptedContracts[contractIndex].status !== 'active') {
        showNotification(`Active contract with ID ${contractId} not found.`, 'error');
        logFunctionEnd('fulfillContract');
        return;
    }
    const contract = player.acceptedContracts[contractIndex];
    const revenue = contract.quantity * contract.pricePerUnit;

    if (!player.hasEnoughProduct(contract.productName, contract.quantity)) {
        const playerProduct = player.inventory.find(item => item.product.name === contract.productName);
        showNotification(`Cannot fulfill contract for ${contract.productName}. Insufficient stock. Player has ${playerProduct ? playerProduct.quantity : 0}/${contract.quantity} needed.`, 'error');
        logFunctionEnd('fulfillContract');
        return;
    }
    
    if (player.removeProductFromInventory(contract.productName, contract.quantity)) {
        player.money += revenue; 
        contract.status = 'fulfilled';
        showNotification(`Contract for ${contract.productName} fulfilled! Player earned $${revenue.toFixed(2)}.`, 'success');
        console.log(`Contract fulfilled: ${contract.productName}. Player money after: $${player.money.toFixed(2)}`);
    } else {
        showNotification(`Error fulfilling contract ${contract.productName}: Failed to remove product.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('fulfillContract');
}

// --- Game Initialization & Core Logic ---
function initializeGame() {
    logFunctionStart('initializeGame');
    currentTurn = 0; 

    gameProducts = [ // Reduced to 5 products
        new Product("Apples", 1.0), 
        new Product("Bananas", 0.5), 
        new Product("Bread", 2.5), 
        new Product("Milk", 1.5), 
        new Product("Cheese", 3.0)
    ];
    console.log(`Created ${gameProducts.length} base products.`);
    
    gameSuppliers = generateSupplierNPCs(gameProducts, 3); // 3 suppliers
    gameWholesalers = generateWholesalerNPCs(gameProducts, 2); // 2 wholesalers
    player = new Player(2000); // Player money: 2000
    console.log(`Player initialized with $${player.money}.`);


    marketContracts = []; 
    gameWholesalers.forEach(wholesaler => {
        for (let i = 0; i < (Math.floor(Math.random() * 2) + 1); i++) { 
            const contract = wholesaler.generateContract();
            if (contract) marketContracts.push(contract);
        }
    });
    console.log(`Generated ${marketContracts.length} initial market contracts.`);
    
    refreshAllDisplays(); 
    logFunctionEnd('initializeGame');
}

function advanceTurn() {
    logFunctionStart('advanceTurn');
    currentTurn++;
    showNotification(`Advanced to Turn: ${currentTurn}`, 'info'); 
    console.log(`--- Advancing to Turn ${currentTurn} ---`);

    gameSuppliers.forEach(supplier => supplier.updatePrices());
    gameWholesalers.forEach(wholesaler => wholesaler.updateDemandPrices());

    player.acceptedContracts.forEach(contract => {
        if (contract.status === 'active' && currentTurn > contract.deadlineTurns) {
            contract.status = 'expired';
            showNotification(`Contract for ${contract.productName} from ${contract.issuerNPC} has expired!`, 'error');
            console.log(`Player contract expired: ${contract.productName} from ${contract.issuerNPC}. Player money: $${player.money.toFixed(2)}`);
        }
    });
    player.acceptedContracts = player.acceptedContracts.filter(c => c.status !== 'expired' && c.status !== 'fulfilled');

    const maxMarketContractsPerWholesaler = 2;
    let newContractsThisTurn = 0;
    gameWholesalers.forEach(wholesaler => {
        const existingContractsFromWholesaler = marketContracts.filter(c => c.issuerNPC === wholesaler.name && c.status === 'pending').length;
        if (existingContractsFromWholesaler < maxMarketContractsPerWholesaler) {
            if (Math.random() < 0.25) { // 25% chance - OK
                const contract = wholesaler.generateContract();
                if (contract) {
                    marketContracts.push(contract);
                    newContractsThisTurn++;
                }
            }
        }
    });
    if (newContractsThisTurn > 0) console.log(`Generated ${newContractsThisTurn} new market contracts this turn.`);
    
    refreshAllDisplays(); 
    logFunctionEnd('advanceTurn');
}

// Call initializeGame when the script loads
initializeGame();
console.log('--- Script End ---');
