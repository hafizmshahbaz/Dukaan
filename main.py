import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

# 2. DATABASE MODELS
class ProductDB(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String, unique=True, index=True)
    category = Column(String, index=True)
    cost_price = Column(Float)
    selling_price = Column(Float)
    stock_level = Column(Integer, default=0)
    low_stock_alert = Column(Integer, default=5)

class CustomerDB(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String)
    balance = Column(Float, default=0.0)

class OrderDB(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    subtotal = Column(Float)
    discount = Column(Float, default=0.0)
    total = Column(Float)
    paid_amount = Column(Float)
    status = Column(String, default="Completed")
    
    # Relationship to fetch items with order easily
    items = relationship("OrderItemDB", back_populates="order")
    customer = relationship("CustomerDB")

class OrderItemDB(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price_at_sale = Column(Float)
    
    order = relationship("OrderDB", back_populates="items")
    product = relationship("ProductDB")

class SettingsDB(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, default="Timeline POS")
    phone = Column(String, default="03001234567")
    email = Column(String, default="info@timeline.com")
    currency_symbol = Column(String, default="Rs.")
    tax_rate = Column(Float, default=0.0)

Base.metadata.create_all(bind=engine)

# 3. FASTAPI SETUP
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

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
def get_products(db: Session = Depends(get_db)): return db.query(ProductDB).all()
@app.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    new_product = ProductDB(**product.dict()); db.add(new_product); db.commit(); return new_product
@app.put("/products/{id}")
def update_product(id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(ProductDB).filter(ProductDB.id == id).first()
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
def process_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    subtotal = sum(i.price * i.quantity for i in req.cart_items)
    total = subtotal - req.discount
    new_order = OrderDB(customer_id=req.customer_id, subtotal=subtotal, discount=req.discount, total=total, paid_amount=total)
    db.add(new_order); db.commit(); db.refresh(new_order)
    
    for item in req.cart_items:
        db.add(OrderItemDB(order_id=new_order.id, product_id=item.product_id, quantity=item.quantity, price_at_sale=item.price))
        prod = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if prod: prod.stock_level -= item.quantity
    db.commit()
    return {"message": "Success", "order_id": new_order.id}

@app.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    # Sending orders with items and customer name for the Order History Modal
    orders = db.query(OrderDB).order_by(OrderDB.id.desc()).all()
    result = []
    for o in orders:
        items = [{"name": i.product.name, "qty": i.quantity, "price": i.price_at_sale} for i in o.items if i.product]
        result.append({"id": o.id, "date": o.date, "total": o.total, "status": o.status, "customer_name": o.customer.name if o.customer else "Walk-in", "items": items, "subtotal": o.subtotal, "discount": o.discount})
    return result

# Dashboard & Reports
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    all_orders = db.query(OrderDB).all()
    today_sales = sum(o.total for o in all_orders if o.date.date() == today)
    
    # Get 5 recent orders for dashboard
    recent_orders = db.query(OrderDB).order_by(OrderDB.id.desc()).limit(5).all()
    recent_list = [{"id": o.id, "time": o.date, "total": o.total, "customer": o.customer.name if o.customer else "Walk-in"} for o in recent_orders]

    return {
        "today_sales": today_sales,
        "total_orders": len(all_orders),
        "total_products": db.query(ProductDB).count(),
        "low_stock_products": db.query(ProductDB).filter(ProductDB.stock_level <= ProductDB.low_stock_alert).count(),
        "recent_orders": recent_list
    }

@app.get("/reports")
def get_reports(db: Session = Depends(get_db)):
    # Simple report grouping by date
    orders = db.query(OrderDB).all()
    revenue = sum(o.total for o in orders)
    daily = {}
    for o in orders:
        d = o.date.strftime("%Y-%m-%d")
        if d not in daily: daily[d] = {"orders": 0, "revenue": 0.0}
        daily[d]["orders"] += 1
        daily[d]["revenue"] += o.total
    return {"total_revenue": revenue, "total_orders": len(orders), "daily": [{"date": k, **v} for k, v in daily.items()]}

# Settings Database Endpoints
@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(SettingsDB).first()
    if not setting: # Create default if not exists
        setting = SettingsDB()
        db.add(setting); db.commit(); db.refresh(setting)
    return setting

@app.post("/settings")
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    setting = db.query(SettingsDB).first()
    for key, value in req.dict().items(): setattr(setting, key, value)
    db.commit()
    return {"msg": "Settings Saved"}