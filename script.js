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
    constructor(name, basePrice, demandFactor = 1.0) { 
        this.name = name;
        this.basePrice = basePrice;
        this.demandFactor = demandFactor; 
    }
}

class Supplier {
    constructor(name) {
        this.name = name;
        this.inventory = []; 
    }

    addProduct(product, quantity, price) {
        this.inventory.push({ 
            product, 
            quantity, 
            price, 
            basePrice: product.basePrice,
            priceHistory: [{ turn: currentTurn, price: price }] 
        });
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

class ProductionUnit {
    constructor(typeId, name, cost, productionRecipe, instanceId) { 
        this.typeId = typeId; 
        this.instanceId = instanceId; 
        this.name = name; 
        this.cost = cost; 
        this.productionRecipe = productionRecipe; 
        this.status = 'idle'; 
        this.productionProgress = 0; 
        this.inputInventory = { productName: productionRecipe.input.productName, quantity: 0, capacity: productionRecipe.input.quantity };
        this.outputInventory = { productName: productionRecipe.output.productName, quantity: 0, capacity: productionRecipe.output.quantity };
    }
}

class RetailStore {
    constructor(id, name, level, costToOpen) {
        this.id = id; 
        this.name = name;
        this.level = level; 
        this.stock = []; 
        this.cashRegister = 0; 
        this.costToOpen = costToOpen; 
    }
}

class Player {
    constructor(initialMoney = 1000) {
        this.money = initialMoney;
        this.inventory = []; 
        this.acceptedContracts = []; 
        this.productionUnits = []; 
        this.retailStore = null; 
        this.lastTurnIncome = 0;
        this.lastTurnExpenses = 0;
    }

    addProductToInventory(product, quantity) { 
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
    const notificationsArea = document.getElementById('notifications-area');
    if (!notificationsArea) return;
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
}


// --- NPC Generation Functions ---
function generateSupplierNPCs(products, count) {
    logFunctionStart('generateSupplierNPCs');
    const suppliers = [];
    const supplierNames = ["Farm Fresh Co.", "Reliable Goods Inc.", "Speedy Supplies Ltd.", "Global Produce", "Timber Town Supplies"];
    for (let i = 0; i < count; i++) {
        const name = supplierNames[i % supplierNames.length] + (Math.floor(i / supplierNames.length) > 0 ? ` ${Math.floor(i / supplierNames.length) +1}` : '');
        const supplier = new Supplier(name);
        const numProductsToOffer = Math.floor(Math.random() * Math.min(products.length, 3)) + 1; 
        let availableProducts = [...products];
        if (i === 0 && products.find(p => p.name === 'Wood')) {
            const woodProduct = products.find(p => p.name === 'Wood');
            if (woodProduct) {
                 const quantity = Math.floor(Math.random() * 151) + 50; 
                 const priceVariation = (Math.random() * 0.2) - 0.1; 
                 const price = parseFloat((woodProduct.basePrice * (1 + priceVariation)).toFixed(2));
                 supplier.addProduct(woodProduct, quantity, price);
                 availableProducts = availableProducts.filter(p => p.name !== 'Wood');
            }
        }
        const shuffledProducts = availableProducts.sort(() => 0.5 - Math.random()); 
        const remainingProductsToOffer = numProductsToOffer - supplier.inventory.length;
        for (let j = 0; j < remainingProductsToOffer && j < shuffledProducts.length; j++) {
            const product = shuffledProducts[j];
            const quantity = Math.floor(Math.random() * 101) + 50; 
            const priceVariation = (Math.random() * 0.2) - 0.1; 
            const price = parseFloat((product.basePrice * (1 + priceVariation)).toFixed(2));
            supplier.addProduct(product, quantity, price); 
        }
        suppliers.push(supplier);
    }
    logFunctionEnd('generateSupplierNPCs');
    return suppliers;
}

function generateWholesalerNPCs(products, count) {
    logFunctionStart('generateWholesalerNPCs');
    const wholesalers = [];
    const wholesalerNames = ["City Mart", "General Traders", "Bulk Buyers LLC", "Super Value Grocers", "Furniture Emporium"];
    for (let i = 0; i < count; i++) {
        const name = wholesalerNames[i % wholesalerNames.length] + (Math.floor(i / wholesalerNames.length) > 0 ? ` ${Math.floor(i / wholesalerNames.length) +1}` : '');
        const wholesaler = new Wholesaler(name);
        const numProductsToDemand = Math.floor(Math.random() * Math.min(products.length, 3)) + 1; 
        let availableProducts = [...products];
        if (i === 0 && products.find(p => p.name === 'Wooden Chair')) {
            const chairProduct = products.find(p => p.name === 'Wooden Chair');
            if (chairProduct) {
                const quantity = Math.floor(Math.random() * 41) + 10; 
                const priceVariation = (Math.random() * 0.50) + 0.25; 
                const price = parseFloat((chairProduct.basePrice * (1 + priceVariation)).toFixed(2));
                wholesaler.addDemand(chairProduct, quantity, price);
                availableProducts = availableProducts.filter(p => p.name !== 'Wooden Chair');
            }
        }
        const shuffledProducts = availableProducts.sort(() => 0.5 - Math.random());
        const remainingProductsToDemand = numProductsToDemand - wholesaler.demand.length;
        for (let j = 0; j < remainingProductsToDemand && j < shuffledProducts.length; j++) {
            const product = shuffledProducts[j];
            if (product.name === 'Wood' && name !== "Timber Town Supplies") continue; 
            const quantity = Math.floor(Math.random() * 61) + 20; 
            const priceVariation = (Math.random() * 0.2) + 0.05; 
            const price = parseFloat((product.basePrice * (1 + priceVariation)).toFixed(2));
            wholesaler.addDemand(product, quantity, price); 
        }
        wholesalers.push(wholesaler);
    }
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
const MAX_PRICE_HISTORY = 15; 
let playerContractsSortKey = 'deadlineTurns'; 
let playerContractsSortOrder = 'asc';       
let productionUnitInstanceCounter = 0; 
const RETAIL_STORE_COST_TO_OPEN = 2500;


const availableProductionUnitTypes = [
    { 
        id: 'workshop1', 
        name: 'Small Workshop', 
        cost: 1000, 
        recipe: { 
            input: { productName: 'Wood', quantity: 2 }, 
            output: { productName: 'Wooden Chair', quantity: 1 }, 
            turnsToProduce: 2 
        } 
    },
];

// --- Market Opportunities ---
function findProfitableTrades() {
    logFunctionStart('findProfitableTrades');
    const profitableTrades = [];
    if (!gameSuppliers || !gameWholesalers) {
        console.error("Suppliers or Wholesalers not initialized for findProfitableTrades");
        logFunctionEnd('findProfitableTrades');
        return profitableTrades;
    }
    gameSuppliers.forEach(supplier => {
        supplier.inventory.forEach(supplierItem => {
            if (supplierItem.quantity > 0) { 
                gameWholesalers.forEach(wholesaler => {
                    wholesaler.demand.forEach(demandItem => {
                        if (demandItem.quantity > 0 && 
                            supplierItem.product.name === demandItem.product.name &&
                            supplierItem.price < demandItem.price) {
                            const profitPerUnit = demandItem.price - supplierItem.price;
                            profitableTrades.push({
                                supplierName: supplier.name, productName: supplierItem.product.name,
                                supplierPrice: supplierItem.price, wholesalerName: wholesaler.name,
                                wholesalerPrice: demandItem.price, profitPerUnit: parseFloat(profitPerUnit.toFixed(2)),
                                maxUnits: Math.min(supplierItem.quantity, demandItem.quantity)
                            });
                        }
                    });
                });
            }
        });
    });
    logFunctionEnd('findProfitableTrades');
    return profitableTrades;
}

function displayMarketOpportunities() {
    logFunctionStart('displayMarketOpportunities');
    const opportunitiesDiv = document.getElementById('market-opportunities');
    if (!opportunitiesDiv) {
        console.error("Market opportunities div not found!");
        logFunctionEnd('displayMarketOpportunities'); return;
    }
    const trades = findProfitableTrades();
    opportunitiesDiv.innerHTML = '<h2>Market Opportunities</h2>'; 
    if (trades.length === 0) {
        opportunitiesDiv.innerHTML += '<p>No direct profitable trades found this turn.</p>';
        logFunctionEnd('displayMarketOpportunities'); return;
    }
    let listHTML = '<ul>';
    trades.forEach(trade => {
        listHTML += `
            <li>
                Buy <strong>${trade.productName}</strong> from <em>${trade.supplierName}</em> at $${trade.supplierPrice.toFixed(2)}
                and sell to <em>${trade.wholesalerName}</em> for $${trade.wholesalerPrice.toFixed(2)}. <br>
                (Profit: <strong>$${trade.profitPerUnit.toFixed(2)}/unit</strong>, Max: ${trade.maxUnits} units)
            </li>`;
    });
    listHTML += '</ul>';
    opportunitiesDiv.innerHTML += listHTML;
    logFunctionEnd('displayMarketOpportunities');
}

// --- Display Functions ---
function displayAvailableProductionUnits() {
    logFunctionStart('displayAvailableProductionUnits');
    const unitsSection = document.getElementById('buy-production-units-section');
    if (!unitsSection) {
        logFunctionEnd('displayAvailableProductionUnits');
        return;
    }
    let html = '<h2>Available Production Units</h2>';
    if (availableProductionUnitTypes.length === 0) {
        html += '<p>No production units available for purchase currently.</p>';
    } else {
        html += '<ul>';
        availableProductionUnitTypes.forEach(unitType => {
            const canAfford = player.money >= unitType.cost;
            html += `
                <li>
                    <strong>${unitType.name}</strong> - Cost: $${unitType.cost}<br>
                    Produces: ${unitType.recipe.output.quantity} ${unitType.recipe.output.productName} from 
                              ${unitType.recipe.input.quantity} ${unitType.recipe.input.productName} 
                              (Takes ${unitType.recipe.turnsToProduce} turns).<br>
                    <button onclick="buyProductionUnit('${unitType.id}')" ${!canAfford ? 'disabled' : ''} title="Purchase this ${unitType.name}. Cost: $${unitType.cost}">
                        Buy ${unitType.name}
                    </button>
                    ${!canAfford ? '<small style="color:red;"> (Not enough money)</small>' : ''}
                </li>`;
        });
        html += '</ul>';
    }
    unitsSection.innerHTML = html;
    logFunctionEnd('displayAvailableProductionUnits');
}

function displayPlayerOwnedUnits() {
    logFunctionStart('displayPlayerOwnedUnits');
    const ownedUnitsSection = document.getElementById('player-owned-units-section');
    if (!ownedUnitsSection) {
        logFunctionEnd('displayPlayerOwnedUnits');
        return;
    }

    let html = '<h2>My Production Units</h2>';
    if (!player || player.productionUnits.length === 0) {
        html += '<p>You do not own any production units.</p>';
    } else {
        html += '<ul>';
        player.productionUnits.forEach(unit => {
            const inputNeeded = unit.productionRecipe.input.quantity;
            const outputAvailable = unit.productionRecipe.output.quantity;
            let actionButtonHTML = '';

            if (unit.status === 'idle') {
                const hasEnoughInputMaterial = player.hasEnoughProduct(unit.productionRecipe.input.productName, inputNeeded - unit.inputInventory.quantity);
                const canLoadMore = unit.inputInventory.quantity < inputNeeded;
                
                if (canLoadMore) {
                     actionButtonHTML += `<button onclick="loadMaterialsForProductionUnit('${unit.instanceId}')" ${!hasEnoughInputMaterial ? 'disabled' : ''} title="Move ${inputNeeded - unit.inputInventory.quantity} ${unit.productionRecipe.input.productName} from your inventory to this unit">
                        Load ${inputNeeded - unit.inputInventory.quantity} ${unit.productionRecipe.input.productName}
                    </button> ${!hasEnoughInputMaterial ? '<small style="color:red;">(Need more from player inventory)</small>' : ''} <br>`;
                }
               
                if (unit.inputInventory.quantity >= inputNeeded) { 
                    actionButtonHTML += `<button onclick="startProductionOnUnit('${unit.instanceId}')" title="Begin production cycle (consumes materials)">Start Production</button>`;
                }
            } else if (unit.status === 'producing') {
                actionButtonHTML = `<p>Producing... ${unit.productionProgress} turns left.</p>`;
            } else if (unit.status === 'completed') {
                actionButtonHTML = `<button onclick="collectOutputFromProductionUnit('${unit.instanceId}')" title="Move ${unit.outputInventory.quantity} ${unit.productionRecipe.output.productName} from this unit to your inventory">
                    Collect ${unit.outputInventory.quantity} ${unit.productionRecipe.output.productName}
                </button>`;
            }

            html += `
                <li>
                    <strong>${unit.name} (ID: ${unit.instanceId})</strong> - Status: ${unit.status.toUpperCase()}<br>
                    Input: ${unit.inputInventory.quantity}/${inputNeeded} ${unit.productionRecipe.input.productName}<br>
                    Output: ${unit.outputInventory.quantity}/${outputAvailable} ${unit.productionRecipe.output.productName}<br>
                    ${actionButtonHTML}
                </li>`;
        });
        html += '</ul>';
    }
    ownedUnitsSection.innerHTML = html;
    logFunctionEnd('displayPlayerOwnedUnits');
}

function displayRetailManagement() {
    logFunctionStart('displayRetailManagement');
    const retailSection = document.getElementById('retail-management-section');
    if (!retailSection) {
        logFunctionEnd('displayRetailManagement'); return;
    }

    let html = '<h2>Retail Store Management</h2>';
    if (!player.retailStore) {
        const canAffordToOpen = player.money >= RETAIL_STORE_COST_TO_OPEN;
        html += `
            <p>You do not own a retail store.</p>
            <button onclick="openRetailStore()" ${!canAffordToOpen ? 'disabled' : ''} title="Open your first retail store. Cost: $${RETAIL_STORE_COST_TO_OPEN}">
                Open Your First Store (Cost: $${RETAIL_STORE_COST_TO_OPEN})
            </button>
            ${!canAffordToOpen ? '<small style="color:red;"> (Not enough money)</small>' : ''}`;
    } else {
        html += `<p><strong>Store Name:</strong> ${player.retailStore.name}</p>`;
        html += `<p><strong>Level:</strong> ${player.retailStore.level}</p>`;
        html += `<p><strong>Cash Register:</strong> $${player.retailStore.cashRegister.toFixed(2)} 
                 <button onclick="collectStoreRevenue()" title="Move funds from store's cash register to your personal money">Collect Revenue</button></p>`;
        html += `<p><small>Tip: Prices significantly above base price may reduce customer demand.</small></p>`;
        
        html += '<h3>Manage Stock:</h3><ul>';
        player.retailStore.stock.forEach((item, index) => {
            const playerInventoryItem = player.inventory.find(pInv => pInv.product.name === item.product.name);
            const playerHasStock = playerInventoryItem && playerInventoryItem.quantity > 0;

            html += `
                <li>
                    <strong>${item.product.name}</strong><br>
                    In Store: ${item.quantity} | Retail Price: $${item.price.toFixed(2)} | 
                    For Sale: <input type="checkbox" id="forSale-${index}" ${item.forSale ? 'checked' : ''} onclick="toggleForSale('${item.product.name}')" title="Toggle whether this product is available for sale to consumers">
                    <label for="forSale-${index}">${item.forSale ? 'Yes' : 'No'}</label><br>
                    
                    Qty to Add: <input type="number" id="addStockQty-${index}" value="1" min="1" style="width:50px;">
                    <button onclick="addStockToRetail('${item.product.name}', document.getElementById('addStockQty-${index}').value)" ${!playerHasStock ? 'disabled' : ''} title="Move this product from your inventory to your store's stock">
                        Add Stock
                    </button> ${!playerHasStock ? '<small>(None in player inventory)</small>' : ''}<br>
                    
                    New Price: $<input type="number" id="newPrice-${index}" value="${item.price.toFixed(2)}" min="0.01" step="0.01" style="width:70px;">
                    <button onclick="setRetailPrice('${item.product.name}', document.getElementById('newPrice-${index}').value)" title="Set the retail price for this product in your store">
                        Set Price
                    </button>
                </li>`;
        });
        html += '</ul>';
    }
    retailSection.innerHTML = html;
    logFunctionEnd('displayRetailManagement');
}


function displayPlayerInfo() {
    const playerInfoDiv = document.getElementById('player-info');
    if (!playerInfoDiv || !player) return;
    let inventoryHTML = '<ul>';
    if (player.inventory.length === 0) inventoryHTML += '<li>Empty</li>';
    else player.inventory.forEach(item => inventoryHTML += `<li>${item.product.name}: ${item.quantity}</li>`);
    inventoryHTML += '</ul>';
    
    const netProfit = player.lastTurnIncome - player.lastTurnExpenses;
    let profitColor = netProfit >= 0 ? 'green' : 'red';
    let financialSummaryHTML = `
        <div id="financial-summary" style="padding: 5px; margin-top:10px; border-top: 1px solid #eee;">
            <h4>Last Turn's Finances:</h4>
            <p style="margin:2px 0;">Income: <span style="color:green;">$${player.lastTurnIncome.toFixed(2)}</span></p>
            <p style="margin:2px 0;">Expenses: <span style="color:red;">$${player.lastTurnExpenses.toFixed(2)}</span></p>
            <p style="margin:2px 0;">Net Profit: <span style="color:${profitColor};">$${netProfit.toFixed(2)}</span></p>
        </div>
    `;

    playerInfoDiv.innerHTML = `
        <p><strong>Money:</strong> $${player.money.toFixed(2)}</p>
        <p><strong>Turn:</strong> ${currentTurn}</p>
        <p><strong>Inventory:</strong></p>${inventoryHTML}
        ${financialSummaryHTML}`; 
}

function displayPlayerActiveContractsDetailed() {
    logFunctionStart('displayPlayerActiveContractsDetailed');
    const contractsListDiv = document.getElementById('active-contracts-list');
    if (!contractsListDiv || !player) {
        logFunctionEnd('displayPlayerActiveContractsDetailed');
        return;
    }
    let contractsToDisplay = [...player.acceptedContracts]; 
    contractsToDisplay.sort((a, b) => {
        let valA, valB;
        switch (playerContractsSortKey) {
            case 'deadlineTurns': valA = a.deadlineTurns; valB = b.deadlineTurns; break;
            case 'totalValue': valA = a.quantity * a.pricePerUnit; valB = b.quantity * b.pricePerUnit; break;
            case 'productName':
                valA = a.productName; valB = b.productName;
                return playerContractsSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            default: return 0;
        }
        return playerContractsSortOrder === 'asc' ? valA - valB : valB - valA;
    });
    let listHTML = '<ul>';
    if (contractsToDisplay.length === 0) listHTML += '<li>No active contracts.</li>';
    else {
        contractsToDisplay.forEach(contract => {
            const totalValue = contract.quantity * contract.pricePerUnit;
            const turnsRemaining = contract.deadlineTurns - currentTurn;
            const warningThreshold = 2; 
            let listItemClass = ''; let deadlineWarningText = ''; let fulfillButtonHTML = ''; let note = '';
            if (contract.status === 'active') {
                const canFulfill = player.hasEnoughProduct(contract.productName, contract.quantity);
                fulfillButtonHTML = `<button onclick="fulfillContract('${contract.id}')" ${!canFulfill ? 'disabled' : ''} title="Fulfill this contract using products from your inventory">Fulfill Contract</button>`;
                if (!canFulfill) note = ` <small style="color: #777;">(Insufficient ${contract.productName})</small>`;
                if (turnsRemaining <= warningThreshold && turnsRemaining >= 0) { 
                    listItemClass = 'contract-deadline-warning';
                    deadlineWarningText = ` <strong style="color: orange;">(Deadline Approaching!)</strong>`;
                } else if (turnsRemaining < 0) note = ` <small style="color: red;">(EXPIRED)</small>`;
            } else note = ` <small style="color: #555;">(${contract.status.toUpperCase()})</small>`;
            if (contract.status === 'expired') {
                fulfillButtonHTML = ''; 
                note = ` <small style="color: red;">(EXPIRED)</small>`; 
                listItemClass = 'contract-expired'; 
            }
            listHTML += `
                <li class="${listItemClass}">
                    <div><strong>Product:</strong> ${contract.productName}</div>
                    <div><strong>Quantity:</strong> ${contract.quantity}</div>
                    <div><strong>Price/Unit:</strong> $${contract.pricePerUnit.toFixed(2)}</div>
                    <div><strong>Total Value:</strong> $${totalValue.toFixed(2)}</div>
                    <div><strong>Deadline:</strong> Turn ${contract.deadlineTurns} (Remaining: ${turnsRemaining > 0 ? turnsRemaining : 0} turns)${deadlineWarningText}</div>
                    <div><strong>Issuer:</strong> ${contract.issuerNPC}</div>
                    <div><strong>Status:</strong> ${contract.status} ${note}</div>
                    ${contract.status === 'active' && turnsRemaining >=0 ? fulfillButtonHTML : ''} 
                </li>`;
        });
    }
    listHTML += '</ul>';
    contractsListDiv.innerHTML = listHTML;
    logFunctionEnd('displayPlayerActiveContractsDetailed');
}

function displaySuppliers() {
    const suppliersInfoDiv = document.getElementById('suppliers-info');
    if (!suppliersInfoDiv) return;
    suppliersInfoDiv.innerHTML = '<h2>Suppliers</h2>';
    gameSuppliers.forEach((supplier, supplierIndex) => {
        let productsHTML = '<ul>';
        supplier.inventory.forEach((item, productIndex) => {
            const canAfford = player.money >= item.price; 
            const buttonDisabled = !canAfford || item.quantity === 0;
            let note = '';
            if (item.quantity === 0) note = ` <small style="color: #777;">(Out of stock)</small>`;
            else if (!canAfford) note = ` <small style="color: #777;">(Cannot afford)</small>`;
            productsHTML += `
                <li>
                    ${item.product.name} (Qty: ${item.quantity}, Price: $${item.price.toFixed(2)})
                    <span class="history-toggle" onclick="togglePriceHistory(${supplierIndex}, ${productIndex})" title="View price history for ${item.product.name} from ${supplier.name} (last ${MAX_PRICE_HISTORY} turns)">(H)</span>
                    <input type="number" id="buyQty-${supplierIndex}-${productIndex}" value="1" min="1" max="${item.quantity}" ${buttonDisabled ? 'disabled' : ''}>
                    <button onclick="buyFromSupplier(${supplierIndex}, ${productIndex}, document.getElementById('buyQty-${supplierIndex}-${productIndex}').value)" ${buttonDisabled ? 'disabled' : ''} title="Buy ${item.product.name} from ${supplier.name}">Buy</button>${note}
                    <div class="price-history-display" id="history-${supplierIndex}-${productIndex}" style="display:none; margin-left: 15px; font-size: 0.9em;"></div>
                </li>`;
        });
        productsHTML += '</ul>';
        suppliersInfoDiv.innerHTML += `<div><h3>${supplier.name}</h3>${productsHTML}</div>`;
    });
    logFunctionEnd('displaySuppliers');
}

function togglePriceHistory(supplierIndex, productIndex) {
    logFunctionStart('togglePriceHistory');
    const historyDivId = `history-${supplierIndex}-${productIndex}`;
    const historyDiv = document.getElementById(historyDivId);
    if (!historyDiv) {
        console.error(`History div not found: ${historyDivId}`);
        logFunctionEnd('togglePriceHistory'); return;
    }
    if (historyDiv.style.display === 'none') {
        const supplier = gameSuppliers[supplierIndex];
        const productItem = supplier.inventory[productIndex];
        if (productItem && productItem.priceHistory) {
            let historyHtml = '<strong>Recent Prices:</strong><ul>';
            for (let i = productItem.priceHistory.length - 1; i >= 0; i--) {
                const record = productItem.priceHistory[i];
                historyHtml += `<li>Turn ${record.turn}: $${record.price.toFixed(2)}</li>`;
            }
            historyHtml += '</ul>';
            historyDiv.innerHTML = historyHtml;
            historyDiv.style.display = 'block';
        } else {
            historyDiv.innerHTML = 'No history available.';
            historyDiv.style.display = 'block';
        }
    } else {
        historyDiv.style.display = 'none';
    }
    logFunctionEnd('togglePriceHistory');
}

function displayWholesalers() {
    const wholesalersInfoDiv = document.getElementById('wholesalers-info');
    if (!wholesalersInfoDiv) return;
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
                    <button onclick="sellToWholesaler(${wholesalerIndex}, ${productIndex}, document.getElementById('sellQty-${wholesalerIndex}-${productIndex}').value)" ${buttonDisabled ? 'disabled' : ''} title="Sell ${item.product.name} to ${wholesaler.name}">Sell</button>${note}
                </li>`;
        });
        demandsHTML += '</ul>';
        wholesalersInfoDiv.innerHTML += `<div><h3>${wholesaler.name}</h3>${demandsHTML}</div>`;
    });
    logFunctionEnd('displayWholesalers');
}

function displayContracts() {
    const contractsInfoDiv = document.getElementById('contracts-info');
    if (!contractsInfoDiv) return;
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
                    <button onclick="acceptContract('${contract.id}')" title="Accept this contract from ${contract.issuerNPC}">Accept</button>${note}
                </li>`;
        });
    }
    contractsInfoDiv.innerHTML += pendingContractsHTML;
    logFunctionEnd('displayContracts');
}

function refreshAllDisplays() {
    logFunctionStart('refreshAllDisplays');
    displayPlayerInfo();
    displaySuppliers();
    displayWholesalers();
    displayContracts();
    displayMarketOpportunities(); 
    displayPlayerActiveContractsDetailed(); 
    displayAvailableProductionUnits(); 
    displayPlayerOwnedUnits(); 
    displayRetailManagement(); 
    logFunctionEnd('refreshAllDisplays');
}

// --- Player Action Functions ---
function openRetailStore() {
    logFunctionStart('openRetailStore');
    if (player.retailStore) {
        showNotification("You already own a retail store.", 'info');
        logFunctionEnd('openRetailStore');
        return;
    }
    if (player.money < RETAIL_STORE_COST_TO_OPEN) {
        showNotification(`Not enough money to open a store. Cost: $${RETAIL_STORE_COST_TO_OPEN}. You have: $${player.money.toFixed(2)}.`, 'error');
        logFunctionEnd('openRetailStore');
        return;
    }

    player.money -= RETAIL_STORE_COST_TO_OPEN;
    player.lastTurnExpenses += RETAIL_STORE_COST_TO_OPEN; 
    player.retailStore = new RetailStore('store1', "Player's General Store", 1, RETAIL_STORE_COST_TO_OPEN);
    gameProducts.forEach(product => {
        player.retailStore.stock.push({
            product: product, 
            quantity: 0,
            price: parseFloat((product.basePrice * 1.5).toFixed(2)), 
            forSale: false 
        });
    });

    showNotification("Congratulations! You've opened your first retail store!", 'success');
    console.log(`Player opened a retail store. Money left: $${player.money.toFixed(2)}`);
    refreshAllDisplays();
    logFunctionEnd('openRetailStore');
}

function addStockToRetail(productName, quantityStr) {
    logFunctionStart('addStockToRetail');
    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Please enter a valid quantity to add.", 'error');
        logFunctionEnd('addStockToRetail'); return;
    }
    if (!player.retailStore) {
        showNotification("You don't own a retail store.", 'error');
        logFunctionEnd('addStockToRetail'); return;
    }
    if (!player.hasEnoughProduct(productName, quantity)) {
        showNotification(`Not enough ${productName} in your inventory.`, 'error');
        logFunctionEnd('addStockToRetail'); return;
    }

