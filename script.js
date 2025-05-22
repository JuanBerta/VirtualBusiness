// script.js
console.log('--- Script Start ---');

let currentTurn = 0; // Initialize currentTurn globally

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

class Warehouse {
    constructor(id, name, capacity) {
        this.id = id;
        this.name = name;
        this.capacity = capacity; 
        this.inventory = []; 
    }

    getCurrentStockLoad() {
        return this.inventory.reduce((total, item) => total + item.quantity, 0);
    }

    addProduct(productObject, quantity) {
        logFunctionStart(`Warehouse.addProduct (${this.name})`);
        if (this.getCurrentStockLoad() + quantity > this.capacity) {
            showNotification(`Cannot add ${quantity} ${productObject.name} to ${this.name}. Exceeds capacity.`, 'error');
            logFunctionEnd(`Warehouse.addProduct (${this.name})`);
            return false;
        }
        const existingItem = this.inventory.find(item => item.product.name === productObject.name);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.inventory.push({ product: productObject, quantity: quantity });
        }
        logFunctionEnd(`Warehouse.addProduct (${this.name})`);
        return true;
    }

    removeProduct(productName, quantity) {
        logFunctionStart(`Warehouse.removeProduct (${this.name})`);
        const productIndex = this.inventory.findIndex(item => item.product.name === productName);
        if (productIndex > -1) {
            if (this.inventory[productIndex].quantity >= quantity) {
                this.inventory[productIndex].quantity -= quantity;
                if (this.inventory[productIndex].quantity === 0) {
                    this.inventory.splice(productIndex, 1); 
                }
                logFunctionEnd(`Warehouse.removeProduct (${this.name})`);
                return true;
            } else {
                logFunctionEnd(`Warehouse.removeProduct (${this.name})`);
                return false; 
            }
        }
        logFunctionEnd(`Warehouse.removeProduct (${this.name})`);
        return false; 
    }

    getProductQuantity(productName) {
        const productItem = this.inventory.find(item => item.product.name === productName);
        return productItem ? productItem.quantity : 0;
    }
}


class Supplier {
    constructor(name) {
        this.name = name;
        this.inventory = []; 
        this.recurringOffers = []; 
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
        this.inventory.forEach(item => {
            const basePrice = item.basePrice; 
            let currentPrice = item.price;
            const initialStock = this.initialStockLevels ? (this.initialStockLevels.get(item.product.name) || item.quantity) : item.quantity;
            if (item.quantity > (initialStock * 1.5) ) currentPrice -= basePrice * 0.015; 
            else if (item.quantity < (initialStock * 0.5) ) currentPrice += basePrice * 0.015; 
            item.price = parseFloat(Math.max(basePrice * 0.7, Math.min(currentPrice, basePrice * 1.5)).toFixed(2));
        });
    }
     
     setInitialStockLevels() {
        this.initialStockLevels = new Map();
        this.inventory.forEach(item => {
            this.initialStockLevels.set(item.product.name, item.quantity);
        });
    }

    sellToNPC(productName, quantity) {
        logFunctionStart(`Supplier.sellToNPC (${this.name})`);
        const productIndex = this.inventory.findIndex(item => item.product.name === productName);
        if (productIndex > -1) {
            if (this.inventory[productIndex].quantity >= quantity) {
                this.inventory[productIndex].quantity -= quantity;
                // console.log(`${this.name} sold ${quantity} of ${productName} to an NPC. Stock remaining: ${this.inventory[productIndex].quantity}`);
                logFunctionEnd(`Supplier.sellToNPC (${this.name})`);
                return true;
            } else {
                // console.log(`${this.name} does not have enough ${productName} to sell ${quantity} to NPC.`);
                logFunctionEnd(`Supplier.sellToNPC (${this.name})`);
                return false;
            }
        }
        // console.log(`${productName} not found in ${this.name}'s inventory for NPC sale.`);
        logFunctionEnd(`Supplier.sellToNPC (${this.name})`);
        return false;
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
            initialQuantity: quantity, 
            unitsPurchasedLastTurn: 0, turnsWithoutPurchase: 0 
        });
    }

    generateContract() {
        if (this.demand.length === 0) return null;
        const demandItem = this.demand[Math.floor(Math.random() * this.demand.length)];
        if (!demandItem || !demandItem.product) return null;
        const product = demandItem.product;
        const contractQuantity = Math.floor(Math.random() * (demandItem.initialQuantity * 0.5)) + Math.floor(demandItem.initialQuantity * 0.25); 
        const contractPricePerUnit = parseFloat((demandItem.price * 1.05).toFixed(2)); 
        const deadline = currentTurn + Math.floor(Math.random() * 6) + 5; 
        return new Contract(product.name, contractQuantity, contractPricePerUnit, deadline, this.name);
    }

    updateDemandPrices() {
        this.demand.forEach(item => {
            const initialPrice = item.initialDemandPrice;
            let currentPrice = item.price;
            if (item.unitsPurchasedLastTurn > 0) {
                currentPrice -= initialPrice * 0.02 * (item.unitsPurchasedLastTurn / (item.initialQuantity * 0.1)); 
                item.turnsWithoutPurchase = 0;
            } else {
                item.turnsWithoutPurchase++;
                if (item.turnsWithoutPurchase > 2) currentPrice += initialPrice * 0.01;
            }
            item.unitsPurchasedLastTurn = 0; 
            item.price = parseFloat(Math.max(initialPrice * 0.7, Math.min(currentPrice, initialPrice * 1.3)).toFixed(2));
        });
    }

    buyFromNPC(productName, quantity) {
        logFunctionStart(`Wholesaler.buyFromNPC (${this.name})`);
        const demandItem = this.demand.find(item => item.product.name === productName);
        if (demandItem && demandItem.quantity >= quantity) {
            demandItem.quantity -= quantity;
            demandItem.unitsPurchasedLastTurn += quantity; 
            // console.log(`${this.name} bought ${quantity} of ${productName} from an NPC. Demand remaining: ${demandItem.quantity}`);
            logFunctionEnd(`Wholesaler.buyFromNPC (${this.name})`);
            return true;
        }
        // console.log(`${this.name} could not buy ${quantity} of ${productName} from NPC (not enough demand or product not found).`);
        logFunctionEnd(`Wholesaler.buyFromNPC (${this.name})`);
        return false;
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
        this.id = 'contract-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); 
    }
}

class RecurringSupplyContract {
    constructor(id, supplierId, supplierName, productId, productName, quantityPerTurn, pricePerUnit, totalTurns, targetWarehouseId) {
        this.id = id; 
        this.supplierId = supplierId; 
        this.supplierName = supplierName;
        this.productId = productId; 
        this.productName = productName;
        this.quantityPerTurn = quantityPerTurn;
        this.pricePerUnit = pricePerUnit;
        this.totalTurns = totalTurns;
        this.turnsRemaining = totalTurns;
        this.targetWarehouseId = targetWarehouseId || 'wh0'; 
        this.status = 'active'; 
    }
}


