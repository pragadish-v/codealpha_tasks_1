const Order = require('../models/Order');
const Product = require('../models/Product');

exports.createOrder = async (req, res, next) => {
    try {
        const { products, shippingAddress } = req.body;
        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, error: 'Cannot process empty array transaction' });
        }

        let calculatedTotal = 0;
        const processedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ success: false, error: `Product target ${item.product} missing` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, error: `Luxury item ${product.name} allocation limits reached` });
            }

            product.stock -= item.quantity;
            await product.save();

            calculatedTotal += product.price * item.quantity;
            processedProducts.push({
                product: product._id,
                quantity: item.quantity
            });
        }

        const order = await Order.create({
            user: req.user.id,
            products: processedProducts,
            totalPrice: calculatedTotal,
            shippingAddress
        });

        res.status(201).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};

exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user.id }).populate('products.product').sort('-createdAt');
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        next(err);
    }
};