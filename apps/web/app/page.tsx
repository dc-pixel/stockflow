import Link from 'next/link';

const inventory = [
  ['WM-001','Wireless Mouse','42','LOW STOCK'],
  ['KB-014','Mechanical Keyboard','384','OVERSTOCKED'],
  ['HUB-008','USB-C Hub','116','IN STOCK'],
  ['SSD-512','NVMe SSD 512GB','8','CRITICAL'],
];

const bars = [48,63,54,72,68,81,77,92,88,100,94,108];

export default function Home() {
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">StockFlow</div>
      <nav className="nav">
        <a className="active" href="#dashboard">Dashboard</a>
        <a href="#inventory">Inventory</a>
        <a href="#products">Products</a>
        <a href="#purchases">Purchase Orders</a>
        <a href="#sales">Sales Orders</a>
        <a href="#warehouses">Warehouses</a>
        <a href="#suppliers">Suppliers</a>
        <a href="#forecast">Demand Forecast</a>
        <a href="#analytics">Analytics</a>
      </nav>
      <div style={{marginTop:32,fontSize:12,color:'#8d98a8'}}>Inventory Manager<br/><span style={{color:'#fff'}}>demo@stockflow.app</span></div>
    </aside>
    <main className="main">
      <div className="top"><div><div className="eyebrow">Monday, 15 September 2026</div><div className="title">Inventory overview</div><div className="muted">Know what changed. Decide what to do next.</div></div><Link className="cta" href="#inventory">Open inventory</Link></div>
      <section className="grid">
        <div className="card"><div className="kpi-label">Inventory value</div><div className="kpi-value">₹48.6L</div><div className="kpi-note success">↑ 6.8% vs last month</div></div>
        <div className="card"><div className="kpi-label">Low stock items</div><div className="kpi-value">27</div><div className="kpi-note warning">9 need action today</div></div>
        <div className="card"><div className="kpi-label">Out of stock</div><div className="kpi-value">8</div><div className="kpi-note danger">3 high-priority SKUs</div></div>
        <div className="card"><div className="kpi-label">Pending POs</div><div className="kpi-value">12</div><div className="kpi-note">₹6.9L inbound value</div></div>
      </section>

      <section className="section-grid">
        <div className="card"><div style={{fontWeight:800,fontSize:16}}>Demand trend</div><div className="muted">30-day sales velocity</div><div className="chart">{bars.map((h,i)=><div className="bar" key={i} style={{height:`${h/1.15}%`}} />)}</div></div>
        <div className="card"><div style={{fontWeight:800,fontSize:16,marginBottom:4}}>🧠 StockFlow Intelligence</div><div className="muted" style={{marginBottom:12}}>3 actions need your attention.</div><div className="actions">
          <div className="action"><span className="dot"/><div><b>Wireless Mouse</b><div className="muted">Stock falls below safety level in 4 days. Recommended order: <b>190 units</b>.</div></div></div>
          <div className="action"><span className="dot"/><div><b>Mechanical Keyboard</b><div className="muted">384 units have stayed unsold for 90 days. Review discount/liquidation.</div></div></div>
          <div className="action"><span className="dot"/><div><b>USB-C Hub</b><div className="muted">Demand increased 34% over 30 days. Consider increasing reorder quantity.</div></div></div>
        </div></div>
      </section>

      <section className="card" style={{marginTop:16}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div><div style={{fontWeight:800,fontSize:16}}>Inventory snapshot</div><div className="muted">Current available units across priority SKUs</div></div><a href="#inventory" className="muted">View all →</a></div><table className="table"><thead><tr><th>SKU</th><th>Product</th><th>Available</th><th>Status</th></tr></thead><tbody>{inventory.map(row=><tr key={row[0]}><td><b>{row[0]}</b></td><td>{row[1]}</td><td>{row[2]}</td><td><span className="badge">{row[3]}</span></td></tr>)}</tbody></table></section>
    </main>
  </div>;
}