class ProductionUnit {
    constructor(typeId, name, cost, productionRecipe, instanceId, targetWarehouseId) { 
        this.typeId = typeId; 
        this.instanceId = instanceId; 
        this.name = name; 
        this.cost = cost; 
        this.productionRecipe = productionRecipe; 
        this.targetWarehouseId = targetWarehouseId; 
        this.status = 'idle'; 
        this.productionProgress = 0; 
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

class NPCCompany {
    constructor(id, name, money, strategy) {
        this.id = id;
        this.name = name;
        this.money = money;
        this.inventory = {}; 
        this.strategy = strategy; 
        this.buyOffersForPlayer = []; 
        this.acceptedContractsFromPlayer = []; 
        this.lastActivity = "Observing market..."; // Stretch Goal
    }

    updateInventory(productName, quantity) {
        this.inventory[productName] = (this.inventory[productName] || 0) + quantity;
        if (this.inventory[productName] <= 0) { 
            delete this.inventory[productName];
        }
        // console.log(`${this.name} inventory update: ${productName} new quantity ${this.inventory[productName] || 0}`);
    }

    canAfford(cost) {
        return this.money >= cost;
    }

    generateBuyOfferForPlayer(gameProducts) {
        // logFunctionStart(`NPCCompany.generateBuyOfferForPlayer (${this.name})`);
        if (this.buyOffersForPlayer.filter(o => o.status === 'pending').length >= 2) {
            // logFunctionEnd(`NPCCompany.generateBuyOfferForPlayer (${this.name}) - too many pending offers`);
            return;
        }

        if (Math.random() > 0.2) { 
            // logFunctionEnd(`NPCCompany.generateBuyOfferForPlayer (${this.name}) - no offer this turn (random chance)`);
            this.lastActivity = "Considered making a purchase order for player, but decided against it this turn.";
            return;
        }

        let wantedProduct = null;
        if (this.strategy === 'RAW_MATERIAL_FOCUS' && (this.inventory['Wood'] || 0) < 150) {
            wantedProduct = gameProducts.find(p => p.name === 'Wood');
        } else if (this.strategy === 'FINISHED_GOODS_FOCUS' && (this.inventory['Wooden Chair'] || 0) < 75) {
            wantedProduct = gameProducts.find(p => p.name === 'Wooden Chair');
        } else if (this.strategy === 'GENERAL_TRADER' || this.strategy === 'BALANCED_OPERATOR') {
            const potentialProducts = gameProducts.filter(p => (this.inventory[p.name] || 0) < 50);
            if (potentialProducts.length > 0) {
                wantedProduct = potentialProducts[Math.floor(Math.random() * potentialProducts.length)];
            }
        }

        if (!wantedProduct) {
            // logFunctionEnd(`NPCCompany.generateBuyOfferForPlayer (${this.name}) - no product chosen by strategy`);
            this.lastActivity = "Evaluated product needs, no new purchase orders for player.";
            return;
        }
        
        const quantity = Math.floor(Math.random() * 81) + 20; // 20-100 units
        let typicalWholesalerPrice = 0;
        let demandCount = 0;
        gameWholesalers.forEach(wh => {
            wh.demand.forEach(d => {
                if(d.product.name === wantedProduct.name) {
                    typicalWholesalerPrice += d.price;
                    demandCount++;
                }
            });
        });
        const avgWholesalerPrice = demandCount > 0 ? typicalWholesalerPrice / demandCount : 0;
        
        let pricePerUnit = wantedProduct.basePrice * (1.1 + Math.random() * 0.2); 
        if (avgWholesalerPrice > 0 && avgWholesalerPrice > pricePerUnit) {
            pricePerUnit = avgWholesalerPrice * (1.02 + Math.random() * 0.08); 
        }
        pricePerUnit = parseFloat(pricePerUnit.toFixed(2));

        const deadlineTurns = currentTurn + Math.floor(Math.random() * 11) + 5; 
        const offerId = `npcOffer-${this.id}-${Date.now().toString(36)}${Math.random().toString(36).substr(2,3)}`;

        const newOffer = {
            offerId: offerId,
            npcId: this.id,
            npcName: this.name,
            productName: wantedProduct.name,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            deadlineTurns: deadlineTurns,
            status: 'pending' 
        };

        this.buyOffersForPlayer.push(newOffer);
        this.lastActivity = `Issued a buy offer for ${quantity} ${wantedProduct.name}.`;
        console.log(`${this.name} generated buy offer for player: ${quantity} of ${wantedProduct.name} @ $${pricePerUnit}/unit, deadline Turn ${deadlineTurns}. Offer ID: ${offerId}`);
        // logFunctionEnd(`NPCCompany.generateBuyOfferForPlayer (${this.name})`);
    }
}

class Player {
    constructor(initialMoney = 1000) {
        this.money = initialMoney;
        this.warehouses = []; 
        this.acceptedContracts = []; 
        this.productionUnits = []; 
        this.retailStore = null; 
        this.lastTurnIncome = 0;
        this.lastTurnExpenses = 0;
        this.recurringSupplyContracts = []; 
        this.deliveryContractsToNPCs = []; 

        const mainWarehouse = new Warehouse('wh0', 'Main Warehouse', 5000);
        this.warehouses.push(mainWarehouse);
    }

    getPrimaryWarehouse() {
        if (this.warehouses.length > 0) {
            return this.warehouses[0];
        }
        console.error("Player has no warehouses!"); 
        return null; 
    }

    addProductToWarehouse(product, quantity, warehouseId = null) { 
        const warehouse = warehouseId ? this.warehouses.find(wh => wh.id === warehouseId) : this.getPrimaryWarehouse();
        if (warehouse) {
            return warehouse.addProduct(product, quantity);
        }
        showNotification("Target warehouse not found for adding product.", "error");
        return false;
    }

    removeProductFromWarehouse(productName, quantity, warehouseId = null) {
        const warehouse = warehouseId ? this.warehouses.find(wh => wh.id === warehouseId) : this.getPrimaryWarehouse();
        if (warehouse) {
            return warehouse.removeProduct(productName, quantity);
        }
        showNotification("Target warehouse not found for removing product.", "error");
        return false;
    }

    hasEnoughProduct(productName, quantity, warehouseId = null) {
        const warehouse = warehouseId ? this.warehouses.find(wh => wh.id === warehouseId) : this.getPrimaryWarehouse();
        if (warehouse) {
            return warehouse.getProductQuantity(productName) >= quantity;
        }
        return false;
    }
}

// --- UI Feedback ---
// ... (showNotification unchanged)
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
// ... (generateSupplierNPCs, generateWholesalerNPCs largely unchanged for this step beyond parameter adjustments)
let recurringOfferIdCounter = 0; 

function generateSupplierNPCs(products, count) {
    logFunctionStart('generateSupplierNPCs');
    const suppliers = [];
    const supplierNames = ["Farm Fresh Co.", "Reliable Goods Inc.", "Speedy Supplies Ltd.", "Global Produce", "Timber Town Supplies"];
    for (let i = 0; i < count; i++) {
        const supplierId = `sup${i}`;
        const name = supplierNames[i % supplierNames.length] + (Math.floor(i / supplierNames.length) > 0 ? ` ${Math.floor(i / supplierNames.length) +1}` : '');
        const supplier = new Supplier(name);
        supplier.id = supplierId; 

        const numProductsToOffer = Math.floor(Math.random() * Math.min(products.length, 3)) + 1; 
        let availableProducts = [...products];
        
        if (i === 0 && products.find(p => p.name === 'Wood')) {
            const woodProduct = products.find(p => p.name === 'Wood');
            if (woodProduct) {
                 const quantity = Math.floor(Math.random() * 1001) + 500; 
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
            const quantity = Math.floor(Math.random() * 1001) + 500; 
            const priceVariation = (Math.random() * 0.2) - 0.1; 
            const price = parseFloat((product.basePrice * (1 + priceVariation)).toFixed(2));
            supplier.addProduct(product, quantity, price); 
        }
        supplier.setInitialStockLevels(); 

        const numRecurringOffers = Math.floor(Math.random() * 2) + 1;
        const productsForRecurring = [...products].sort(() => 0.5 - Math.random()); 

        for (let k = 0; k < numRecurringOffers && k < productsForRecurring.length; k++) {
            const productForOffer = productsForRecurring[k];
            if (productForOffer.name === 'Wooden Chair' && productForOffer.basePrice > 10) continue; 

            recurringOfferIdCounter++;
            const offer = {
                id: `recOffer-${recurringOfferIdCounter}`,
                supplierId: supplier.id,
                supplierName: supplier.name,
                productId: productForOffer.name, 
                productName: productForOffer.name,
                quantityPerTurn: Math.floor(Math.random() * 41) + 10, 
                pricePerUnit: parseFloat((productForOffer.basePrice * (0.9 + Math.random() * 0.15)).toFixed(2)), 
                totalTurns: Math.floor(Math.random() * 11) + 10, 
            };
            supplier.recurringOffers.push(offer);
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
                const quantity = Math.floor(Math.random() * 601) + 200; 
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
            const quantity = Math.floor(Math.random() * 601) + 200; 
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
const MAX_PRICE_HISTORY = 15; 
let playerContractsSortKey = 'deadlineTurns'; 
let playerContractsSortOrder = 'asc';       
let productionUnitInstanceCounter = 0; 
const RETAIL_STORE_COST_TO_OPEN = 2500;
let npcCompanies = []; 
let npcCompanyIdCounter = 0; 

const NPC_COMPANY_NAMES = ["Alpha Trading Co.", "Reliable Resources Inc.", "General Goods Ltd.", "Pioneer Ventures", "Apex Solutions", "Global Dynamics"];
const NPC_STRATEGIES = ['RAW_MATERIAL_FOCUS', 'FINISHED_GOODS_FOCUS', 'GENERAL_TRADER', 'BALANCED_OPERATOR', 'PRODUCER']; // Added PRODUCER


const availableProductionUnitTypes = [
    { 
        id: 'workshop1', 
        name: 'Small Workshop', 
        cost: 1000, 
        recipe: { 
            input: { productName: 'Wood', quantity: 50 }, 
            output: { productName: 'Wooden Chair', quantity: 20 }, 
            turnsToProduce: 3 
        } 
    },
];

// --- Market Opportunities ---
// ... (findProfitableTrades and displayMarketOpportunities remain unchanged)
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
        logFunctionEnd('displayPlayerOwnedUnits'); return;
    }

    let html = '<h2>My Production Units</h2>';
    if (!player || player.productionUnits.length === 0) {
        html += '<p>You do not own any production units.</p>';
    } else {
        html += '<ul>';
        player.productionUnits.forEach(unit => {
            let statusText = unit.status.toUpperCase();
            if (unit.status === 'producing') {
                statusText += ` (${unit.productionProgress} turns left)`;
            } else if (unit.status === 'completed') {
                statusText += ` (Output: ${unit.productionRecipe.output.quantity} ${unit.productionRecipe.output.productName} ready)`;
            } else if (unit.status === 'sourcing_materials') {
                statusText = 'SOURCING MATERIALS';
            } else if (unit.status === 'transferring_output') {
                statusText = 'TRANSFERRING OUTPUT TO WAREHOUSE';
            }


            html += `
                <li>
                    <strong>${unit.name} (ID: ${unit.instanceId})</strong> - Linked Warehouse: ${unit.targetWarehouseId}<br>
                    Status: ${statusText}<br>
                    Recipe: ${unit.productionRecipe.input.quantity} ${unit.productionRecipe.input.productName} &rarr; ${unit.productionRecipe.output.quantity} ${unit.productionRecipe.output.productName} (${unit.productionRecipe.turnsToProduce} turns)
                </li>`;
        });
        html += '</ul>';
    }
    ownedUnitsSection.innerHTML = html;
    logFunctionEnd('displayPlayerOwnedUnits');
}

// ... (Other display functions: displayRetailManagement, displayPlayerInfo, etc. remain unchanged for now)
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
            const playerInventoryItem = player.getPrimaryWarehouse().inventory.find(pInv => pInv.product.name === item.product.name);
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

    const primaryWarehouse = player.getPrimaryWarehouse();
    let inventoryHTML = '<p>No warehouse found.</p>'; 

    if (primaryWarehouse) {
        inventoryHTML = `<h4>${primaryWarehouse.name} (Capacity: ${primaryWarehouse.getCurrentStockLoad()}/${primaryWarehouse.capacity})</h4><ul>`;
        if (primaryWarehouse.inventory.length === 0) {
            inventoryHTML += '<li>Empty</li>';
        } else {
            primaryWarehouse.inventory.forEach(item => {
                inventoryHTML += `<li>${item.product.name}: ${item.quantity}</li>`;
            });
        }
        inventoryHTML += '</ul>';
    }
    
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
        <p><strong>Main Warehouse Inventory:</strong></p>${inventoryHTML}
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

function displayRecurringContractOffers() {
    logFunctionStart('displayRecurringContractOffers');
    const offersSection = document.getElementById('recurring-contracts-offers-section');
    if (!offersSection) { 
        logFunctionEnd('displayRecurringContractOffers');
        return; 
    }

    let html = '<h2>Recurring Supply Offers</h2>';
    let hasOffers = false;
    gameSuppliers.forEach((supplier) => { 
        if (supplier.recurringOffers && supplier.recurringOffers.length > 0) {
            if (!hasOffers) {
                html += '<ul>';
                hasOffers = true;
            }
            supplier.recurringOffers.forEach((offer) => { 
                html += `
                    <li>
                        <strong>Supplier:</strong> ${offer.supplierName}<br>
                        <strong>Product:</strong> ${offer.productName}<br>
                        <strong>Quantity/Turn:</strong> ${offer.quantityPerTurn}<br>
                        <strong>Price/Unit:</strong> $${offer.pricePerUnit.toFixed(2)}<br>
                        <strong>Total Turns:</strong> ${offer.totalTurns}<br>
                        <button onclick="acceptRecurringContract('${supplier.id}', '${offer.id}')" title="Accept this recurring supply contract from ${offer.supplierName}">Accept Offer</button>
                    </li>`;
            });
        }
    });

    if (!hasOffers) {
        html += "<p>No recurring contract offers currently available.</p>";
    } else {
        html += "</ul>";
    }
    offersSection.innerHTML = html;
    logFunctionEnd('displayRecurringContractOffers');
}

function displayPlayerActiveRecurringContracts() {
    logFunctionStart('displayPlayerActiveRecurringContracts');
    const activeRecurringSection = document.getElementById('player-active-recurring-contracts-section');
    if(!activeRecurringSection) {
        logFunctionEnd('displayPlayerActiveRecurringContracts');
        return;
    }

    let html = '<h2>My Recurring Supply Contracts</h2>';
    if (!player || player.recurringSupplyContracts.length === 0) {
        html += "<p>You have no active recurring supply contracts.</p>";
    } else {
        html += '<ul>';
        player.recurringSupplyContracts.forEach(contract => {
            html += `
                <li>
                    <strong>Supplier:</strong> ${contract.supplierName}<br>
                    <strong>Product:</strong> ${contract.productName}<br>
                    <strong>Quantity/Turn:</strong> ${contract.quantityPerTurn}<br>
                    <strong>Price/Unit:</strong> $${contract.pricePerUnit.toFixed(2)}<br>
                    <strong>Turns Remaining:</strong> ${contract.turnsRemaining} / ${contract.totalTurns}<br>
                    <strong>Status:</strong> ${contract.status.toUpperCase()}
                    ${contract.status === 'active' ? `<button onclick="cancelRecurringContract('${contract.id}')" title="Cancel this recurring contract">Cancel</button>` : ''}
                </li>`;
        });
        html += '</ul>';
    }
    activeRecurringSection.innerHTML = html;
    logFunctionEnd('displayPlayerActiveRecurringContracts');
}

function displayNpcBuyOffers() {
    logFunctionStart('displayNpcBuyOffers');
    const offersSection = document.getElementById('npc-buy-offers-section');
    if (!offersSection) { 
        logFunctionEnd('displayNpcBuyOffers');
        return; 
    }

    let html = '<h2>NPC Purchase Orders (Sell to NPC)</h2>';
    let hasAnyOffer = false;
    npcCompanies.forEach(company => {
        const pendingOffers = company.buyOffersForPlayer.filter(offer => offer.status === 'pending');
        if (pendingOffers.length > 0) {
            if (!hasAnyOffer) {
                html += '<ul>';
                hasAnyOffer = true;
            }
            pendingOffers.forEach(offer => {
                html += `
                    <li>
                        <strong>Buyer:</strong> ${offer.npcName} (ID: ${offer.npcId})<br>
                        <strong>Wants:</strong> ${offer.quantity} of ${offer.productName}<br>
                        <strong>Price/Unit:</strong> $${offer.pricePerUnit.toFixed(2)}<br>
                        <strong>Deadline:</strong> Turn ${offer.deadlineTurns}<br>
                        <button onclick="acceptNpcDeliveryContract('${offer.npcId}', '${offer.offerId}')" title="Accept to deliver ${offer.quantity} ${offer.productName} to ${offer.npcName}">Accept Delivery</button>
                    </li>`;
            });
        }
    });

    if (!hasAnyOffer) {
        html += "<p>No NPC purchase orders available this turn.</p>";
    } else {
        html += "</ul>";
    }
    offersSection.innerHTML = html;
    logFunctionEnd('displayNpcBuyOffers');
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
    displayRecurringContractOffers(); 
    displayPlayerActiveRecurringContracts(); 
    displayNpcBuyOffers(); 
    displayPlayerDeliveryContractsToNPCs(); // Added call
    displayNpcCompaniesInfo(); // Added call
    logFunctionEnd('refreshAllDisplays');
}

// --- View Switching Logic ---
function showView(viewIdToShow) {
    logFunctionStart(`showView - showing ${viewIdToShow}`);
    // Hide all views
    const views = document.querySelectorAll('.game-view');
    views.forEach(view => {
        view.style.display = 'none';
    });

    // Show the selected view
    const selectedView = document.getElementById(viewIdToShow);
    if (selectedView) {
        // For views that are direct grid containers or need specific display types
        if (viewIdToShow === 'view-dashboard' || viewIdToShow === 'view-marketplace' || viewIdToShow === 'view-contracts' || viewIdToShow === 'view-production') {
            selectedView.style.display = 'grid'; // Assuming these views might use grid for their sections
        } else {
            selectedView.style.display = 'block'; // Default for simpler views or sections
        }
        console.log(`Showing view: ${viewIdToShow} with display: ${selectedView.style.display}`);
    } else {
        console.error(`View with ID ${viewIdToShow} not found.`);
    }
    logFunctionEnd(`showView - showing ${viewIdToShow}`);
}


// --- Player Action Functions ---

function acceptRecurringContract(supplierId, offerId) {
    logFunctionStart('acceptRecurringContract');
    console.log(`Attempting to accept recurring offer: ${offerId} from supplier: ${supplierId}`);
    const supplier = gameSuppliers.find(s => s.id === supplierId);
    if (!supplier) {
        showNotification("Supplier for the recurring offer not found.", "error");
        logFunctionEnd('acceptRecurringContract');
        return;
    }
    const offerIndex = supplier.recurringOffers.findIndex(o => o.id === offerId);
    if (offerIndex === -1) {
        showNotification("Recurring offer not found or already accepted.", "error");
        logFunctionEnd('acceptRecurringContract');
        return;
    }
    const offer = supplier.recurringOffers[offerIndex];

    const newRecurringContract = new RecurringSupplyContract(
        `playerRec-${Date.now().toString(36)}${Math.random().toString(36).substr(2,3)}`, 
        offer.supplierId,
        offer.supplierName,
        offer.productId,
        offer.productName,
        offer.quantityPerTurn,
        offer.pricePerUnit,
        offer.totalTurns,
        player.getPrimaryWarehouse().id 
    );

    player.recurringSupplyContracts.push(newRecurringContract);
    supplier.recurringOffers.splice(offerIndex, 1); 

    showNotification(`Accepted recurring supply contract for ${offer.productName} from ${offer.supplierName}.`, "success");
    refreshAllDisplays();
    logFunctionEnd('acceptRecurringContract');
}

function cancelRecurringContract(contractId) {
    logFunctionStart('cancelRecurringContract');
    const contractIndex = player.recurringSupplyContracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
        showNotification("Recurring contract not found.", "error");
        logFunctionEnd('cancelRecurringContract');
        return;
    }
    const contract = player.recurringSupplyContracts[contractIndex];
    if (contract.status === 'active') {
        contract.status = 'cancelled';
        showNotification(`Recurring contract for ${contract.productName} from ${contract.supplierName} has been cancelled.`, 'info');
    } else {
        showNotification(`Contract is already ${contract.status}.`, 'info');
    }
    refreshAllDisplays();
    logFunctionEnd('cancelRecurringContract');
}

function acceptNpcDeliveryContract(npcId, offerId) {
    logFunctionStart('acceptNpcDeliveryContract');
    const company = npcCompanies.find(c => c.id === npcId);
    if (!company) {
        showNotification("NPC Company not found.", "error");
        logFunctionEnd('acceptNpcDeliveryContract');
        return;
    }
    const offerIndex = company.buyOffersForPlayer.findIndex(o => o.offerId === offerId && o.status === 'pending');
    if (offerIndex === -1) {
        showNotification("NPC buy offer not found or already accepted.", "error");
        logFunctionEnd('acceptNpcDeliveryContract');
        return;
    }
    const offer = company.buyOffersForPlayer[offerIndex];

    // Create a new contract object for the player
    const playerDeliveryContract = {
        id: `playerDelivery-${Date.now().toString(36)}${Math.random().toString(36).substr(2,5)}`, // Unique ID for this delivery
        offerId: offer.offerId, // Link back to the original offer
        npcId: offer.npcId,
        npcName: offer.npcName,
        productName: offer.productName,
        quantity: offer.quantity,
        pricePerUnit: offer.pricePerUnit,
        totalValue: offer.quantity * offer.pricePerUnit,
        deadlineTurns: offer.deadlineTurns,
        status: 'active_player_delivery' // Player needs to deliver
    };
    player.deliveryContractsToNPCs.push(playerDeliveryContract);

    // Update NPC's record - mark the offer as accepted (or move to a different list)
    // For simplicity, let's change status on original offer and add to NPC's accepted list
    offer.status = 'player_accepted'; 
    // It's also good for the NPC to have a reference to the player's specific contract ID if needed
    company.acceptedContractsFromPlayer.push({
        ...playerDeliveryContract, // Copy details
        playerContractId: playerDeliveryContract.id, // Reference player's contract
        originalOfferId: offer.offerId
    });
    
    // Optional: Remove from buyOffersForPlayer if we don't want to see it anymore
    // company.buyOffersForPlayer.splice(offerIndex, 1); 
    // Or, just rely on status 'pending' for display

    showNotification(`Contract accepted! Deliver ${offer.quantity} ${offer.productName} to ${offer.npcName} by turn ${offer.deadlineTurns}.`, "success");
    refreshAllDisplays();
    logFunctionEnd('acceptNpcDeliveryContract');
}


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
        showNotification(`Not enough ${productName} in your warehouse inventory.`, 'error');
        logFunctionEnd('addStockToRetail'); return;
    }

    const storeItem = player.retailStore.stock.find(item => item.product.name === productName);
    if (!storeItem) {
        showNotification(`Product ${productName} not found in store stock definitions.`, 'error'); 
        logFunctionEnd('addStockToRetail'); return;
    }

    if (player.removeProductFromWarehouse(productName, quantity)) { 
        storeItem.quantity += quantity;
        showNotification(`Added ${quantity} ${productName} to your retail store.`, 'success');
    } else {
        showNotification(`Failed to remove ${productName} from warehouse.`, 'error');
    }
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
    const primaryWarehouseId = player.getPrimaryWarehouse() ? player.getPrimaryWarehouse().id : 'wh0'; 
    const newUnit = new ProductionUnit(
        unitType.id, 
        unitType.name, 
        unitType.cost, 
        unitType.recipe, 
        `unit-${productionUnitInstanceCounter}`,
        primaryWarehouseId 
    );
    player.productionUnits.push(newUnit);
    showNotification(`Successfully purchased ${unitType.name}!`, 'success');
    console.log(`Player bought ${unitType.name}. Instance ID: ${newUnit.instanceId}. Player money: $${player.money.toFixed(2)}`);
    refreshAllDisplays();
    logFunctionEnd('buyProductionUnit');
}

function loadMaterialsForProductionUnit(unitInstanceId) {
    showNotification("Production units operate automatically. Manual loading disabled.", "info");
}

function startProductionOnUnit(unitInstanceId) {
    showNotification("Production units operate automatically. Manual start disabled.", "info");
}

function collectOutputFromProductionUnit(unitInstanceId) {
    showNotification("Production units operate automatically. Manual collection disabled.", "info");
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
    
    const primaryWarehouse = player.getPrimaryWarehouse();
    if (!primaryWarehouse || primaryWarehouse.getCurrentStockLoad() + quantity > primaryWarehouse.capacity) {
        showNotification(`Cannot buy ${quantity} ${productItem.product.name}. Primary warehouse will exceed capacity.`, 'error');
        logFunctionEnd('buyFromSupplier'); return;
    }

    player.money -= cost; 
    player.lastTurnExpenses += cost; 
    player.addProductToWarehouse(productItem.product, quantity); 
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
        showNotification(`Not enough ${demandItem.product.name} in your warehouse to sell ${quantity}.`, 'error');
        logFunctionEnd('sellToWholesaler'); return;
    }