    const storeItem = player.retailStore.stock.find(item => item.product.name === productName);
    if (!storeItem) {
        showNotification(`Product ${productName} not found in store stock definitions.`, 'error'); 
        logFunctionEnd('addStockToRetail'); return;
    }

    player.removeProductFromInventory(productName, quantity);
    storeItem.quantity += quantity;
    showNotification(`Added ${quantity} ${productName} to your retail store.`, 'success');
    refreshAllDisplays();
    logFunctionEnd('addStockToRetail');
}

function setRetailPrice(productName, priceStr) {
    logFunctionStart('setRetailPrice');
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
        showNotification("Please enter a valid price.", 'error');
        logFunctionEnd('setRetailPrice'); return;
    }
    if (!player.retailStore) {
        showNotification("You don't own a retail store.", 'error');
        logFunctionEnd('setRetailPrice'); return;
    }
    const storeItem = player.retailStore.stock.find(item => item.product.name === productName);
    if (!storeItem) {
        showNotification(`Product ${productName} not found in store.`, 'error');
        logFunctionEnd('setRetailPrice'); return;
    }
    storeItem.price = parseFloat(price.toFixed(2));
    showNotification(`Retail price for ${productName} set to $${storeItem.price.toFixed(2)}.`, 'success');
    refreshAllDisplays();
    logFunctionEnd('setRetailPrice');
}

