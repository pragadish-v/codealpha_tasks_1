const User = require('../models/User');
const jwt = require('jsonwebtoken');

const getSignedToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = getSignedToken(user);
    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            wishlist: user.wishlist
        }
    });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User registration email already configured' });
        }
        const user = await User.create({ name, email, password });
        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please specify credentials' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid user transaction key' });
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Authentication failed' });
        }
        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const fieldsToUpdate = { name: req.body.name, email: req.body.email };
        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

exports.toggleWishlist = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const productId = req.body.productId;
        const index = user.wishlist.indexOf(productId);
        if (index > -1) {
            user.wishlist.splice(index, 1);
        } else {
            user.wishlist.push(productId);
        }
        await user.save();
        res.status(200).json({ success: true, wishlist: user.wishlist });
    } catch (err) {
        next(err);
    }
};