    if(player.removeProductFromWarehouse(demandItem.product.name, quantity)) { 
        player.money += revenue; 
        player.lastTurnIncome += revenue; 
        demandItem.quantity -= quantity; 
        demandItem.unitsPurchasedLastTurn += quantity; 
        const priceDecreaseFactor = 0.01 + (Math.random() * 0.02); 
        demandItem.price = parseFloat(Math.max(demandItem.price * (1 - priceDecreaseFactor), demandItem.initialDemandPrice * 0.7).toFixed(2)); 
        showNotification(`Sold ${quantity} of ${demandItem.product.name} to ${wholesaler.name} for $${revenue.toFixed(2)}.`, 'success');
    } else {
        showNotification(`Error selling ${demandItem.product.name}. Warehouse inventory inconsistency.`, 'error');
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
        const primaryWarehouse = player.getPrimaryWarehouse();
        const qtyInWarehouse = primaryWarehouse ? primaryWarehouse.getProductQuantity(contract.productName) : 0;
        showNotification(`Cannot fulfill contract for ${contract.productName}. Insufficient stock in warehouse. Player has ${qtyInWarehouse}/${contract.quantity} needed.`, 'error');
        logFunctionEnd('fulfillContract'); return;
    }

    if (player.removeProductFromWarehouse(contract.productName, contract.quantity)) { 
        player.money += revenue; 
        player.lastTurnIncome += revenue; 
        contract.status = 'fulfilled';
        showNotification(`Contract for ${contract.productName} fulfilled! Player earned $${revenue.toFixed(2)}.`, 'success');
    } else {
        showNotification(`Error fulfilling contract ${contract.productName}: Failed to remove product from warehouse.`, 'error');
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
    
    // Navigation event listeners
    document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); showView('view-dashboard'); });
    document.getElementById('nav-production').addEventListener('click', (e) => { e.preventDefault(); showView('view-production'); });
    document.getElementById('nav-retail').addEventListener('click', (e) => { e.preventDefault(); showView('view-retail'); });
    document.getElementById('nav-marketplace').addEventListener('click', (e) => { e.preventDefault(); showView('view-marketplace'); });
    document.getElementById('nav-contracts').addEventListener('click', (e) => { e.preventDefault(); showView('view-contracts'); });
    document.getElementById('nav-npcs').addEventListener('click', (e) => { e.preventDefault(); showView('view-npcs'); });
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
    player = new Player(5000); 
    marketContracts = []; 
    gameWholesalers.forEach(wholesaler => {
        const baseQuantity = Math.floor(Math.random() * 201) + 100; 
        for (let i = 0; i < (Math.floor(Math.random() * 2) + 1); i++) { 
            const demandItem = wholesaler.demand[Math.floor(Math.random() * wholesaler.demand.length)];
            if (demandItem && demandItem.product) { 
                 const contractQuantity = Math.min(baseQuantity, Math.floor(demandItem.initialQuantity * (Math.random() * 0.5 + 0.25))); 
                 const contractPricePerUnit = parseFloat((demandItem.price * 1.05).toFixed(2)); 
                 const deadline = currentTurn + Math.floor(Math.random() * 6) + 5; 
                 marketContracts.push(new Contract(demandItem.product.name, contractQuantity, contractPricePerUnit, deadline, wholesaler.name));
            }
        }
    });

    // Initialize NPC Companies
    npcCompanies = [];
    npcCompanyIdCounter = 0;
    const numNpcCompanies = Math.floor(Math.random() * 2) + 2; // 2 or 3 companies
    for (let i = 0; i < numNpcCompanies; i++) {
        npcCompanyIdCounter++;
        const companyId = `npc_comp_${npcCompanyIdCounter}`;
        const companyName = NPC_COMPANY_NAMES[Math.floor(Math.random() * NPC_COMPANY_NAMES.length)] + ` ${npcCompanyIdCounter}`;
        const companyStrategy = NPC_STRATEGIES[Math.floor(Math.random() * NPC_STRATEGIES.length)];
        const companyMoney = Math.floor(Math.random() * 3001) + 7000; // 7000-10000
        
        const company = new NPCCompany(companyId, companyName, companyMoney, companyStrategy);
        
        const numInitialProducts = Math.floor(Math.random() * 3) + 1; 
        for (let j=0; j<numInitialProducts; j++) {
            const product = gameProducts[Math.floor(Math.random() * gameProducts.length)];
            const quantity = Math.floor(Math.random() * 200) + 50; 
            company.inventory[product.name] = (company.inventory[product.name] || 0) + quantity;
        }
        npcCompanies.push(company);
    }
    console.log("Initialized NPC Companies:", JSON.stringify(npcCompanies.map(c => ({id: c.id, name: c.name, money: c.money, strategy: c.strategy, invCount: Object.keys(c.inventory).length }))));


    setupEventListeners(); 
    refreshAllDisplays(); 
    showView('view-dashboard'); // Set the default view
    logFunctionEnd('initializeGame');
}