function toggleForSale(productName) {
    logFunctionStart('toggleForSale');
    if (!player.retailStore) {
        showNotification("You don't own a retail store.", 'error');
        logFunctionEnd('toggleForSale'); return;
    }
    const storeItem = player.retailStore.stock.find(item => item.product.name === productName);
    if (!storeItem) {
        showNotification(`Product ${productName} not found in store.`, 'error');
        logFunctionEnd('toggleForSale'); return;
    }
    storeItem.forSale = !storeItem.forSale;
    showNotification(`${productName} is now ${storeItem.forSale ? 'FOR SALE' : 'NOT FOR SALE'} in your store.`, 'info');
    refreshAllDisplays();
    logFunctionEnd('toggleForSale');
}

function collectStoreRevenue() {
    logFunctionStart('collectStoreRevenue');
    if (!player.retailStore || player.retailStore.cashRegister <= 0) {
        showNotification("No revenue to collect or no store owned.", 'info');
        logFunctionEnd('collectStoreRevenue'); return;
    }
    const amountCollected = player.retailStore.cashRegister;
    player.money += amountCollected;
    player.lastTurnIncome += amountCollected; 
    player.retailStore.cashRegister = 0;
    showNotification(`Collected $${amountCollected.toFixed(2)} from your retail store.`, 'success');
    refreshAllDisplays();
    logFunctionEnd('collectStoreRevenue');
}


