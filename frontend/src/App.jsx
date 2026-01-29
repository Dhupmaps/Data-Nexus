// export default App;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, FileSpreadsheet, Search, CheckCircle, XCircle,
  AlertTriangle, DollarSign, X, ArrowRightLeft, User, LogOut,
  Lock, ArrowRight, Globe, Zap, Shield, TrendingUp, Download
} from 'lucide-react';

// Star Background Component
const Starfield = () => {
  const stars = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 5 + 5}s`,
    animationDelay: `${Math.random() * 5}s`,
    size: `${Math.random() * 2 + 1}px`
  }));

  return (
    <div className="fixed inset-0 bg-[#0B1120] -z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0B1120] to-black"></div>
      {stars.map(star => (
        <div key={star.id} className="star" style={{
          left: star.left, width: star.size, height: star.size,
          animationDuration: star.animationDuration, animationDelay: star.animationDelay
        }} />
      ))}
    </div>
  );
};

// Facts Widget Component
const FactsWidget = () => {
  const facts = [
    { icon: <Globe size={18} />, text: "AI Market to hit $407B by 2027." },
    { icon: <Zap size={18} />, text: "DataNexus processes audits 400x faster than humans." },
    { icon: <Shield size={18} />, text: "LangGraph ensures stateful, reliable AI decisions." },
    { icon: <TrendingUp size={18} />, text: "Automated compliance reduces fraud by 90%." }
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % facts.length), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass p-6 rounded-2xl text-white max-w-sm border border-white/10 shadow-2xl animate-float">
      <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold uppercase tracking-wider text-xs">
        {facts[index].icon} Tech Insights
      </div>
      <p className="text-xl font-light leading-relaxed animate-fade-in text-slate-200">"{facts[index].text}"</p>
      <div className="flex gap-1 mt-4">
        {facts.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700'}`}></div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [view, setView] = useState('LOGIN');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [greeting, setGreeting] = useState('');

  const [policyFile, setPolicyFile] = useState(null);
  const [expenseFile, setExpenseFile] = useState(null);
  const [approvedList, setApprovedList] = useState([]);
  const [rejectedList, setRejectedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username) return alert("Enter a name!");
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setView('GOODBYE');
    setTimeout(() => {
      setApprovedList([]); setRejectedList([]); setPolicyFile(null); setExpenseFile(null); setUsername('');
      setView('LOGIN');
    }, 3000);
  };

  const handleAudit = async () => {
    if (!policyFile || !expenseFile) return alert("Upload both files first.");
    setLoading(true);
    const formData = new FormData();
    formData.append("policy", policyFile);
    formData.append("expenses", expenseFile);

    try {
      const response = await axios.post("http://localhost:8000/run-audit", formData);
      const all = response.data.audit_report;
      setApprovedList(all.filter(r => r.Status === 'APPROVED'));
      setRejectedList(all.filter(r => r.Status === 'REJECTED'));
    } catch (error) {
      console.error(error);
      alert("Backend connection failed.");
    }
    setLoading(false);
  };

  // Real-Time Move Logic
  const moveItem = async (item, fromList, toList, setFrom, setTo, newStatus) => {
    setFrom(prev => prev.filter(i => i !== item));
    const updated = { ...item, Status: newStatus };
    setTo(prev => [updated, ...prev]);
    setSelectedAudit(null);

    // Sync to Backend
    try {
      await axios.put("http://localhost:8000/update-status", {
        employee_id: String(item.EmployeeID),
        amount: parseFloat(item.Amount),
        category: item.Category,
        new_status: newStatus
      });
    } catch (error) {
      console.error("DB Sync Error", error);
    }
  };

  const handlePayment = async (type, amt, id, item) => {
    setActionMessage(type === 'FULL' ? `✅ Transferred $${amt} to #${id}` : `⚠️ Reimbursed limit $${amt} to #${id}`);

    // 1. Optimistic UI Update (Remove from list)
    setSelectedAudit(null); // Close modal first
    if (item.Status === 'APPROVED') {
      setApprovedList(prev => prev.filter(i => i !== item));
    } else {
      setRejectedList(prev => prev.filter(i => i !== item));
    }

    // 2. Sync to Backend
    try {
      await axios.put("http://localhost:8000/update-status", {
        employee_id: String(item.EmployeeID),
        amount: parseFloat(item.Amount),
        category: item.Category,
        new_status: 'REIMBURSED',
        reimbursed_amount: parseFloat(amt)
      });
    } catch (error) {
      console.error("Reimbursement Sync Error", error);
      // Optional: Revert UI if needed, but keeping it simple for now
    }

    setTimeout(() => setActionMessage(null), 3000);
  };

  if (view === 'GOODBYE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white overflow-hidden">
        <Starfield />
        <div className="text-center animate-pulse scale-110 transform transition duration-1000">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(37,99,235,0.5)]">
            <LogOut size={40} className="ml-1" />
          </div>
          <h1 className="text-6xl font-bold mb-4 tracking-tight">Goodbye, {username}</h1>
          <p className="text-slate-400 text-lg">Securely terminating session...</p>
        </div>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-white">
        <Starfield />
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-16 md:gap-32 w-full">
          <div className="hidden md:flex flex-col space-y-8 max-w-lg">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg"><DollarSign size={24} /></div>
                <span className="text-blue-400 font-bold tracking-widest text-sm">DATANEXUS v2.1</span>
              </div>
              <h1 className="text-7xl font-bold leading-tight mb-6">
                Audit <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Intelligence.</span>
              </h1>
              <FactsWidget />
            </div>
          </div>
          <div className="w-full max-w-md glass-panel p-10 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-2">{isSignUp ? "Join DataNexus" : "Welcome Back"}</h2>
              <p className="text-slate-400">{greeting}, please authenticate.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-500" size={20} />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your name" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] flex justify-center items-center gap-2 group">
                {isSignUp ? "Create Account" : "Secure Login"} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            <div className="mt-8 text-center"><button onClick={() => setIsSignUp(!isSignUp)} className="text-slate-400 text-sm hover:text-white transition">{isSignUp ? "Already have an account? Login" : "New to DataNexus? Create Account"}</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans pb-20 selection:bg-blue-500/30">
      <Starfield />
      <nav className="glass sticky top-0 z-40 border-b border-white/5 px-8 py-4 flex justify-between items-center backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/20"><DollarSign className="text-white w-5 h-5" /></div>
          <span className="text-xl font-bold tracking-tight">DataNexus</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"><LogOut size={16} /> Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400">Compliance Control Center</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-10">
            <label className={`group cursor-pointer glass p-8 rounded-2xl border transition-all duration-300 w-full sm:w-64 flex flex-col items-center gap-4 ${policyFile ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-blue-400/30 hover:bg-white/5'}`}>
              <div className={`p-4 rounded-full ${policyFile ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 group-hover:text-blue-400'} transition-colors`}><FileText size={32} /></div>
              <span className={`font-bold block ${policyFile ? 'text-blue-400' : 'text-slate-300'}`}>{policyFile ? "Policy Ready" : "Upload Policy"}</span>
              <input type="file" hidden accept=".pdf" onChange={(e) => setPolicyFile(e.target.files[0])} />
            </label>
            <label className={`group cursor-pointer glass p-8 rounded-2xl border transition-all duration-300 w-full sm:w-64 flex flex-col items-center gap-4 ${expenseFile ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-green-400/30 hover:bg-white/5'}`}>
              <div className={`p-4 rounded-full ${expenseFile ? 'bg-green-500 text-white' : 'bg-white/5 text-slate-400 group-hover:text-green-400'} transition-colors`}><FileSpreadsheet size={32} /></div>
              <span className={`font-bold block ${expenseFile ? 'text-green-400' : 'text-slate-300'}`}>{expenseFile ? "Data Ready" : "Upload Excel"}</span>
              <input type="file" hidden accept=".xlsx" onChange={(e) => setExpenseFile(e.target.files[0])} />
            </label>
          </div>
          <button onClick={handleAudit} disabled={loading} className="group relative inline-flex items-center justify-center px-12 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-full disabled:opacity-50 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            {loading ? "Analyzing Data..." : "Initiate AI Audit"}
          </button>
        </div>

        {/* --- EXPORT ACTION --- */}
        {(approvedList.length > 0 || rejectedList.length > 0) && (
          <div className="flex justify-center mb-8 animate-fade-in">
            <button onClick={() => window.location.href = 'http://localhost:8000/download-excel'}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20 group">
              <Download size={20} className="group-hover:translate-y-1 transition-transform" />
              Download Updated Excel Report
            </button>
          </div>
        )}

        {(approvedList.length > 0 || rejectedList.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-8 animate-fade-in-up pb-20">
            <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[700px] border-t-4 border-t-green-500">
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h3 className="font-bold text-green-400 flex items-center gap-3 text-lg"><CheckCircle size={24} /> Compliant Claims</h3>
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">{approvedList.length} Items</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                {approvedList.map((row, i) => (
                  <div key={i} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-all flex items-center justify-between">
                    <div onClick={() => setSelectedAudit(row)} className="cursor-pointer flex-1">
                      <div className="font-bold text-slate-200">{row.Category}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-2 mt-1"><User size={12} /> #{row.EmployeeID} <span className="text-slate-400 italic">({row.EmployeeTitle})</span> <span className="font-mono text-green-400">${row.Amount}</span></div>
                    </div>
                    <button onClick={() => moveItem(row, approvedList, rejectedList, setApprovedList, setRejectedList, 'REJECTED')} className="opacity-0 group-hover:opacity-100 p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"><ArrowRight size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-[700px] border-t-4 border-t-red-500">
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h3 className="font-bold text-red-400 flex items-center gap-3 text-lg"><XCircle size={24} /> Rejected Claims</h3>
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full">{rejectedList.length} Items</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                {rejectedList.map((row, i) => (
                  <div key={i} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-all flex items-center justify-between">
                    <button onClick={() => moveItem(row, rejectedList, approvedList, setRejectedList, setApprovedList, 'APPROVED')} className="opacity-0 group-hover:opacity-100 p-2 bg-white/5 hover:bg-green-500/20 text-slate-400 hover:text-green-400 rounded-lg transition-all"><ArrowRight className="rotate-180" size={18} /></button>
                    <div onClick={() => setSelectedAudit(row)} className="cursor-pointer flex-1 text-right">
                      <div className="font-bold text-slate-200">{row.Category}</div>
                      <div className="text-xs font-bold text-red-400 mt-0.5">{row.Reason}</div>
                      <div className="text-sm text-slate-500 flex items-center justify-end gap-2 mt-1">#{row.EmployeeID} <span className="text-slate-400 italic">({row.EmployeeTitle})</span> <span className="font-mono text-slate-300">${row.Amount}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedAudit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl transform transition-all scale-100 border border-white/10">
            <div className={`p-8 ${selectedAudit.Status === 'APPROVED' ? 'bg-green-500/10 border-b border-green-500/20' : 'bg-red-500/10 border-b border-red-500/20'} flex justify-between items-start`}>
              <div><span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${selectedAudit.Status === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{selectedAudit.Status}</span><h2 className="text-3xl font-bold mt-3 text-white">{selectedAudit.Category}</h2></div>
              <button onClick={() => setSelectedAudit(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4"><span className="text-slate-400">Employee ID</span><span className="font-mono text-xl text-white">#{selectedAudit.EmployeeID}</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4"><span className="text-slate-400">Transaction Amount</span><span className="font-mono text-3xl font-bold text-white">${selectedAudit.Amount}</span></div>
              {selectedAudit.Status === 'REJECTED' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-red-400 font-bold text-sm mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Violation Detected</h4>
                      <p className="text-slate-300 text-sm">{selectedAudit.Reason}</p>
                      <div className="mt-3 text-xs font-mono text-red-300">MAX LIMIT ALLOWED: ${selectedAudit.LimitUsed}</div>
                    </div>
                    <button
                      onClick={() => alert(`Topic raised with HR for ${selectedAudit.EmployeeName}`)}
                      className="ml-4 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold rounded-lg border border-red-500/30 transition-all flex items-center gap-2"
                    >
                      📢 Escalate to HR
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 pt-4">
                <button onClick={() => handlePayment(selectedAudit.Status === 'APPROVED' ? 'FULL' : 'PARTIAL', selectedAudit.Status === 'APPROVED' ? selectedAudit.Amount : selectedAudit.LimitUsed, selectedAudit.EmployeeID, selectedAudit)} className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition shadow-lg flex justify-center items-center gap-2"><DollarSign size={20} /> {selectedAudit.Status === 'APPROVED' ? 'Initiate Full Transfer' : 'Reimburse Cap Only'}</button>
                <button onClick={() => selectedAudit.Status === 'APPROVED' ? moveItem(selectedAudit, approvedList, rejectedList, setApprovedList, setRejectedList, 'REJECTED') : moveItem(selectedAudit, rejectedList, approvedList, setRejectedList, setApprovedList, 'APPROVED')} className="w-full py-4 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition border border-white/10 flex justify-center items-center gap-2"><ArrowRightLeft size={18} /> Move to {selectedAudit.Status === 'APPROVED' ? 'Rejected' : 'Compliant'}</button>
              </div>
              {actionMessage && (<div className="text-center p-3 bg-green-500/20 text-green-400 rounded-xl text-sm font-bold animate-pulse border border-green-500/30">{actionMessage}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;