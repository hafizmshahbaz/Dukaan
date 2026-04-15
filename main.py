from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from typing import List
from datetime import datetime
from typing import Optional

# ------------------
# 1. DATABASE SETUP
# ------------------

DATABASE_URL = "postgresql://postgres:123@localhost/dukaan_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -----------------------
# 2. NEW DATABASE MODELS
# -----------------------

# Product and Inventory Management Table
class ProductDB(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String, unique=True, index=True) # Barcode or specific code
    category = Column(String, index=True)
    cost_price = Column(Float)
    selling_price = Column(Float)
    stock_level = Column(Integer, default=0) # Real-time inventory
    low_stock_alert = Column(Integer, default=5) # Alert level

# Customer Management Table
class CustomerDB(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String)
    balance = Column(Float, default=0.0) # Outstanding balance

# Orders and Sales History Table (The Receipt)
class OrderDB(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    # customer_id can be empty if it's a walk-in customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True) 
    date = Column(DateTime, default=datetime.utcnow) # Auto records the time
    subtotal = Column(Float)
    discount = Column(Float, default=0.0)
    total = Column(Float)
    paid_amount = Column(Float)
    status = Column(String, default="Completed")

# Order Items Table
class OrderItemDB(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price_at_sale = Column(Float) # Important if prices change later

# Business Settings Table
class SettingsDB(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, default="My Supermarket")
    phone = Column(String)
    email = Column(String)
    currency_symbol = Column(String, default="$")
    tax_rate = Column(Float, default=0.0)

# Create all these tables in the database
Base.metadata.create_all(bind=engine)

# -----------------
# 3. FASTAPI SETUP
# -----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Temporary route just to check if server is running
@app.get("/")
def read_root():
    return {"message": "New Supermarket Backend is Ready!"}

# -------------------------------------------
# 4. PYDANTIC MODELS (Data Validation Rules)
# -------------------------------------------

# Rule for creating or updating a product
class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    cost_price: float
    selling_price: float
    stock_level: int
    low_stock_alert: int = 5

# Rule for sending product data back to React
class ProductResponse(ProductCreate):
    id: int

    class Config:
        from_attributes = True

# ----------------------------------------
# 5. PRODUCT & INVENTORY ENDPOINTS (CRUD)
# ----------------------------------------

# READ: Get all products (Inventory List)
@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(ProductDB).all()
    return products

# CREATE: Add a new product to inventory
@app.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    new_product = ProductDB(
        name=product.name,
        sku=product.sku,
        category=product.category,
        cost_price=product.cost_price,
        selling_price=product.selling_price,
        stock_level=product.stock_level,
        low_stock_alert=product.low_stock_alert
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# UPDATE: Edit an existing product
@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if db_product:
        db_product.name = product.name
        db_product.sku = product.sku
        db_product.category = product.category
        db_product.cost_price = product.cost_price
        db_product.selling_price = product.selling_price
        db_product.stock_level = product.stock_level
        db_product.low_stock_alert = product.low_stock_alert
        db.commit()
        return {"message": "Product updated successfully"}
    return {"error": "Product not found"}

# DELETE: Remove product from inventory
@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if db_product:
        db.delete(db_product)
        db.commit()
        return {"message": "Product deleted"}
    return {"error": "Product not found"}

# -----------------------------------------
# 6. CHECKOUT PYDANTIC MODELS (Cart rules)
# -----------------------------------------

# Rule for a single item in the cart
class CartItem(BaseModel):
    product_id: int
    quantity: int
    price: float

# Rule for the complete checkout bill
# ----------------------------------------------------------
# UPDATE: Checkout Pydantic Model (Find this and replace it)
# ----------------------------------------------------------
class CheckoutRequest(BaseModel):
    cart_items: List[CartItem]
    discount: float = 0.0
    customer_id: Optional[int] = None # NEW: Now we can optionally send a customer ID

# ----------------------------------
# 7. CHECKOUT ENDPOINT (POS Billing)
# ----------------------------------

@app.post("/checkout")
def process_checkout(request: CheckoutRequest, db: Session = Depends(get_db)):
    # 1. Calculate totals
    subtotal = sum(item.price * item.quantity for item in request.cart_items)
    total = subtotal - request.discount

    # 2. Create the Order (Receipt)
    new_order = OrderDB(
        customer_id=request.customer_id,
        subtotal=subtotal,
        discount=request.discount,
        total=total,
        paid_amount=total, # Assuming full payment for now
        status="Completed"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order) # Get the new order ID

    # 3. Save Order Items and DEDUCT STOCK
    for item in request.cart_items:
        # Save the item in the receipt
        order_item = OrderItemDB(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_sale=item.price
        )
        db.add(order_item)

        # Find the product in inventory and reduce the stock
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if product:
            product.stock_level -= item.quantity # The magic deduction!

    db.commit() # Save all changes to the database
    
    return {"message": "Bill created and stock updated successfully!", "order_id": new_order.id}

# ---------------------------------------------------------
# 8. DASHBOARD & ANALYTICS ENDPOINT
# ---------------------------------------------------------

@app.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total Products in Shop
    total_products = db.query(ProductDB).count()
    
    # 2. Products that are low on stock
    low_stock_products = db.query(ProductDB).filter(ProductDB.stock_level <= ProductDB.low_stock_alert).count()
    
    # 3. Total Orders (Bills) created
    total_orders = db.query(OrderDB).count()
    
    # 4. Today's Sales calculation
    all_orders = db.query(OrderDB).all()
    today_date = datetime.utcnow().date()
    
    today_sales = 0.0
    total_revenue = 0.0
    
    for order in all_orders:
        total_revenue += order.total
        # If the order was made today, add it to today's sales
        if order.date.date() == today_date:
            today_sales += order.total

    return {
        "total_products": total_products,
        "low_stock_products": low_stock_products,
        "total_orders": total_orders,
        "today_sales": today_sales,
        "total_revenue": total_revenue
    }



# ---------------------------------------------------------
# 9. CUSTOMER PYDANTIC MODELS & ENDPOINTS
# ---------------------------------------------------------

# Rule for adding a new customer
class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

@app.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    return db.query(CustomerDB).all()

@app.post("/customers")
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    new_customer = CustomerDB(name=customer.name, phone=customer.phone, email=customer.email)
    db.add(new_customer)
    db.commit()
    return {"message": "Customer added successfully!"}

# ---------------------------------------------------------
# 10. ORDER HISTORY ENDPOINT
# ---------------------------------------------------------

@app.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    # Fetch all orders, newest first (.desc())
    return db.query(OrderDB).order_by(OrderDB.id.desc()).all()