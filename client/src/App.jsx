import React, { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, CalendarDays, ChartNoAxesCombined,
  CircleDollarSign, Download, LayoutDashboard, LogOut, Menu, Package, Plus, RefreshCw,
  Search, ShoppingBag, ShoppingCart, Users, Wifi, WifiOff, X, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart
} from "recharts";
import api from "./api";

const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const compactMoney = n => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
const dateLabel = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("register");
  const [name, setName] = useState("Dashboard Admin");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const { data } = await api.post(`/auth/${mode}`, mode === "register" ? { name, email, password } : { email, password });
      localStorage.setItem("lba_token", data.token); onLogin(data.user);
    } catch (e) { setError(e.response?.data?.message || "Cannot connect to API. Is the server running?"); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell"><div className="auth-card">
    <div className="brand-mark"><ChartNoAxesCombined size={25}/></div>
    <p className="eyebrow">PULSE ANALYTICS</p><h1>Every Metric. Every Moment.</h1>
    <p className="muted">Track sales, orders and product performance from one live dashboard.</p>
    <div className="auth-tabs"><button className={mode==="register"?"selected":""} onClick={()=>setMode("register")}>Create account</button><button className={mode==="login"?"selected":""} onClick={()=>setMode("login")}>Sign in</button></div>
    <form onSubmit={submit} className="form-stack">
      {mode==="register" && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} required maxLength="80"/></label>}
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/><small>At least 8 characters</small></label>
      {error && <div className="error-box">{error}</div>}
      <button className="primary-btn full" disabled={busy}>{busy?"Please wait…":mode==="register"?"Create dashboard account":"Sign in to dashboard"}</button>
    </form>
    <p className="auth-foot">Your account is stored in your MongoDB database. Keep your credentials private.</p>
  </div></div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [range, setRange] = useState("30d");
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [showOrder, setShowOrder] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const flash = msg => { setNotice(msg); window.setTimeout(() => setNotice(""), 3500); };
  const loadAll = useCallback(async () => {
    if (!localStorage.getItem("lba_token")) return;
    setLoading(true);
    try {
      const [a,o,p] = await Promise.all([
        api.get("/analytics/overview", { params: { range } }),
        api.get("/orders?limit=100"),
        api.get("/products")
      ]);
      setData(a.data); setOrders(o.data); setProducts(p.data);
    } catch (e) {
      if (e.response?.status === 401) { localStorage.removeItem("lba_token"); setUser(null); }
      else flash(e.response?.data?.message || "Could not load dashboard data.");
    } finally { setLoading(false); setAuthChecked(true); }
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!localStorage.getItem("lba_token")) { setAuthChecked(true); return; }
      try { const {data} = await api.get("/auth/me"); if (!cancelled) setUser(data.user); }
      catch { localStorage.removeItem("lba_token"); }
      if (!cancelled) setAuthChecked(true);
    }
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  useEffect(() => {
    if (!user) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { transports: ["websocket", "polling"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    const refresh = () => loadAll();
    socket.on("analytics:refresh", refresh);
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("product:updated", refresh);
    return () => { socket.disconnect(); setConnected(false); };
  }, [user, loadAll]);

  async function seedDemo() {
    try { const {data} = await api.post("/demo/seed"); flash(`${data.products} products and ${data.orders} demo orders created.`); await loadAll(); }
    catch (e) { flash(e.response?.data?.message || "Could not create demo data."); }
  }
  async function liveOrder() {
    try { const {data} = await api.post("/demo/order"); flash(`${data.message} ${money(data.order.total)} added.`); await loadAll(); }
    catch (e) { flash(e.response?.data?.message || "Could not create demo order."); }
  }
  function logout() { localStorage.removeItem("lba_token"); setUser(null); setData(null); setOrders([]); setProducts([]); }

  const filteredOrders = useMemo(() => orders.filter(o => `${o.orderNumber} ${o.customerName} ${o.status}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);

  if (!authChecked) return <div className="loading-screen"><RefreshCw className="spin"/> Checking session…</div>;
  if (!user) return <AuthScreen onLogin={u => { setUser(u); setAuthChecked(true); }}/>;

  const k = data?.kpis || {};
  const nav = [
    {name:"Overview",icon:LayoutDashboard},{name:"Orders",icon:ShoppingCart},{name:"Products",icon:Package}
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?"mobile-open":""}`}>
      
<div className="side-brand">
  <div className="brand-mark small">
    <Activity size={23} />
  </div>

  <div className="pulse-brand-text">
    <strong>Pulse Analytics</strong>
    <span>BUSINESS INTELLIGENCE</span>
  </div>

  <button
    className="icon-btn close-mobile"
    onClick={() => setMobileNav(false)}
    aria-label="Close navigation"
  >
    <X size={18} />
  </button>
</div>

      <div className="workspace"><div className="workspace-avatar">S</div><div><strong>Store Workspace</strong><small>Business overview</small></div><span className="chevron">⌄</span></div>
      <p className="side-label">WORKSPACE</p>
      <nav>{nav.map(n=><button key={n.name} className={`nav-item ${activeNav===n.name?"active":""}`} onClick={()=>{setActiveNav(n.name);setMobileNav(false);}}><n.icon size={18}/>{n.name}{n.name==="Orders"&&<span className="nav-count">{orders.length}</span>}</button>)}</nav>
      <p className="side-label">TOOLS</p>
      <button className="nav-item" onClick={()=>setShowOrder(true)}><Plus size={18}/>Create order</button>
      <button className="nav-item" onClick={()=>setShowProduct(true)}><Boxes size={18}/>Add product</button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Zap size={17}/></div><strong>Live demo mode</strong><p>Create a sample order to see your metrics update instantly.</p><button onClick={liveOrder}>Generate live order <span>↗</span></button></div><div className="profile-row"><div className="profile-avatar">{(user.name||"A").slice(0,1).toUpperCase()}</div><div className="profile-info"><strong>{user.name}</strong><small>{user.email}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <div className="mobile-scrim" onClick={()=>setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div><div className="page-heading">{activeNav==="Overview"?"Business overview":activeNav}</div></div></div><div className="top-actions"><div className={`live-pill ${connected?"online":""}`}><span className="live-dot"/>{connected?"Live connection":"Connecting…"}</div><button className="icon-btn notification-btn" title="Notifications"><Bell size={18}/><i/></button><div className="today-label"><CalendarDays size={16}/>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div></div></header>
      <div className="content">
        {notice && <div className="toast"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        <div className="welcome-row"><div><p className="eyebrow">YOUR BUSINESS AT A GLANCE</p><h1>{activeNav==="Overview"?"Good to see you, "+user.name.split(" ")[0]+" 👋":activeNav}</h1><p className="muted">Here's what's happening with your store today.</p></div><div className="welcome-actions"><button className="secondary-btn" onClick={seedDemo}><Zap size={16}/>Load demo data</button><button className="primary-btn" onClick={()=>setShowOrder(true)}><Plus size={17}/>New order</button></div></div>
        {activeNav==="Products" ? <ProductsPage products={products} onAdd={()=>setShowProduct(true)} onRefresh={loadAll}/> :
        activeNav==="Orders" ? <OrdersPage orders={filteredOrders} search={search} setSearch={setSearch} onNew={()=>setShowOrder(true)}/> :
        <>
          <div className="range-row"><div className="section-label"><span className="tiny-live-dot"/>LIVE PERFORMANCE <span className="updated-label">· Updated {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div><div className="range-control">{[["today","Today"],["7d","7 days"],["30d","30 days"],["12m","12 months"]].map(([v,l])=><button key={v} className={range===v?"chosen":""} onClick={()=>setRange(v)}>{l}</button>)}</div></div>
          <div className="kpi-grid">
            <Kpi title="Total revenue" value={money(k.revenue)} icon={CircleDollarSign} tone="violet" subtitle={`For selected period`} />
            <Kpi title="Total orders" value={(k.orders||0).toLocaleString("en-IN")} icon={ShoppingBag} tone="blue" subtitle="Non-cancelled orders" />
            <Kpi title="Customers" value={(k.customers||0).toLocaleString("en-IN")} icon={Users} tone="green" subtitle="Unique customer emails" />
            <Kpi title="Avg. order value" value={money(k.averageOrderValue)} icon={Activity} tone="orange" subtitle="Revenue per order" />
          </div>
          <div className="chart-grid">
            <section className="panel revenue-panel"><div className="panel-heading"><div><h2>Revenue overview</h2><p>Sales performance over the selected period</p></div><span className="chart-tag"><span className="tiny-live-dot"/>Live</span></div><div className="chart-summary"><strong>{money(k.revenue)}</strong><span className="muted">total revenue</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.sales||[]} margin={{top:10,right:10,left:0,bottom:0}}><defs><linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7767f8" stopOpacity={0.24}/><stop offset="95%" stopColor="#7767f8" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf4"/><XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#8b95a7"}} minTickGap={28}/><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#8b95a7"}} width={48}/><Tooltip formatter={v=>money(v)} labelFormatter={dateLabel} contentStyle={{border:"1px solid #e6eaf1",borderRadius:12,boxShadow:"0 8px 24px #19233b12"}}/><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7767f8" strokeWidth={2.5} fill="url(#revFill)" activeDot={{r:5,strokeWidth:0}}/></AreaChart></ResponsiveContainer></div></section>
            <section className="panel products-panel"><div className="panel-heading"><div><h2>Top products</h2><p>By revenue in selected period</p></div><Package size={18} className="panel-muted-icon"/></div><div className="bar-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.topProducts||[]} layout="vertical" margin={{top:4,right:12,left:8,bottom:0}}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#e9edf4"/><XAxis type="number" tickFormatter={compactMoney} tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#8b95a7"}}/><YAxis type="category" dataKey="_id" width={100} tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#657086"}}/><Tooltip formatter={v=>money(v)} contentStyle={{borderRadius:12}}/><Bar dataKey="revenue" name="Revenue" fill="#7767f8" radius={[0,5,5,0]} barSize={19}/></BarChart></ResponsiveContainer></div><div className="top-products-foot"><span>Top 5 products</span><span>Revenue <ArrowUpRight size={14}/></span></div></section>
          </div>
          <div className="bottom-grid">
            <section className="panel orders-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Latest activity from your store</p></div><button className="text-btn" onClick={()=>setActiveNav("Orders")}>View all <ArrowUpRight size={14}/></button></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>STATUS</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{(data?.recentOrders||[]).slice(0,6).map(o=><tr key={o._id}><td className="order-id">{o.orderNumber}</td><td><div className="customer-cell"><span className="customer-avatar">{o.customerName?.slice(0,1)||"C"}</span><span>{o.customerName}</span></div></td><td className="date-cell">{dateLabel(o.orderedAt)}</td><td><Status status={o.status}/></td><td className="amount-cell">{money(o.total)}</td></tr>)}{!data?.recentOrders?.length&&<tr><td colSpan="5" className="empty-cell">No orders yet. Load demo data or create an order.</td></tr>}</tbody></table></div></section>
            <section className="panel stock-panel"><div className="panel-heading"><div><h2>Inventory alerts</h2><p>Products running low on stock</p></div><span className="alert-count">{data?.lowStock?.length||0}</span></div><div className="stock-list">{(data?.lowStock||[]).map(p=><div className="stock-item" key={p._id}><div className="product-mini-icon"><Package size={17}/></div><div className="stock-info"><strong>{p.name}</strong><small>{p.category}</small><div className="stock-bar"><span style={{width:`${Math.min(100,(p.stock/10)*100)}%`}}/></div></div><span className={`stock-number ${p.stock<=3?"critical":""}`}>{p.stock} left</span></div>)}{!data?.lowStock?.length&&<div className="empty-stock">All stocked up. No low-stock alerts.</div>}</div><button className="stock-link" onClick={()=>setActiveNav("Products")}>Manage inventory <ArrowUpRight size={14}/></button></section>
          </div>
        </>}
        <footer className="footer"><span>© {new Date().getFullYear()} Pulse Analytics</span><span><span className="tiny-live-dot"/> {connected?"Connected to live event stream":"Waiting for live connection"} <span className="footer-divider">·</span> {loading?"Syncing data…":"Data synced"}</span></footer>
      </div>
    </main>
    {showOrder&&<OrderModal products={products} onClose={()=>setShowOrder(false)} onCreated={async()=>{setShowOrder(false);await loadAll();flash("Order created. Dashboard analytics refreshed.");}}/>}
    {showProduct&&<ProductModal onClose={()=>setShowProduct(false)} onCreated={async()=>{setShowProduct(false);await loadAll();flash("Product added successfully.");}}/>}
  </div>;
}

function Kpi({title,value,icon:Icon,tone,subtitle}) {
  return <section className="kpi-card"><div className="kpi-top"><span>{title}</span><span className={`kpi-icon ${tone}`}><Icon size={19}/></span></div><div className="kpi-value">{value}</div><div className="kpi-foot"><span className="kpi-indicator"><ArrowUpRight size={13}/></span><span>{subtitle}</span></div></section>;
}
function Status({status}) {
  const cls = status==="Completed"?"complete":status==="Processing"?"processing":status==="Cancelled"?"cancelled":"pending";
  return <span className={`status ${cls}`}><i/>{status}</span>;
}
function OrdersPage({orders,search,setSearch,onNew}) {
  return <section className="panel full-table-panel"><div className="panel-heading"><div><h2>All orders</h2><p>Search and review recent orders</p></div><button className="primary-btn" onClick={onNew}><Plus size={16}/>New order</button></div><div className="table-tools"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, customer or status…"/></div><span className="muted small-text">{orders.length} orders shown</span></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>DATE</th><th>STATUS</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{orders.map(o=><tr key={o._id}><td className="order-id">{o.orderNumber}</td><td><div className="customer-cell"><span className="customer-avatar">{o.customerName?.slice(0,1)||"C"}</span><span>{o.customerName}</span></div></td><td>{o.items?.length||0} item(s)</td><td className="date-cell">{new Date(o.orderedAt).toLocaleString("en-IN")}</td><td><Status status={o.status}/></td><td className="amount-cell">{money(o.total)}</td></tr>)}{!orders.length&&<tr><td colSpan="6" className="empty-cell">No matching orders found.</td></tr>}</tbody></table></div></section>;
}
function ProductsPage({products,onAdd,onRefresh}) {
  async function updateStock(p) {
    const raw = window.prompt(`Set stock quantity for ${p.name}:`, String(p.stock));
    if (raw===null) return;
    const stock = Number(raw);
    if (!Number.isInteger(stock)||stock<0) return window.alert("Enter a non-negative whole number.");
    try { await api.patch(`/products/${p._id}/stock`,{stock}); await onRefresh(); }
    catch(e) { window.alert(e.response?.data?.message||"Stock update failed."); }
  }
  return <section className="panel full-table-panel"><div className="panel-heading"><div><h2>Product inventory</h2><p>Manage product catalogue and stock levels</p></div><button className="primary-btn" onClick={onAdd}><Plus size={16}/>Add product</button></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>ACTION</th></tr></thead><tbody>{products.map(p=><tr key={p._id}><td><div className="customer-cell"><span className="product-mini-icon"><Package size={17}/></span><strong>{p.name}</strong></div></td><td className="order-id">{p.sku}</td><td>{p.category}</td><td className="amount-cell">{money(p.price)}</td><td><span className={`stock-number ${p.stock<=5?"critical":""}`}>{p.stock}</span></td><td><button className="small-action" onClick={()=>updateStock(p)}>Update stock</button></td></tr>)}{!products.length&&<tr><td colSpan="6" className="empty-cell">No products yet. Load demo data or add a product.</td></tr>}</tbody></table></div></section>;
}
function OrderModal({products,onClose,onCreated}) {
  const [customerName,setCustomerName]=useState(""); const [customerEmail,setCustomerEmail]=useState("");
  const [productId,setProductId]=useState(products.find(p=>p.stock>0)?._id||""); const [quantity,setQuantity]=useState(1);
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const product=products.find(p=>p._id===productId); const total=(product?.price||0)*Number(quantity||0);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError("");
    try { await api.post("/orders",{customerName,customerEmail,items:[{productId,quantity:Number(quantity)}]}); await onCreated(); }
    catch(e){setError(e.response?.data?.message||"Order could not be created.");}
    finally{setBusy(false);}
  }
  return <Modal title="Create a new order" onClose={onClose}><form className="form-stack" onSubmit={submit}><label>Customer name<input required value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength="100" placeholder="e.g. Priya Shah"/></label><label>Customer email <span className="optional">(optional)</span><input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="customer@example.com"/></label><label>Product<select required value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Choose product</option>{products.filter(p=>p.stock>0).map(p=><option key={p._id} value={p._id}>{p.name} · {money(p.price)} · {p.stock} in stock</option>)}</select></label><label>Quantity<input type="number" min="1" max={product?.stock||1} required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><div className="order-total"><span>Order total</span><strong>{money(total)}</strong></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy||!productId}>{busy?"Creating…":"Create order"}</button></div></form></Modal>;
}
function ProductModal({onClose,onCreated}) {
  const [form,setForm]=useState({name:"",category:"Electronics",price:"",stock:"10",sku:""}); const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  function change(e){setForm({...form,[e.target.name]:e.target.value});}
  async function submit(e){e.preventDefault();setBusy(true);setError("");try{await api.post("/products",{...form,price:Number(form.price),stock:Number(form.stock)});await onCreated();}catch(e){setError(e.response?.data?.message||"Product could not be saved.");}finally{setBusy(false);}}
  return <Modal title="Add a product" onClose={onClose}><form className="form-stack" onSubmit={submit}><label>Product name<input name="name" value={form.name} onChange={change} required maxLength="120"/></label><label>SKU<input name="sku" value={form.sku} onChange={change} required placeholder="e.g. ELEC-004"/></label><label>Category<select name="category" value={form.category} onChange={change}><option>Electronics</option><option>Fashion</option><option>Accessories</option><option>Home</option><option>Beauty</option><option>Other</option></select></label><div className="two-fields"><label>Price (₹)<input name="price" type="number" min="0" step="0.01" value={form.price} onChange={change} required/></label><label>Stock quantity<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={change} required/></label></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?"Saving…":"Save product"}</button></div></form></Modal>;
}
function Modal({title,onClose,children}) {
  useEffect(()=>{function key(e){if(e.key==="Escape")onClose();}window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-card"><div className="modal-heading"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</div></div>;
}

export default App;