function manageAutomatedProduction() {
    logFunctionStart('manageAutomatedProduction');
    if (!player || !player.productionUnits || player.productionUnits.length === 0) {
        logFunctionEnd('manageAutomatedProduction');
        return;
    }

    player.productionUnits.forEach(unit => {
        const recipe = unit.productionRecipe;
        const inputProduct = gameProducts.find(p => p.name === recipe.input.productName);
        const outputProduct = gameProducts.find(p => p.name === recipe.output.productName);
        const targetWarehouse = player.warehouses.find(wh => wh.id === unit.targetWarehouseId) || player.getPrimaryWarehouse();

        if (!targetWarehouse) {
            console.error(`Production unit ${unit.name} has no valid target warehouse.`);
            return; 
        }

        if (unit.status === 'idle') {
            if (player.hasEnoughProduct(recipe.input.productName, recipe.input.quantity, targetWarehouse.id)) {
                if (player.removeProductFromWarehouse(recipe.input.productName, recipe.input.quantity, targetWarehouse.id)) {
                    unit.status = 'producing';
                    unit.productionProgress = recipe.turnsToProduce;
                    showNotification(`${unit.name} started producing ${recipe.output.quantity} ${recipe.output.productName}.`, 'info');
                    console.log(`${unit.name} (ID: ${unit.instanceId}) automatically started. Input: ${recipe.input.quantity} ${recipe.input.productName} from ${targetWarehouse.name}.`);
                } else {
                     console.log(`${unit.name} (ID: ${unit.instanceId}) could not remove materials from ${targetWarehouse.name} despite hasEnoughProduct check.`);
                }
            } 
        } else if (unit.status === 'producing') {
            unit.productionProgress--;
            if (unit.productionProgress <= 0) {
                unit.status = 'completed';
                showNotification(`${unit.name} finished producing ${recipe.output.quantity} ${recipe.output.productName}. Output ready to transfer.`, 'success');
                console.log(`${unit.name} (ID: ${unit.instanceId}) finished production. Output: ${recipe.output.quantity} ${recipe.output.productName}.`);
            }
        } else if (unit.status === 'completed') {
            if (player.addProductToWarehouse(outputProduct, recipe.output.quantity, targetWarehouse.id)) {
                unit.status = 'idle'; 
                showNotification(`Transferred ${recipe.output.quantity} ${recipe.output.productName} from ${unit.name} to ${targetWarehouse.name}.`, 'success');
                console.log(`${unit.name} (ID: ${unit.instanceId}) transferred output to ${targetWarehouse.name}. Now idle.`);
            } else {
                showNotification(`Warehouse ${targetWarehouse.name} is full. Cannot transfer ${recipe.output.quantity} ${recipe.output.productName} from ${unit.name}.`, 'warning');
                console.log(`${unit.name} (ID: ${unit.instanceId}) output transfer failed, warehouse ${targetWarehouse.name} full.`);
            }
        }
    });
    logFunctionEnd('manageAutomatedProduction');
}

