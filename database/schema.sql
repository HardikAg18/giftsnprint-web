-- =============================================
-- GiftsNPrint Database Schema
-- Run this in your Hostinger MySQL database
-- =============================================

CREATE DATABASE IF NOT EXISTS giftsnprint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE giftsnprint_db;

-- Admin Users
CREATE TABLE admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url VARCHAR(255),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    short_description TEXT,
    description LONGTEXT,
    base_price DECIMAL(10,2) NOT NULL,
    min_order_qty INT DEFAULT 1,
    image_url VARCHAR(255),
    gallery_images JSON,
    tags VARCHAR(500),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Quantity-Based Pricing Tiers
CREATE TABLE pricing_tiers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    min_qty INT NOT NULL,
    max_qty INT,
    price_per_unit DECIMAL(10,2) NOT NULL,
    label VARCHAR(50),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Customers
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    company VARCHAR(200),
    gst_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    customer_type ENUM('b2c', 'b2b', 'corporate') DEFAULT 'b2c',
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    customer_company VARCHAR(200),
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    items JSON NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('razorpay', 'bank_transfer', 'cash') DEFAULT 'razorpay',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    order_status ENUM('pending', 'confirmed', 'processing', 'printing', 'quality_check', 'dispatched', 'delivered', 'cancelled') DEFAULT 'pending',
    design_files JSON,
    special_instructions TEXT,
    estimated_delivery DATE,
    tracking_info VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Reviews
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    order_id INT,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT NOT NULL,
    images JSON,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Contact Enquiries
CREATE TABLE enquiries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    company VARCHAR(200),
    enquiry_type ENUM('general', 'quote', 'bulk_order', 'corporate', 'complaint', 'other') DEFAULT 'general',
    subject VARCHAR(200),
    message TEXT NOT NULL,
    product_id INT,
    quantity INT,
    budget_range VARCHAR(50),
    attachment_url VARCHAR(255),
    status ENUM('new', 'in_progress', 'resolved', 'closed') DEFAULT 'new',
    assigned_to INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Blog Posts
CREATE TABLE blog_posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    excerpt TEXT,
    content LONGTEXT NOT NULL,
    featured_image VARCHAR(255),
    category VARCHAR(100),
    tags VARCHAR(500),
    author VARCHAR(100) DEFAULT 'GiftsNPrint Team',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    views INT DEFAULT 0,
    meta_title VARCHAR(300),
    meta_description TEXT,
    published_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Newsletter Subscribers
CREATE TABLE newsletter_subscribers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupons
CREATE TABLE coupons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200),
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    valid_from DATE,
    valid_till DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Insert Default Data
-- =============================================

-- Default Admin (password: GiftsNPrint@Admin123)
INSERT INTO admin_users (username, email, password, role) VALUES
('admin', 'admin@giftsnprint.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'super_admin');
-- Default password: GiftsNPrint@Admin123 — CHANGE THIS IMMEDIATELY after first login!

-- Default Categories
INSERT INTO categories (name, slug, description, icon, image_url, sort_order) VALUES
('Printing Services', 'printing-services', 'Flex banners, vinyl, roll-up standees, hoardings and more', 'fa-print', '/images/category_printing.png', 1),
('Awards & Trophies', 'awards-trophies', 'Corporate awards, school trophies, acrylic mementos, wooden plaques', 'fa-trophy', '/images/category_awards.png', 2),
('Promotional Gifts', 'promotional-gifts', 'Customized mugs, t-shirts, caps, pens, diaries, keychains', 'fa-gift', '/images/category_promotional.png', 3),
('Advanced Printing', 'advanced-printing', 'UV printing, laser cutting, digital printing on acrylic, wood, glass', 'fa-microchip', '/images/category_advanced.png', 4),
('Custom Gifts', 'custom-gifts', 'Photo frames, nameplates, wedding gifts, event-based products', 'fa-heart', '/images/category_custom.png', 5);

-- Sample Products (Printing Services)
INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, is_featured) VALUES
(1, 'Flex Banner Printing', 'flex-banner-printing', 'High-quality outdoor flex banners for shops, events and advertising', 'Premium quality flex banners printed with UV-resistant inks. Perfect for shops, events, exhibitions, and outdoor advertising. Available in all sizes with grommets and hemming.', 15.00, 1, TRUE),
(1, 'Vinyl Sticker Printing', 'vinyl-sticker-printing', 'Durable vinyl stickers for shops, vehicles and branding', 'High-quality vinyl stickers with strong adhesive. Waterproof and UV resistant. Ideal for shop branding, vehicle graphics, product labels.', 8.00, 10, FALSE),
(1, 'Roll-Up Standee', 'roll-up-standee', 'Premium roll-up display standees for events and exhibitions', 'Premium aluminum frame roll-up standees with high-quality print. Easy to carry and setup. Perfect for exhibitions, offices, events.', 1200.00, 1, TRUE),
(1, 'Shop Branding Package', 'shop-branding-package', 'Complete shop branding solution with banners, signs and graphics', 'Complete shop branding package including flex banners, vinyl graphics, name boards, and promotional materials. Custom designed for your brand.', 5000.00, 1, FALSE),
(1, 'Office Wall Graphics', 'office-wall-graphics', 'Custom wall graphics and murals for corporate offices', 'Transform your office walls with custom graphics, motivational quotes, brand elements and company information. High quality print with easy application.', 250.00, 1, FALSE);

INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, is_featured) VALUES
(2, 'Corporate Trophy', 'corporate-trophy', 'Premium crystal and acrylic corporate trophies for awards and recognition', 'Elegant corporate trophies crafted from premium crystal and acrylic. Custom engraving available. Perfect for employee recognition, corporate events.', 450.00, 1, TRUE),
(2, 'School Achievement Trophy', 'school-achievement-trophy', 'Quality trophies for school and college competitions', 'High-quality trophies for schools and colleges. Available in multiple sizes and designs. Custom engraving for student names and achievements.', 180.00, 5, FALSE),
(2, 'Sports Trophy', 'sports-trophy', 'Dynamic sports trophies for tournaments and competitions', 'Eye-catching sports trophies for cricket, football, chess and all sports. Available in multiple designs with custom engraving.', 220.00, 3, TRUE),
(2, 'Acrylic Memento', 'acrylic-memento', 'Premium acrylic mementos for corporate gifts and events', 'Premium grade acrylic mementos with UV printing. Elegant, modern look. Perfect for corporate gifting, conferences, farewell events.', 350.00, 5, FALSE),
(2, 'Wooden Plaque', 'wooden-plaque', 'Elegant wooden plaques with laser engraving', 'Premium teakwood plaques with laser engraving. Classic and professional look. Perfect for appreciation certificates, retirement gifts.', 400.00, 1, FALSE);

INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, is_featured) VALUES
(3, 'Custom Printed Mug', 'custom-printed-mug', 'High quality ceramic mugs with custom prints for gifting and promotions', 'Premium ceramic mugs with vibrant photo/logo printing. Microwave and dishwasher safe. Perfect for corporate gifts, birthdays, promotions.', 180.00, 12, TRUE),
(3, 'Printed T-Shirts', 'printed-t-shirts', 'Custom printed t-shirts for events, teams and corporate gifting', 'Premium cotton t-shirts with DTG or screen printing. Full color printing available. Perfect for events, teams, corporate wear.', 299.00, 10, TRUE),
(3, 'Printed Caps', 'printed-caps', 'Custom caps with embroidery or print for teams and promotions', 'Quality caps with custom embroidery or printing. Available in multiple styles and colors. Great for teams, events, promotions.', 199.00, 12, FALSE),
(3, 'Gift Hamper', 'gift-hamper', 'Curated corporate gift hampers with custom branding', 'Premium gift hampers with customized products. Can include mugs, diaries, pens, chocolates and more. Perfect for corporate gifting.', 850.00, 5, FALSE),
(3, 'Pens & Stationery Set', 'pens-stationery-set', 'Branded pens, diaries and stationery for corporate gifting', 'Customized pens, diaries, notebooks and stationery with your logo. Professional and practical gifts for clients and employees.', 120.00, 50, FALSE);

INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, is_featured) VALUES
(4, 'UV Printing on Acrylic', 'uv-printing-acrylic', 'Premium UV printing on acrylic sheets for luxury branding', 'State-of-the-art UV printing on premium acrylic sheets. Vibrant colors, photo-quality output. Perfect for luxury displays, awards, branding.', 500.00, 1, TRUE),
(4, 'Laser Cutting & Engraving', 'laser-cutting-engraving', 'Precision laser cutting and engraving on wood, acrylic and metal', 'High-precision laser cutting and engraving on various materials. Perfect for decorative pieces, nameplates, custom shapes.', 300.00, 1, FALSE),
(4, 'Digital Printing Services', 'digital-printing-services', 'High resolution digital printing for all your needs', 'Professional digital printing with latest technology. High resolution output on multiple substrates. Fast turnaround time.', 25.00, 10, FALSE);

INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, is_featured) VALUES
(5, 'Custom Photo Frame', 'custom-photo-frame', 'Personalized photo frames for memories and gifting', 'Beautiful custom photo frames with personalized messages. Available in wood, acrylic and metal. Perfect for birthdays, anniversaries, weddings.', 350.00, 1, TRUE),
(5, 'Name Plate', 'name-plate', 'Premium acrylic and metal name plates for offices and homes', 'Elegant name plates for offices and homes. Available in acrylic, metal and wood. Custom engraving and UV printing.', 250.00, 1, FALSE),
(5, 'Wedding Return Gift', 'wedding-return-gift', 'Elegant customized return gifts for weddings and functions', 'Beautiful customized return gifts for weddings. Can include photo frames, customized items, gift hampers. Bulk pricing available.', 150.00, 50, TRUE),
(5, 'Keychain Set', 'keychain-set', 'Custom printed and engraved keychains for promotions and gifts', 'Customized keychains in metal, acrylic and rubber. Photo printing and engraving available. Great for promotions, events.', 45.00, 50, FALSE);

-- Pricing Tiers for Flex Banner
INSERT INTO pricing_tiers (product_id, min_qty, max_qty, price_per_unit, label) VALUES
(1, 1, 5, 18.00, '1-5 sq.ft'),
(1, 6, 20, 15.00, '6-20 sq.ft'),
(1, 21, 50, 13.00, '21-50 sq.ft'),
(1, 51, NULL, 11.00, '51+ sq.ft');

-- Pricing Tiers for Mug
INSERT INTO pricing_tiers (product_id, min_qty, max_qty, price_per_unit, label) VALUES
(11, 12, 24, 180.00, '12-24 pcs'),
(11, 25, 50, 160.00, '25-50 pcs'),
(11, 51, 100, 140.00, '51-100 pcs'),
(11, 101, NULL, 120.00, '100+ pcs');

-- Pricing Tiers for T-Shirts
INSERT INTO pricing_tiers (product_id, min_qty, max_qty, price_per_unit, label) VALUES
(12, 10, 25, 299.00, '10-25 pcs'),
(12, 26, 50, 270.00, '26-50 pcs'),
(12, 51, 100, 240.00, '51-100 pcs'),
(12, 101, NULL, 220.00, '100+ pcs');

-- Sample Reviews
INSERT INTO reviews (product_id, customer_name, customer_email, rating, title, review_text, is_approved, is_featured, is_verified) VALUES
(1, 'Rajesh Sharma', 'rajesh@example.com', 5, 'Excellent Quality!', 'The flex banners were printed with amazing quality. Colors are vibrant and durable. Will definitely order again for our next event!', TRUE, TRUE, TRUE),
(11, 'Priya Mehta', 'priya@example.com', 5, 'Perfect Corporate Gifts', 'Ordered 100 mugs for our company anniversary. The print quality was superb and delivery was on time. Highly recommended!', TRUE, TRUE, TRUE),
(6, 'Ankit Patel', 'ankit@example.com', 5, 'Beautiful Trophies', 'Ordered trophies for our annual awards ceremony. The quality was outstanding and the engraving was precise. Very happy!', TRUE, FALSE, TRUE),
(12, 'Sneha Kumar', 'sneha@example.com', 4, 'Great T-Shirts', 'T-shirts for our college fest were printed perfectly. Quality fabric and print. The team delivered on time despite last minute order!', TRUE, FALSE, TRUE),
(3, 'Vikas Singh', 'vikas@example.com', 5, 'Perfect for Exhibition', 'The roll-up standees are of premium quality. Setup is very easy and the print quality is excellent. Perfect for our trade show!', TRUE, TRUE, TRUE);
