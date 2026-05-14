function groupBy(array, keyFn) {
    return array.reduce((result, item) => {
        const key = keyFn(item)
        return { ...result, [key]: item }
    }, {})
}

/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { sale_price, quantity } = purchase
    const discount = 1 - (purchase.discount / 100);
    return sale_price * quantity * discount
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчёт бонуса от позиции в рейтинге
    if (index === 0) {
        return seller.profit * 15 / 100;
    } else if (index === 2 || index === 1) {
        return seller.profit * 10 / 100;
    } else if (index === total) {
        return 0;
    } else { // Для всех остальных
        return seller.profit * 5 / 100;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (data.sellers.length === 0 
        || data.customers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    const isOptionsObject = typeof options === "object";

    if (!isOptionsObject) {
        throw new Error('options не является объектом');
    }

    const { calculateRevenue, calculateBonus } = options;

    const isCalculateRevenueFunction = typeof calculateRevenue === 'function';
    const isCalculateBonusFunction = typeof calculateBonus === 'function';

    if (!isCalculateRevenueFunction || !isCalculateBonusFunction) {
        throw new Error('Переданные опции не являются функциями');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = groupBy(sellerStats, seller => seller.id)
    const productIndex = groupBy(data.products, prod => prod.sku)

    // @TODO: Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        seller.sales_count++
        seller.revenue += record.total_amount

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateSimpleRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku]++
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => a.profit > b.profit ? -1 : a.profit < b.profit ? 1 : 0)

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length - 1, seller)
        seller.top_products = Object.entries(seller.products_sold)
            .map((prod) => ({ sku: prod[0], quantity: prod[1] }))
            .sort((a, b) => a.quantity > b.quantity ? -1 : a.quantity < b.quantity ? 1 : 0)
            .slice(0, 10)
    })

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}