function npcCompaniesBuyFromSuppliers() {
    logFunctionStart('npcCompaniesBuyFromSuppliers');
    if (!npcCompanies || npcCompanies.length === 0 || !gameSuppliers || gameSuppliers.length === 0) {
        logFunctionEnd('npcCompaniesBuyFromSuppliers');
        return;
    }

    npcCompanies.forEach(company => {
        let productToBuyName = null;
        let targetStock = 0;

        if (company.strategy === 'RAW_MATERIAL_FOCUS') {
            if ((company.inventory['Wood'] || 0) < 100) { 
                productToBuyName = 'Wood';
                targetStock = 100;
            }
        } else if (company.strategy === 'FINISHED_GOODS_FOCUS') {
             if ((company.inventory['Wooden Chair'] || 0) < 50) { 
                productToBuyName = 'Wooden Chair';
                targetStock = 50;
            }
        } else if (company.strategy === 'GENERAL_TRADER' || company.strategy === 'BALANCED_OPERATOR') {
            const randomIndex = Math.floor(Math.random() * gameProducts.length);
            const randomProduct = gameProducts[randomIndex];
            if ((company.inventory[randomProduct.name] || 0) < 50) {
                productToBuyName = randomProduct.name;
                targetStock = 50;
            }
        }
        
        if (productToBuyName) {
            const productDefinition = gameProducts.find(p => p.name === productToBuyName);
            if (!productDefinition) return; 

            let bestSupplier = null;
            let minPrice = Infinity;

            gameSuppliers.forEach(supplier => {
                const item = supplier.inventory.find(invItem => invItem.product.name === productToBuyName && invItem.quantity > 0);
                if (item && item.price < minPrice) {
                    minPrice = item.price;
                    bestSupplier = supplier;
                }
            });

            if (bestSupplier) {
                const supplierItem = bestSupplier.inventory.find(invItem => invItem.product.name === productToBuyName);
                const currentStock = company.inventory[productToBuyName] || 0;
                let quantityToBuy = Math.floor(Math.random() * 51) + 20; 
                quantityToBuy = Math.min(quantityToBuy, targetStock - currentStock); 
                quantityToBuy = Math.min(quantityToBuy, supplierItem.quantity); 

                const cost = quantityToBuy * supplierItem.price;

                if (quantityToBuy > 0 && company.canAfford(cost)) {
                    if (bestSupplier.sellToNPC(productToBuyName, quantityToBuy)) {
                        company.money -= cost;
                        company.updateInventory(productToBuyName, quantityToBuy);
                        company.lastActivity = `Bought ${quantityToBuy} ${productToBuyName} from ${bestSupplier.name}.`;
                        console.log(`${company.name} bought ${quantityToBuy} of ${productToBuyName} from ${bestSupplier.name} for $${cost.toFixed(2)}.`);
                    }
                }
            }
        }
    });
    logFunctionEnd('npcCompaniesBuyFromSuppliers');
}

