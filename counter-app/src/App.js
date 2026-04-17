import React, { useState, useEffect } from 'react';

const API_URL = `http://${window.location.hostname}:8000`;

function App() {
    // Application Tabs matching your images
    const [activeTab, setActiveTab] = useState("Dashboard"); 
    
    // Data States
    const [products, setProducts] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const[customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    
    // Form States
    const [formData, setFormData] = useState({ name: "", sku: "", category: "", cost_price: "", selling_price: "", stock_level: "", low_stock_alert: "5" });
    const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "" });

    // POS States
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState("");

    // Fetch Functions
    const loadProducts = () => fetch('http://50.50.0.73:8000/products').then(res => res.json()).then(data => setProducts(data));
    const loadDashboard = () => fetch('http://50.50.0.73:8000/dashboard').then(res => res.json()).then(data => setDashboardStats(data));
    const loadCustomers = () => fetch('http://50.50.0.73:8000/customers').then(res => res.json()).then(data => setCustomers(data));
    const loadOrders = () => fetch('http://50.50.0.73:8000/orders').then(res => res.json()).then(data => setOrders(data));

    // Load data when tab changes
    useEffect(() => {
        loadSettings();
        if (activeTab === "Products" || activeTab === "POS/Billing" || activeTab === "Dashboard") loadProducts();
        if (activeTab === "Dashboard") loadDashboard();
        if (activeTab === "Customers" || activeTab === "POS/Billing") loadCustomers();
        if (activeTab === "Orders") loadOrders();
        if (activeTab === "Reports") loadReports();
    },[activeTab]);

    // --- CRUD FUNCTIONS ---
    const saveProduct = (e) => {
        e.preventDefault();
        fetch('http://50.50.0.73:8000/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm) })
        .then(() => { setCustomerForm({ name: "", phone: "", email: "" }); loadCustomers(); alert("Customer Saved!"); });
    };

    const saveCustomer = (e) => {
        e.preventDefault();
        fetch('http://50.50.0.73:8000/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ ...formData, cost_price: parseFloat(formData.cost_price), selling_price: parseFloat(formData.selling_price), stock_level: parseInt(formData.stock_level), low_stock_alert: parseInt(formData.low_stock_alert) })
        }).then(() => { setFormData({ name: "", sku: "", category: "", cost_price: "", selling_price: "", stock_level: "", low_stock_alert: "5" }); loadProducts(); });
    };

    const handleDelete = (id) => { if (window.confirm("Delete?")) fetch(`http://50.50.0.73:8000/products/${id}`, { method: 'DELETE' }).then(() => loadProducts()); };

    // --- POS FUNCTIONS ---
    const addToCart = (product) => {
        if (product.stock_level <= 0) return alert("Out of stock!");
        const existing = cart.find(i => i.product_id === product.id);
        if (existing) {
            if (existing.quantity >= product.stock_level) return alert("Stock limit reached!");
            setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else { setCart([...cart, { product_id: product.id, name: product.name, price: product.selling_price, quantity: 1, max: product.stock_level }]); }
    };
    const updateQty = (id, delta) => {
        setCart(cart.map(i => {
            if(i.product_id === id) {
                const newQ = i.quantity + delta;
                if(newQ > 0 && newQ <= i.max) return {...i, quantity: newQ};
            }
            return i;
        }));
    };
    const removeFromCart = (productId) => setCart(cart.filter(item => item.product_id !== productId));

    const handleCheckout = () => {
        if (cart.length === 0) return alert("Cart is empty!");
        const payload = { cart_items: cart, discount: parseFloat(discount) || 0, customer_id: selectedCustomer ? parseInt(selectedCustomer) : null };
        fetch('http://50.50.0.73:8000/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(res => res.json()).then(data => { alert("Bill Created! (Order ID: " + data.order_id + ")"); setCart([]); setDiscount(0); setSelectedCustomer(""); loadProducts(); });
    };

    // --- UI STYLES (To match your VIP images) ---
    const styles = {
        appContainer: { display: 'flex', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
        sidebar: { width: isSidebarOpen ? '260px' : '0px', backgroundColor: '#0B132B', color: '#8A94A6', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', overflow: 'hidden', flexShrink: 0 },
        logoArea: { padding: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1C253C', minWidth: '260px' },
        menuList: { padding: '15px 10px', flex: 1, overflowY: 'auto', minWidth: '240px' },
        menuItem: (isActive) => ({ padding: '12px 15px', margin: '5px 0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '15px', fontWeight: isActive ? 'bold' : 'normal', backgroundColor: isActive ? '#1D4ED8' : 'transparent', color: isActive ? 'white' : '#8A94A6', transition: 'all 0.2s' }),
        mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        topHeader: { backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' },
        contentArea: { padding: '30px', overflowY: 'auto', flex: 1 },
        card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
        th: { padding: '15px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6B7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
        td: { padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '14px' },
        input: { padding: '10px 15px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', width: '100%', boxSizing: 'border-box' },
        btnPrimary: { backgroundColor: '#1D4ED8', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
    };

    const tabs = [
        { name: "Dashboard", icon: "📊" },
        { name: "POS/Billing", icon: "🛒" },
        { name: "Products", icon: "📦" },
        { name: "Customers", icon: "👥" },
        { name: "Orders", icon: "📜" },
        { name: "Reports", icon: "📈" },
        { name: "Settings", icon: "⚙️" }
    ];

    return (
        <div style={styles.appContainer}>
            
            {/* 🖨️ PERFECT THERMAL PRINT CSS (80MM SIZE FOR PRINTER) */}
            <style>{`
                @media print {
                    /* Yeh browser ko batata hai ke page thermal size ka hai (80mm) aur margin 0 rakhna hai */
                    @page { margin: 0; size: 80mm auto; }
                    
                    /* Background aur baki sab hata do */
                    body { margin: 0; padding: 0; background-color: white; }
                    body * { visibility: hidden; }
                    
                    /* Sirf Slip ko dikhao */
                    #printable-slip, #printable-slip * { visibility: visible; }
                    
                    /* Slip ko 80mm set karo */
                    #printable-slip { 
                        position: absolute; 
                        left: 0; top: 0; 
                        width: 78mm; /* Thoda sa margin taake text na katey */
                        margin: 0 auto; 
                        padding: 5mm; 
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* --- SIDEBAR --- */}
            <div style={styles.sidebar} className="no-print">
                <div style={styles.logoArea}>
                    {/* Yahan bhi wo logo dikhayenge jo settings mein save hai! */}
                    {settings.logo ? 
                        <img src={settings.logo} alt="Logo" style={{width: '35px', height: '35px', borderRadius: '8px', objectFit: 'cover'}} /> 
                        : 
                        <div style={{ backgroundColor: '#1D4ED8', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>🛒</div>
                    }
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Teknivos POS</h3>
                        <span style={{ fontSize: '11px', color: '#8A94A6' }}>Powered by {settings.business_name}</span>
                    </div>
                </div>
                <div style={styles.menuList}>
                    {tabs.map(tab => (
                        <div key={tab.name} onClick={() => setActiveTab(tab.name)} style={styles.menuItem(activeTab === tab.name)}>
                            <span>{tab.icon}</span> {tab.name}
                        </div>
                    ))}
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #1C253C', minWidth: '260px' }}>
                    <p style={{ margin: 0, color: 'white', fontSize: '14px' }}>Administrator</p>
                    <p style={{ margin: 0, fontSize: '12px' }}>Admin</p>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div style={styles.mainContent} className="no-print">
                
                {/* Header Area */}
                <div style={styles.topHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#374151' }}>☰</button>
                        <div>
                            <h2 style={{ margin: 0, color: '#111827' }}>{activeTab}</h2>
                            <p style={{ margin: '5px 0 0 0', color: '#6B7280', fontSize: '14px' }}>{new Date().toDateString()}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
                        <strong>Powered by Teknivos</strong><br/>
                        Custom POS & Business Software
                    </div>
                </div>

                {/* View Area */}
                <div style={styles.contentArea}>

                    {/* ========================================== */}
                    {/* 1. DASHBOARD SCREEN                        */}
                    {/* ========================================== */}
                    {activeTab === "Dashboard" && dashboardStats && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                                <div style={styles.card}><p style={{ color: '#6B7280', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>TODAY SALES</p><h2 style={{ margin: 0 }}>{settings.currency_symbol}{dashboardStats.today_sales.toFixed(2)}</h2></div>
                                <div style={styles.card}><p style={{ color: '#6B7280', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>TOTAL ORDERS</p><h2 style={{ margin: 0 }}>{dashboardStats.total_orders}</h2></div>
                                <div style={styles.card}><p style={{ color: '#6B7280', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>PRODUCTS</p><h2 style={{ margin: 0 }}>{dashboardStats.total_products}</h2><p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#EF4444' }}>{dashboardStats.low_stock_products} low stock</p></div>
                                <div style={styles.card}><p style={{ color: '#6B7280', fontSize: '12px', fontWeight: 'bold', margin: '0 0 10px 0' }}>CUSTOMERS</p><h2 style={{ margin: 0 }}>{customers.length || 0}</h2></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                <div style={{...styles.card, minHeight: '250px'}}>
                                    <h4 style={{margin: '0 0 15px 0'}}>Recent Orders</h4>
                                    {dashboardStats.recent_orders.length === 0 ? <p style={{color: '#9CA3AF', textAlign: 'center', marginTop: '50px'}}>No orders yet today</p> : 
                                    <table style={styles.table}>
                                        <thead><tr><th style={styles.th}>Order #</th><th style={styles.th}>Customer</th><th style={styles.th}>Total</th><th style={styles.th}>Time</th></tr></thead>
                                        <tbody>{dashboardStats.recent_orders.map(o => (
                                            <tr key={o.id}><td style={{...styles.td, color:'#1D4ED8', fontWeight:'bold'}}>#{o.id}</td><td style={styles.td}>{o.customer}</td><td style={styles.td}>{settings.currency_symbol}{o.total}</td><td style={styles.td}>{new Date(o.time).toLocaleTimeString()}</td></tr>
                                        ))}</tbody>
                                    </table>}
                                </div>
                                <div style={{...styles.card, minHeight: '250px', borderTop: '4px solid #F59E0B'}}>
                                    <h4 style={{margin: '0 0 15px 0', color: '#D97706'}}>⚠️ Low Stock Alert</h4>
                                    {products.filter(p => p.stock_level <= p.low_stock_alert).length === 0 ? <p style={{color: '#9CA3AF', textAlign: 'center', marginTop: '50px'}}>All products well-stocked</p> : 
                                    products.filter(p => p.stock_level <= p.low_stock_alert).map(p => <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '10px 0'}}><span>{p.name}</span><span style={{color: '#EF4444', fontWeight: 'bold'}}>{p.stock_level} left</span></div>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== POS / BILLING ==================== */}
                    {activeTab === "POS/Billing" && (
                        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
                            {/* Left Side: Products */}
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                <input type="text" placeholder="Search by name, SKU or barcode..." style={{...styles.input, marginBottom: '20px', padding: '15px'}} />
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                                    {products.length === 0 ? <p style={{color: '#9CA3AF'}}>No products found</p> : products.map(product => (
                                        <div key={product.id} onClick={() => handleAddToCart(product)} style={{ ...styles.card, cursor: 'pointer', textAlign: 'center', padding: '25px 15px', transition: 'transform 0.2s', ':hover': {transform: 'scale(1.02)'} }}>
                                            <div style={{fontSize: '30px', marginBottom: '10px'}}>📦</div>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{product.name}</h4>
                                            <p style={{ margin: '0', color: '#1D4ED8', fontWeight: 'bold' }}>Rs. {product.selling_price}</p>
                                            <span style={{ fontSize: '11px', color: product.stock_level > 0 ? '#10B981' : '#EF4444', backgroundColor: product.stock_level > 0 ? '#D1FAE5' : '#FEE2E2', padding: '2px 8px', borderRadius: '10px', marginTop: '10px', display: 'inline-block' }}>
                                                {product.stock_level > 0 ? `Stock: ${product.stock_level}` : 'Out of Stock'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ ...styles.card, flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🛒 Cart</h3>
                                    {cart.length > 0 && <button onClick={clearCart} style={{color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Clear All</button>}
                                </div>
                                
                                <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                                    <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={{...styles.input, marginBottom: '20px'}}>
                                        <option value="">👤 Walk-in Customer</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                                    </select>

                                    {cart.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#9CA3AF', marginTop: '50px' }}>
                                            <span style={{fontSize: '40px'}}>🛒</span>
                                            <p>Add products to start</p>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{margin: '0', fontWeight: 'bold', color: '#374151', fontSize:'14px'}}>{item.name}</p>
                                                    <span style={{fontSize: '12px', color: '#6B7280'}}>{settings.currency_symbol}{item.price} each</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button onClick={() => updateQty(item.product_id, -1)} style={styles.qtyBtn}>-</button>
                                                    <span style={{width: '20px', textAlign: 'center', fontWeight: 'bold'}}>{item.quantity}</span>
                                                    <button onClick={() => updateQty(item.product_id, 1)} style={styles.qtyBtn}>+</button>
                                                </div>
                                                <div style={{ marginLeft: '15px', textAlign: 'right', minWidth: '60px' }}>
                                                    <strong style={{color: '#111827'}}>{settings.currency_symbol}{(item.price * item.quantity).toFixed(2)}</strong>
                                                    <div onClick={() => removeFromCart(item.product_id)} style={{color: '#EF4444', fontSize: '11px', cursor: 'pointer', marginTop:'2px'}}>Remove</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{color: '#6B7280'}}>Discount (Rs.):</span>
                                        <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ width: '80px', padding: '5px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                                        <span>Total:</span>
                                        <span>Rs. {(cart.reduce((t, i) => t + (i.price * i.quantity), 0) - discount).toFixed(2)}</span>
                                    </div>
                                    <button onClick={handleCheckout} style={{...styles.btnPrimary, backgroundColor: '#10B981', width: '100%', padding: '15px', fontSize: '16px', display: 'flex', justifyContent: 'center'}}>
                                        Pay & Checkout
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== PRODUCTS ==================== */}
                    {activeTab === "Products" && (
                        <div style={styles.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <input type="text" placeholder="🔍 Search name, SKU..." value={prodSearch} onChange={e=>setProdSearch(e.target.value)} style={{...styles.input, width: '300px'}} />
                                <button onClick={() => {setFormData({name:"",sku:"",category:"",cost_price:"",selling_price:"",stock_level:"",low_stock_alert:"5"}); setProductModal({open:true, isEdit:false})}} style={styles.btnPrimary}>+ Add Product</button>
                            </div>
                            <table style={styles.table}>
                                <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>SKU</th><th style={styles.th}>Category</th><th style={styles.th}>Price</th><th style={styles.th}>Stock</th><th style={styles.th}>Actions</th></tr></thead>
                                <tbody>{filteredProducts.map(p => (
                                    <tr key={p.id}>
                                        <td style={{...styles.td, fontWeight: 'bold'}}>{p.name}</td>
                                        <td style={styles.td}>{p.sku}</td><td style={styles.td}>{p.category}</td>
                                        <td style={{...styles.td, color: '#1D4ED8', fontWeight: 'bold'}}>{settings.currency_symbol}{p.selling_price}</td>
                                        <td style={{...styles.td, color: p.stock_level <= p.low_stock_alert ? '#EF4444' : '#10B981', fontWeight: 'bold'}}>{p.stock_level}</td>
                                        <td style={styles.td}>
                                            <button onClick={()=>openEditProduct(p)} style={{...styles.btnAction, color: '#3B82F6'}}>✏️ Edit</button>
                                            <button onClick={()=>deleteProduct(p.id)} style={{...styles.btnAction, color: '#EF4444'}}>🗑️ Delete</button>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}

                    {/* ==================== CUSTOMERS ==================== */}
                    {activeTab === "Customers" && (
                        <div style={styles.card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <input type="text" placeholder="🔍 Search name, phone..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} style={{...styles.input, width: '300px'}} />
                                <button onClick={() => {setCustomerForm({name:"",phone:"",email:""}); setCustomerModal({open:true, isEdit:false})}} style={styles.btnPrimary}>+ Add Customer</button>
                            </div>
                            
                            <table style={styles.table}>
                                <thead>
                                    <tr><th style={styles.th}>Name</th><th style={styles.th}>Phone</th><th style={styles.th}>Email</th></tr>
                                </thead>
                                <tbody>
                                    {customers.map(c => (
                                        <tr key={c.id}><td style={styles.td}>{c.name}</td><td style={styles.td}>{c.phone}</td><td style={styles.td}>{c.email || 'N/A'}</td></tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ marginTop: '40px', padding: '20px', border: '1px dashed #d1d5db', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                                <h4>Add New Customer</h4>
                                <form onSubmit={handleAddCustomer} style={{ display: 'flex', gap: '10px' }}>
                                    <input placeholder="Name" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} required style={styles.input}/>
                                    <input placeholder="Phone" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} required style={styles.input}/>
                                    <button type="submit" style={styles.btnPrimary}>Save Customer</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* 5. ORDERS SCREEN                           */}
                    {/* ========================================== */}
                    {activeTab === "Orders" && (
                        <div style={styles.card}>
                            <table style={styles.table}>
                                <thead>
                                    <tr><th style={styles.th}>Order #</th><th style={styles.th}>Date & Time</th><th style={styles.th}>Total</th><th style={styles.th}>Status</th></tr>
                                </thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id}>
                                            <td style={{...styles.td, fontWeight: 'bold', color: '#1D4ED8'}}>#{o.id}</td>
                                            <td style={styles.td}>{new Date(o.date).toLocaleString()}</td>
                                            <td style={{...styles.td, fontWeight: 'bold'}}>Rs. {o.total.toFixed(2)}</td>
                                            <td style={styles.td}><span style={{ backgroundColor: '#D1FAE5', color: '#10B981', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{o.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '1px dashed black', paddingTop: '10px', fontSize: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Subtotal:</span><span>{settings.currency_symbol}{orderDetails.subtotal.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Discount:</span><span>-{settings.currency_symbol}{orderDetails.discount.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '5px', borderTop: '2px solid black', paddingTop: '5px' }}><span>TOTAL:</span><span>{settings.currency_symbol}{orderDetails.total.toFixed(2)}</span></div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', borderTop: '1px dashed black', paddingTop: '15px' }}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{settings.receipt_message}</p>
                                <p style={{ margin: 0, fontSize: '10px', color: 'gray' }}>Powered by Timeline Digital</p>
                            </div>
                        </div>

                        {/* Non-Printable Action Buttons */}
                        <div className="no-print" style={{ padding: '15px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb' }}>
                            <button onClick={() => setOrderDetails(null)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', backgroundColor: 'white' }}>Close</button>
                            <button onClick={() => window.print()} style={{...styles.btnPrimary, backgroundColor: '#10B981'}}>🖨️ Print Receipt</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT EDIT/ADD MODAL */}
            {productModal.open && (
                <div style={styles.modalOverlay} className="no-print"><div style={styles.modalBox}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom:'20px'}}>
                        <h3 style={{ margin: 0 }}>{productModal.isEdit ? '✏️ Edit Product' : '📦 Add Product'}</h3>
                        <button onClick={()=>setProductModal({open:false})} style={{border:'none', background:'none', fontSize:'20px', cursor:'pointer', color:'#6B7280'}}>✖</button>
                    </div>
                    <form onSubmit={saveProduct} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        <div><label style={{fontSize: '12px', color: '#6B7280'}}>Product Name *</label><input value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required style={styles.input}/></div>
                        <div style={{display:'flex', gap:'15px'}}>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>SKU *</label><input value={formData.sku} onChange={e=>setFormData({...formData, sku:e.target.value})} required style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>Category</label><input value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})} style={styles.input}/></div>
                        </div>
                        <div style={{display:'flex', gap:'15px'}}>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>Purchase Price *</label><input type="number" step="0.01" value={formData.cost_price} onChange={e=>setFormData({...formData, cost_price:e.target.value})} required style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>Sale Price *</label><input type="number" step="0.01" value={formData.selling_price} onChange={e=>setFormData({...formData, selling_price:e.target.value})} required style={styles.input}/></div>
                        </div>
                        <div style={{display:'flex', gap:'15px'}}>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>Stock Quantity</label><input type="number" value={formData.stock_level} onChange={e=>setFormData({...formData, stock_level:e.target.value})} required style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={{fontSize: '12px', color: '#6B7280'}}>Low Stock Alert</label><input type="number" value={formData.low_stock_alert} onChange={e=>setFormData({...formData, low_stock_alert:e.target.value})} required style={styles.input}/></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button type="button" onClick={() => setProductModal({open:false})} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', backgroundColor: 'white' }}>Cancel</button>
                            <button type="submit" style={styles.btnPrimary}>{productModal.isEdit ? 'Update Product' : 'Create Product'}</button>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* 6 & 7. REPORTS & SETTINGS (Coming Soon)    */}
                    {/* ========================================== */}
                    {(activeTab === "Reports" || activeTab === "Settings") && (
                        <div style={{...styles.card, textAlign: 'center', padding: '50px', color: '#6B7280'}}>
                            <span style={{fontSize: '50px'}}>🚧</span>
                            <h2>Coming Soon!</h2>
                            <p>Yeh screen hum aglay phase mein banayenge.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default App;