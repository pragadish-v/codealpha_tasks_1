const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter product name'],
        trim: true,
        unique: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['smartphones', 'laptops', 'accessories']
    },
    price: {
        type: Number,
        required: [true, 'Please enter product price'],
        min: [0, 'Price must be positive']
    },
    description: {
        type: String,
        required: [true, 'Please enter product description']
    },
    images: {
        type: [String],
        default: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e']
    },
    stock: {
        type: Number,
        required: [true, 'Please enter stock volume'],
        min: [0, 'Stock cannot be negative'],
        default: 10
    },
    rating: {
        type: Number,
        default: 5.0
    },
    featured: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);