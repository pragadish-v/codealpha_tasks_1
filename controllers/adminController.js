const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

exports.getAnalytics = async (req, res, next) => {
    try {
        const userCount = await User.countDocuments({ role: 'user' });
        const productCount = await Product.countDocuments();
        const orders = await Order.find();

        const totalRevenue = orders
            .filter(o => o.status !== 'Cancelled')
            .reduce((acc, order) => acc + order.totalPrice, 0);

        res.status(200).json({
            success: true,
            data: {
                users: userCount,
                products: productCount,
                orders: orders.length,
                revenue: totalRevenue
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product profile target unavailable' });
        }
        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product inventory validation failure' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .populate('products.product')
            .sort('-createdAt');
        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        next(err);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};