function npcCompaniesSellToWholesalers() {
    logFunctionStart('npcCompaniesSellToWholesalers');
    if (!npcCompanies || npcCompanies.length === 0 || !gameWholesalers || gameWholesalers.length === 0) {
        logFunctionEnd('npcCompaniesSellToWholesalers');
        return;
    }

    npcCompanies.forEach(company => {
        for (const productNameInInventory in company.inventory) {
            if (!company.inventory.hasOwnProperty(productNameInInventory)) continue;

            const productInStock = company.inventory[productNameInInventory];
            if (productInStock <= 0) continue;

            let shouldSell = false;
            if (company.strategy === 'FINISHED_GOODS_FOCUS' && productNameInInventory === 'Wooden Chair') {
                shouldSell = true;
            } else if (company.strategy === 'RAW_MATERIAL_FOCUS' && productNameInInventory === 'Wood') {
                if (productInStock > 150) shouldSell = true;
            } else if (company.strategy === 'GENERAL_TRADER' || company.strategy === 'BALANCED_OPERATOR') {
                shouldSell = true; 
            }
            
            if (shouldSell) {
                let bestWholesaler = null;
                let maxPrice = 0;

                gameWholesalers.forEach(wholesaler => {
                    const demandItem = wholesaler.demand.find(d => d.product.name === productNameInInventory && d.quantity > 0);
                    if (demandItem && demandItem.price > maxPrice) {
                        maxPrice = demandItem.price;
                        bestWholesaler = wholesaler;
                    }
                });

                if (bestWholesaler) {
                    const demandItem = bestWholesaler.demand.find(d => d.product.name === productNameInInventory);
                    let quantityToSell = Math.floor(Math.random() * 21) + 10; 
                    quantityToSell = Math.min(quantityToSell, productInStock);
                    quantityToSell = Math.min(quantityToSell, demandItem.quantity);

                    const revenue = quantityToSell * demandItem.price;

                    if (quantityToSell > 0) {
                        if (bestWholesaler.buyFromNPC(productNameInInventory, quantityToSell)) {
                            company.money += revenue;
                            company.updateInventory(productNameInInventory, -quantityToSell); 
                            company.lastActivity = `Sold ${quantityToSell} ${productNameInInventory} to ${bestWholesaler.name}.`;
                            console.log(`${company.name} sold ${quantityToSell} of ${productNameInInventory} to ${bestWholesaler.name} for $${revenue.toFixed(2)}.`);
                        }
                    }
                }
            }
        }
    });
    logFunctionEnd('npcCompaniesSellToWholesalers');
}