function buyProductionUnit(unitTypeId) {
    logFunctionStart('buyProductionUnit');
    const unitType = availableProductionUnitTypes.find(type => type.id === unitTypeId);
    if (!unitType) {
        showNotification("Invalid production unit type selected.", 'error');
        logFunctionEnd('buyProductionUnit');
        return;
    }

    if (player.money < unitType.cost) {
        showNotification(`Not enough money to buy ${unitType.name}. Cost: $${unitType.cost}, You have: $${player.money.toFixed(2)}.`, 'error');
        logFunctionEnd('buyProductionUnit');
        return;
    }

    player.money -= unitType.cost;
    player.lastTurnExpenses += unitType.cost; 
    productionUnitInstanceCounter++;
    const newUnit = new ProductionUnit(
        unitType.id, 
        unitType.name, 
        unitType.cost, 
        unitType.recipe, 
        `unit-${productionUnitInstanceCounter}` 
    );
    player.productionUnits.push(newUnit);
    showNotification(`Successfully purchased ${unitType.name}!`, 'success');
    console.log(`Player bought ${unitType.name}. Instance ID: ${newUnit.instanceId}. Player money: $${player.money.toFixed(2)}`);
    refreshAllDisplays();
    logFunctionEnd('buyProductionUnit');
}

function loadMaterialsForProductionUnit(unitInstanceId) {
    logFunctionStart('loadMaterialsForProductionUnit');
    const unit = player.productionUnits.find(u => u.instanceId === unitInstanceId);
    if (!unit || unit.status !== 'idle') {
        showNotification("Production unit not found or not idle.", 'error');
        logFunctionEnd('loadMaterialsForProductionUnit');
        return;
    }

    const neededProductName = unit.productionRecipe.input.productName;
    const neededQuantity = unit.productionRecipe.input.quantity - unit.inputInventory.quantity;

    if (neededQuantity <= 0) {
        showNotification("Input inventory is already full for this unit.", 'info');
        logFunctionEnd('loadMaterialsForProductionUnit');
        return;
    }

    if (player.hasEnoughProduct(neededProductName, neededQuantity)) {
        player.removeProductFromInventory(neededProductName, neededQuantity);
        unit.inputInventory.quantity += neededQuantity;
        showNotification(`Loaded ${neededQuantity} ${neededProductName} into ${unit.name}.`, 'success');
    } else {
        showNotification(`Not enough ${neededProductName} in player inventory. Need ${neededQuantity}.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('loadMaterialsForProductionUnit');
}

function startProductionOnUnit(unitInstanceId) {
    logFunctionStart('startProductionOnUnit');
    const unit = player.productionUnits.find(u => u.instanceId === unitInstanceId);
    if (!unit || unit.status !== 'idle') {
        showNotification("Production unit not found or not idle.", 'error');
        logFunctionEnd('startProductionOnUnit');
        return;
    }

    if (unit.inputInventory.quantity < unit.productionRecipe.input.quantity) {
        showNotification(`Not enough ${unit.productionRecipe.input.productName} loaded to start production.`, 'error');
        logFunctionEnd('startProductionOnUnit');
        return;
    }

    unit.status = 'producing';
    unit.productionProgress = unit.productionRecipe.turnsToProduce;
    unit.inputInventory.quantity -= unit.productionRecipe.input.quantity; 

    showNotification(`${unit.name} started production of ${unit.productionRecipe.output.productName}.`, 'success');
    refreshAllDisplays();
    logFunctionEnd('startProductionOnUnit');
}

function collectOutputFromProductionUnit(unitInstanceId) {
    logFunctionStart('collectOutputFromProductionUnit');
    const unit = player.productionUnits.find(u => u.instanceId === unitInstanceId);
    if (!unit || unit.status !== 'completed') {
        showNotification("Production unit not found or not completed.", 'error');
        logFunctionEnd('collectOutputFromProductionUnit');
        return;
    }
    
    const outputProductName = unit.productionRecipe.output.productName;
    const outputQuantity = unit.outputInventory.quantity;
    const outputProduct = gameProducts.find(p => p.name === outputProductName);


    if (outputQuantity > 0 && outputProduct) {
        player.addProductToInventory(outputProduct, outputQuantity);
        unit.outputInventory.quantity = 0; 
        unit.status = 'idle'; 
        showNotification(`Collected ${outputQuantity} ${outputProductName} from ${unit.name}.`, 'success');
    } else {
        showNotification(`No output to collect from ${unit.name} or output product definition missing.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('collectOutputFromProductionUnit');
}

function acceptContract(contractId) { 
    logFunctionStart('acceptContract');
    const contractIndex = marketContracts.findIndex(c => c.id === contractId && c.status === 'pending');
    if (contractIndex > -1) {
        const contract = marketContracts[contractIndex];
        contract.status = 'active'; 
        player.acceptedContracts.push(contract);
        marketContracts.splice(contractIndex, 1); 
        showNotification(`Accepted contract for ${contract.quantity} of ${contract.productName} from ${contract.issuerNPC}.`, 'success');
        refreshAllDisplays();
    } else {
        showNotification(`Error: Contract with ID ${contractId} not found or not pending.`, 'error');
    }
    logFunctionEnd('acceptContract');
}
function buyFromSupplier(supplierIndex, productIndex, quantityStr) { 
    logFunctionStart('buyFromSupplier');
    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Please enter a valid quantity to buy.", 'error');
        logFunctionEnd('buyFromSupplier'); return;
    }
    const supplier = gameSuppliers[supplierIndex];
    const productItem = supplier.inventory[productIndex];
    const cost = productItem.price * quantity;
    if (productItem.quantity < quantity) {
        showNotification(`Supplier ${supplier.name} does not have ${quantity} of ${productItem.product.name}. Available: ${productItem.quantity}.`, 'error');
        logFunctionEnd('buyFromSupplier'); return;
    }
    if (player.money < cost) {
        showNotification(`Not enough money to buy ${quantity} of ${productItem.product.name}. Cost: $${cost.toFixed(2)}, You have: $${player.money.toFixed(2)}.`, 'error');
        logFunctionEnd('buyFromSupplier'); return;
    }
    player.money -= cost; 
    player.lastTurnExpenses += cost; 
    player.addProductToInventory(productItem.product, quantity); 
    productItem.quantity -= quantity;
    const priceIncreaseFactor = 0.01 + (Math.random() * 0.04); 
    productItem.price = parseFloat(Math.min(productItem.price * (1 + priceIncreaseFactor), productItem.basePrice * 1.5).toFixed(2)); 
    showNotification(`Bought ${quantity} of ${productItem.product.name} from ${supplier.name} for $${cost.toFixed(2)}.`, 'success');
    refreshAllDisplays();
    logFunctionEnd('buyFromSupplier');
}
function sellToWholesaler(wholesalerIndex, productIndex, quantityStr) { 
    logFunctionStart('sellToWholesaler');
    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
        showNotification("Please enter a valid quantity to sell.", 'error');
        logFunctionEnd('sellToWholesaler'); return;
    }
    const wholesaler = gameWholesalers[wholesalerIndex];
    const demandItem = wholesaler.demand[productIndex];
    const revenue = demandItem.price * quantity;
    if (demandItem.quantity < quantity) {
        showNotification(`Wholesaler ${wholesaler.name} does not demand ${quantity} of ${demandItem.product.name}. Demands: ${demandItem.quantity}.`, 'error');
        logFunctionEnd('sellToWholesaler'); return;
    }
    if (!player.hasEnoughProduct(demandItem.product.name, quantity)) {
        showNotification(`Not enough ${demandItem.product.name} in inventory to sell ${quantity}.`, 'error');
        logFunctionEnd('sellToWholesaler'); return;
    }
    if(player.removeProductFromInventory(demandItem.product.name, quantity)) {
        player.money += revenue; 
        player.lastTurnIncome += revenue; 
        demandItem.quantity -= quantity; 
        demandItem.unitsPurchasedLastTurn += quantity; 
        const priceDecreaseFactor = 0.01 + (Math.random() * 0.02); 
        demandItem.price = parseFloat(Math.max(demandItem.price * (1 - priceDecreaseFactor), demandItem.initialDemandPrice * 0.7).toFixed(2)); 
        showNotification(`Sold ${quantity} of ${demandItem.product.name} to ${wholesaler.name} for $${revenue.toFixed(2)}.`, 'success');
    } else {
        showNotification(`Error selling ${demandItem.product.name}. Inventory inconsistency.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('sellToWholesaler');
}
function fulfillContract(contractId) { 
    logFunctionStart('fulfillContract');
    const contractIndex = player.acceptedContracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1 || player.acceptedContracts[contractIndex].status !== 'active') {
        showNotification(`Active contract with ID ${contractId} not found.`, 'error');
        logFunctionEnd('fulfillContract'); return;
    }
    const contract = player.acceptedContracts[contractIndex];
    const revenue = contract.quantity * contract.pricePerUnit;
    if (!player.hasEnoughProduct(contract.productName, contract.quantity)) {
        const playerProduct = player.inventory.find(item => item.product.name === contract.productName);
        showNotification(`Cannot fulfill contract for ${contract.productName}. Insufficient stock. Player has ${playerProduct ? playerProduct.quantity : 0}/${contract.quantity} needed.`, 'error');
        logFunctionEnd('fulfillContract'); return;
    }
    if (player.removeProductFromInventory(contract.productName, contract.quantity)) {
        player.money += revenue; 
        player.lastTurnIncome += revenue; 
        contract.status = 'fulfilled';
        showNotification(`Contract for ${contract.productName} fulfilled! Player earned $${revenue.toFixed(2)}.`, 'success');
    } else {
        showNotification(`Error fulfilling contract ${contract.productName}: Failed to remove product.`, 'error');
    }
    refreshAllDisplays();
    logFunctionEnd('fulfillContract');
}

// --- Game Initialization & Core Logic ---
function setupEventListeners() {
    logFunctionStart('setupEventListeners');
    const sortKeySelect = document.getElementById('sort-key-contracts');
    const sortOrderSelect = document.getElementById('sort-order-contracts');
    const applySortBtn = document.getElementById('apply-sort-contracts-btn');

    if (applySortBtn) {
        applySortBtn.addEventListener('click', () => {
            playerContractsSortKey = sortKeySelect.value;
            playerContractsSortOrder = sortOrderSelect.value;
            console.log(`Applied sort: Key=${playerContractsSortKey}, Order=${playerContractsSortOrder}`);
            displayPlayerActiveContractsDetailed();
        });
    } else {
        console.error("Could not find apply sort button for contracts.");
    }
    logFunctionEnd('setupEventListeners');
}

function initializeGame() {
    logFunctionStart('initializeGame');
    currentTurn = 0; 
    gameProducts = [ 
        new Product("Apples", 1.0, 1.0), 
        new Product("Bananas", 0.5, 1.1), 
        new Product("Bread", 2.5, 0.9), 
        new Product("Milk", 1.5, 0.95), 
        new Product("Cheese", 3.0, 0.85),
        new Product('Wood', 5, 0.2), 
        new Product('Wooden Chair', 20, 0.8) 
    ];
    gameSuppliers = generateSupplierNPCs(gameProducts, 3); 
    gameWholesalers = generateWholesalerNPCs(gameProducts, 3); 
    player = new Player(2000); 
    marketContracts = []; 
    gameWholesalers.forEach(wholesaler => {
        for (let i = 0; i < (Math.floor(Math.random() * 2) + 1); i++) { 
            const contract = wholesaler.generateContract();
            if (contract) marketContracts.push(contract);
        }
    });
    setupEventListeners(); 
    refreshAllDisplays(); 
    logFunctionEnd('initializeGame');
}

function advanceTurn() {
    logFunctionStart('advanceTurn');

    if (!player) {
        showNotification("Player data is not initialized. Please reload the game.", "error");
        console.error("CRITICAL: Player object is not initialized in advanceTurn. Game cannot proceed.");
        logFunctionEnd('advanceTurn');
        return; // Stop execution if player is not initialized
    }
    
    // Reset last turn's finances at the beginning of the new turn
    player.lastTurnIncome = 0;
    player.lastTurnExpenses = 0;

    currentTurn++;
    showNotification(`Advanced to Turn: ${currentTurn}`, 'info'); 
    console.log(`--- Advancing to Turn ${currentTurn} ---`);

    gameSuppliers.forEach(supplier => supplier.updatePrices());
    gameSuppliers.forEach(supplier => {
        supplier.inventory.forEach(item => {
            item.priceHistory.push({ turn: currentTurn, price: item.price });
            if (item.priceHistory.length > MAX_PRICE_HISTORY) item.priceHistory.shift(); 
        });
    });
    gameWholesalers.forEach(wholesaler => wholesaler.updateDemandPrices());

    player.acceptedContracts.forEach(contract => {
        if (contract.status === 'active' && currentTurn > contract.deadlineTurns) {
            contract.status = 'expired';
            showNotification(`Contract for ${contract.productName} from ${contract.issuerNPC} has expired!`, 'error');
        }
    });
    player.acceptedContracts = player.acceptedContracts.filter(c => c.status !== 'expired' && c.status !== 'fulfilled');
    
    player.productionUnits.forEach(unit => {
        if (unit.status === 'producing') {
            unit.productionProgress--;
            if (unit.productionProgress <= 0) {
                unit.status = 'completed';
                unit.outputInventory.quantity += unit.productionRecipe.output.quantity; 
                showNotification(`${unit.name} has finished producing ${unit.productionRecipe.output.quantity} ${unit.productionRecipe.output.productName}!`, 'success');
                console.log(`${unit.name} (ID: ${unit.instanceId}) finished production. Output: ${unit.outputInventory.quantity} ${unit.outputInventory.productName}`);
            }
        }
    });

    if (player.retailStore) {
        let totalRetailSalesThisTurn = 0;
        let salesSummary = [];
        player.retailStore.stock.forEach(item => {
            if (item.forSale && item.quantity > 0) {
                let priceEffectFactor = 1.0;
                const retailPrice = item.price;
                const basePrice = item.product.basePrice; 
                if (retailPrice <= basePrice * 1.5) priceEffectFactor = 1.0;
                else if (retailPrice <= basePrice * 2.0) priceEffectFactor = 0.75;
                else priceEffectFactor = 0.4;
                if (retailPrice < basePrice * 0.8) priceEffectFactor = 1.1; 
                
                const maxPotentialSales = Math.floor(Math.random() * 5 * item.product.demandFactor * priceEffectFactor * (player.retailStore.level * 1.5));
                const actualSales = Math.min(item.quantity, maxPotentialSales);
                
                if (actualSales > 0) {
                    item.quantity -= actualSales;
                    const revenueFromSale = actualSales * item.price;
                    player.retailStore.cashRegister += revenueFromSale; 
                    totalRetailSalesThisTurn += revenueFromSale;
                    salesSummary.push(`${actualSales} ${item.product.name} for $${revenueFromSale.toFixed(2)}`);
                    console.log(`Retail Sale: Sold ${actualSales} of ${item.product.name} at $${item.price} each. Store cash: $${player.retailStore.cashRegister.toFixed(2)}`);
                }
            }
        });
        if (salesSummary.length > 0) {
            showNotification(`Your store sold: ${salesSummary.join(', ')}. Total: $${totalRetailSalesThisTurn.toFixed(2)}.`, 'success');
        } else {
            console.log("No retail sales this turn.");
        }
    }

    const maxMarketContractsPerWholesaler = 2;
    gameWholesalers.forEach(wholesaler => {
        const existingContractsFromWholesaler = marketContracts.filter(c => c.issuerNPC === wholesaler.name && c.status === 'pending').length;
        if (existingContractsFromWholesaler < maxMarketContractsPerWholesaler) {
            if (Math.random() < 0.25) { 
                const contract = wholesaler.generateContract();
                if (contract) marketContracts.push(contract);
            }
        }
    });
    refreshAllDisplays(); 
    logFunctionEnd('advanceTurn');
}

// Call initializeGame when the script loads
initializeGame();
console.log('--- Script End ---');