function advanceTurn() {
    logFunctionStart('advanceTurn');

    if (!player) {
        showNotification("Player data is not initialized. Please reload the game.", "error");
        console.error("CRITICAL: Player object is not initialized in advanceTurn. Game cannot proceed.");
        logFunctionEnd('advanceTurn');
        return; 
    }
    
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
    
    npcCompanies.forEach(company => company.lastActivity = "Observing market fluctuations..."); // Reset activity
    npcCompanies.forEach(company => company.generateBuyOfferForPlayer(gameProducts)); 
    npcCompaniesBuyFromSuppliers(); 
    npcCompaniesSellToWholesalers(); 

    player.acceptedContracts.forEach(contract => {
        if (contract.status === 'active' && currentTurn > contract.deadlineTurns) {
            contract.status = 'expired';
            showNotification(`Contract for ${contract.productName} from ${contract.issuerNPC} has expired!`, 'error');
        }
    });
    player.acceptedContracts = player.acceptedContracts.filter(c => c.status !== 'expired' && c.status !== 'fulfilled');
    
    manageAutomatedProduction(); 

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
                }
            }
        });
        if (salesSummary.length > 0) {
            showNotification(`Your store sold: ${salesSummary.join(', ')}. Total: $${totalRetailSalesThisTurn.toFixed(2)}.`, 'success');
        } 
    }
    
    if (player.recurringSupplyContracts) {
        player.recurringSupplyContracts.forEach(recContract => {
            if (recContract.status === 'active' && recContract.turnsRemaining > 0) {
                const cost = recContract.quantityPerTurn * recContract.pricePerUnit;
                const primaryWarehouse = player.getPrimaryWarehouse();
                const productForContract = gameProducts.find(p => p.name === recContract.productName);

                if (!productForContract) {
                    console.error(`Product ${recContract.productName} for recurring contract not found in gameProducts.`);
                    recContract.status = 'cancelled';
                    showNotification(`Recurring contract for ${recContract.productName} cancelled due to product definition error.`, "error");
                    return;
                }

                if (player.money >= cost) {
                    if (primaryWarehouse.addProduct(productForContract, recContract.quantityPerTurn)) {
                        player.money -= cost;
                        player.lastTurnExpenses += cost;
                        recContract.turnsRemaining--;
                        showNotification(`Recurring delivery of ${recContract.quantityPerTurn} ${recContract.productName} from ${recContract.supplierName} received. Cost: $${cost.toFixed(2)}. ${recContract.turnsRemaining} turns remaining.`, "info");
                        if (recContract.turnsRemaining === 0) {
                            recContract.status = 'completed';
                            showNotification(`Recurring contract for ${recContract.productName} from ${recContract.supplierName} completed.`, "success");
                        }
                    } else {
                        showNotification(`Warehouse full! Delivery of ${recContract.quantityPerTurn} ${recContract.productName} from ${recContract.supplierName} failed. Contract active, will retry.`, "warning");
                    }
                } else {
                    recContract.status = 'cancelled'; 
                    showNotification(`Recurring contract for ${recContract.productName} from ${recContract.supplierName} cancelled due to insufficient funds.`, "error");
                }
            }
        });
         player.recurringSupplyContracts = player.recurringSupplyContracts.filter(rc => rc.status === 'active' || rc.status === 'paused'); 
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

function runTestSuite() {
    console.log('\\n--- runTestSuite ---');
    console.log('\\n--- AFTER STEP 1: Initial Game State ---');
    if (!player) {
        console.error("TEST SUITE ERROR: Player not initialized. initializeGame() might not have run or completed correctly.");
        return;
    }
    console.log('Initial Player Money:', player.money);
    console.log('Initial currentTurn state:', currentTurn); 
    console.log('Number of Products:', gameProducts.length);
    console.log('Number of Suppliers:', gameSuppliers.length);
    console.log('Number of Wholesalers:', gameWholesalers.length);
    console.log('Initial marketContracts:', marketContracts.length, JSON.stringify(marketContracts.map(c=>({p:c.productName, q:c.quantity, id:c.id.substring(0,5)}))));
    console.log('NPC Companies Initialized:', JSON.stringify(npcCompanies.map(c => ({name: c.name, money: c.money, strategy: c.strategy, inventory: c.inventory}))));


    console.log('\\n--- STEP 2: Advance Turns (1-3) ---');
    for (let i = 1; i <= 3; i++) {
        console.log(`\\nAdvancing to Turn (was ${currentTurn})...`);
        advanceTurn(); 
        console.log('Current Turn:', currentTurn);
        console.log('Player Money after turn:', player.money.toFixed(2));
        console.log('Player Last Turn Income:', player.lastTurnIncome.toFixed(2));
        console.log('Player Last Turn Expenses:', player.lastTurnExpenses.toFixed(2));
        npcCompanies.forEach(npc => {
            console.log(`NPC ${npc.name} Money: ${npc.money.toFixed(2)}, Inventory: ${JSON.stringify(npc.inventory)}, LastActivity: ${npc.lastActivity}`);
        });
    }

    console.log('\\n--- STEP 3: Player Buys Product ---');
    if (gameSuppliers.length > 0 && gameSuppliers[0].inventory.length > 0) {
        const supplierIndex = 0;
        const productIndex = 0;
        const quantityToBuy = 5;
        if (gameSuppliers[supplierIndex].inventory[productIndex] && gameSuppliers[supplierIndex].inventory[productIndex].product) {
            const productToBuy = gameSuppliers[supplierIndex].inventory[productIndex].product.name;
            const supplierName = gameSuppliers[supplierIndex].name;
            console.log('Player Money Before Buy:', player.money.toFixed(2));
            console.log('Player Inventory Before Buy (Primary Warehouse):', JSON.stringify(player.getPrimaryWarehouse().inventory.map(item => ({ name: item.product.name, qty: item.quantity }))));
            console.log(`Attempting to buy ${quantityToBuy} of ${productToBuy} from ${supplierName}`);
            buyFromSupplier(supplierIndex, productIndex, quantityToBuy.toString());
            console.log('Player Money After Buy:', player.money.toFixed(2));
            console.log('Player Inventory After Buy (Primary Warehouse):', JSON.stringify(player.getPrimaryWarehouse().inventory.map(item => ({ name: item.product.name, qty: item.quantity }))));
        } else {
            console.log('Skipping buy product: Target product at supplier[0].inventory[0] is not defined.');
        }
    } else {
        console.log('Skipping buy product: No suppliers or supplier inventory.');
    }

    console.log('\\n--- STEP 4: Player Accepts Contract ---');
    const pendingContractsForTest = marketContracts.filter(c => c.status === 'pending');
    if (pendingContractsForTest.length > 0) {
        const pendingContractId = pendingContractsForTest[0].id;
        const contractDetails = pendingContractsForTest[0];
        console.log(`Market Contracts Before Accept (${marketContracts.length}):`, JSON.stringify(marketContracts.map(c=>({p:c.productName,s:c.status,id:c.id.substring(0,5)}))));
        console.log(`Player Accepted Contracts Before (${player.acceptedContracts.length}):`, JSON.stringify(player.acceptedContracts.map(c=>({p:c.productName,s:c.status,id:c.id.substring(0,5)}))));
        console.log(`Attempting to accept contract ID: ${pendingContractId} (Product: ${contractDetails.productName}, Qty: ${contractDetails.quantity})`);
        acceptContract(pendingContractId);
        console.log(`Market Contracts After Accept (${marketContracts.length}):`, JSON.stringify(marketContracts.map(c=>({p:c.productName,s:c.status,id:c.id.substring(0,5)}))));
        console.log(`Player Accepted Contracts After (${player.acceptedContracts.length}):`, JSON.stringify(player.acceptedContracts.map(c=>({p:c.productName,s:c.status,id:c.id.substring(0,5)}))));
    } else {
        console.log('Skipping accept contract: No pending market contracts available.');
    }

    console.log('\\n--- STEP 5: Player Opens Retail Store ---');
    console.log('Player Money Before Opening Store:', player.money.toFixed(2));
    console.log('Player Retail Store Before:', player.retailStore);
    openRetailStore();
    console.log('Player Money After Opening Store:', player.money.toFixed(2));
    console.log('Player Retail Store After:', player.retailStore ? { name: player.retailStore.name, cash: player.retailStore.cashRegister, stockCount: player.retailStore.stock.length } : null);

    console.log('\\n--- STEP 6: Player Stocks Retail Store ---');
    if (player.retailStore && gameProducts.length > 0) {
        const productToStockDetails = gameProducts.find(p => p.name === 'Apples'); 
        if (productToStockDetails) {
          const productToStockName = productToStockDetails.name;
          const quantityToStock = 3;
          const currentQtyInWarehouse = player.getPrimaryWarehouse().getProductQuantity(productToStockName);
          if (currentQtyInWarehouse < quantityToStock) {
             console.log(`Manually adding ${quantityToStock - currentQtyInWarehouse} of ${productToStockName} to player warehouse for testing stock function.`);
             player.addProductToWarehouse(productToStockDetails, quantityToStock - currentQtyInWarehouse);
          }
          console.log('Player Warehouse Before Stocking Store:', JSON.stringify(player.getPrimaryWarehouse().inventory.map(item => ({ name: item.product.name, qty: item.quantity }))));
          const storeItemBefore = player.retailStore.stock.find(item => item.product.name === productToStockName);
          console.log('Retail Store Stock Before (${productToStockName}):', storeItemBefore ? storeItemBefore.quantity : 'N/A');
          console.log(`Attempting to stock ${quantityToStock} of ${productToStockName}`);
          addStockToRetail(productToStockName, quantityToStock.toString());
          console.log('Player Warehouse After Stocking Store:', JSON.stringify(player.getPrimaryWarehouse().inventory.map(item => ({ name: item.product.name, qty: item.quantity }))));
          const storeItemAfter = player.retailStore.stock.find(item => item.product.name === productToStockName);
          console.log('Retail Store Stock After (${productToStockName}):', storeItemAfter ? storeItemAfter.quantity : 'N/A');
          
          console.log(`Setting ${productToStockName} for sale in retail store.`);
          toggleForSale(productToStockName);
          const appleStoreItem = player.retailStore.stock.find(item => item.product.name === productToStockName);
          console.log(`Apples forSale status: ${appleStoreItem ? appleStoreItem.forSale : 'Not found'}`);

        } else { console.log("Product 'Apples' not found for stocking test."); }
    } else {
        console.log('Skipping stock retail store: No retail store or no game products.');
    }

    console.log('\\n--- STEP 7: Advance Turns (4-6) ---');
    for (let i = 1; i <= 3; i++) {
        console.log(`\\nAdvancing to Turn (was ${currentTurn})...`);
        advanceTurn();
        console.log('Current Turn:', currentTurn);
        console.log('Player Money after turn:', player.money.toFixed(2));
        console.log('Player Last Turn Income:', player.lastTurnIncome.toFixed(2));
        console.log('Player Last Turn Expenses:', player.lastTurnExpenses.toFixed(2));
        if(player.retailStore) {
            console.log('Retail Store Cash Register:', player.retailStore.cashRegister.toFixed(2));
            player.retailStore.stock.forEach(item => {
                if (item.forSale && item.quantity > 0) console.log(`Store stock for sale: ${item.product.name}, Qty: ${item.quantity}, Price: ${item.price}`);
            });
        }
        if(player.productionUnits.length > 0) {
          player.productionUnits.forEach(unit => {
            console.log(`Production Unit ${unit.name} (ID: ${unit.instanceId}): Status: ${unit.status}, Progress: ${unit.productionProgress}, Output Qty: ${unit.outputInventory.quantity}`);
          });
        }
         npcCompanies.forEach(npc => {
            console.log(`NPC ${npc.name} Money: ${npc.money.toFixed(2)}, Inventory: ${JSON.stringify(npc.inventory)}, LastActivity: ${npc.lastActivity}`);
        });
    }
    console.log('\\n--- Test Sequence Complete ---');
}

runTestSuite(); 
console.log('--- Script and Test Suite End ---');

[end of script.js]
