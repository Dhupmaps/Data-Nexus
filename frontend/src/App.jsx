import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, FileSpreadsheet, Search, CheckCircle, XCircle,
  AlertTriangle, DollarSign, X, ArrowRightLeft, User, LogOut,
  Lock, ArrowRight, Globe, Zap, Shield, TrendingUp, Download, Check
} from 'lucide-react';

// Ambient Background Component
const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 bg-slate-950 -z-50 overflow-hidden">
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000"></div>
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 mask-image-gradient"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950"></div>
    </div>
  );
};

// Facts Widget Component
const FactsWidget = () => {
  const facts = [
    { icon: <Globe size={16} />, text: "AI Market to hit $407B by 2027." },
    { icon: <Zap size={16} />, text: "DataNexus processes audits 400x faster than humans." },
    { icon: <Shield size={16} />, text: "LangGraph ensures stateful, reliable AI decisions." },
    { icon: <TrendingUp size={16} />, text: "Automated compliance reduces fraud by 90%." }
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % facts.length), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass p-5 rounded-2xl text-white max-w-sm relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold uppercase tracking-wider text-[10px] relative z-10">
        {facts[index].icon} Tech Insights
      </div>
      <p className="text-lg font-light leading-relaxed text-slate-300 relative z-10 transition-all duration-500 min-h-[60px]">
        "{facts[index].text}"
      </p>
      <div className="flex gap-1.5 mt-4 relative z-10">
        {facts.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700/50'}`}></div>
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
    }

    setTimeout(() => setActionMessage(null), 3000);
  };

  if (view === 'GOODBYE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden">
        <AmbientBackground />
        <div className="text-center animate-pulse scale-110 transform transition duration-1000">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(99,102,241,0.5)] rotate-12">
            <LogOut size={40} className="text-white -rotate-12 ml-1" />
          </div>
          <h1 className="text-6xl font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Goodbye, {username}</h1>
          <p className="text-indigo-400 text-lg tracking-wide font-medium">Securely terminating session...</p>
        </div>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-white selection:bg-indigo-500/30">
        <AmbientBackground />
        
        <div className="container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-16 w-full max-w-7xl">
          <div className="hidden lg:flex flex-col space-y-12 max-w-xl z-10">
            <div className="animate-float">
              <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md">
                <Zap size={16} className="text-indigo-400" />
                <span className="text-indigo-300 font-bold tracking-widest text-xs uppercase">DATANEXUS v2.1</span>
              </div>
              <h1 className="text-6xl xl:text-8xl font-bold leading-[1.1] mb-6 tracking-tight">
                Audit <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-blue-400 drop-shadow-lg">
                  Intelligence.
                </span>
              </h1>
              <p className="text-xl text-slate-400 font-light mb-10 max-w-md">
                Next-generation automated compliance and expense auditing powered by LangGraph AI.
              </p>
              <FactsWidget />
            </div>
          </div>

          <div className="w-full max-w-[440px] z-10 group">
            <div className="glass-panel p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_80px_rgba(79,70,229,0.15)] hover:border-indigo-500/30">
              {/* Dynamic decorative light */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="text-center mb-10 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
                  <Lock className="text-white" size={28} />
                </div>
                <h2 className="text-3xl font-bold mb-2 tracking-tight text-white">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                <p className="text-indigo-200/60 font-medium text-sm">{greeting}, please authenticate.</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                <div className="space-y-2 group/input">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within/input:text-indigo-400">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 text-slate-500 transition-colors group-focus-within/input:text-indigo-400" size={18} />
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Enter your identifier" 
                      className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner backdrop-blur-sm" 
                    />
                  </div>
                </div>
                
                <button className="w-full relative group/btn overflow-hidden bg-white text-slate-900 font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] flex justify-center items-center gap-2 mt-4">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {isSignUp ? "Register Identity" : "Secure Authentication"} 
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </button>
              </form>
              
              <div className="mt-8 text-center relative z-10 border-t border-slate-800 pt-6">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-slate-400 text-sm hover:text-indigo-300 transition-colors font-medium">
                  {isSignUp ? "Already authorized? Sign In" : "Need access? Request Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24 selection:bg-indigo-500/30">
      <AmbientBackground />
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-shadow">
              <DollarSign className="text-white w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block">DataNexus</span>
              <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold block -mt-1">Enterprise Audit</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800/50 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-medium text-slate-300">System Online</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
              <LogOut size={16} /> <span className="hidden sm:inline">Terminate</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-16">
        {/* Hero Section for Dashboard */}
        <div className="text-center mb-16 animate-float" style={{ animationDuration: '8s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <Zap size={14} /> Workflow Active
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-slate-400">
            Compliance Command Center
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Upload your corporate policy and expense reports to initiate the AI-driven automated auditing process.
          </p>
        </div>

        {/* Upload Widgets */}
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12 relative z-10">
          <label className={`group cursor-pointer glass-card p-8 rounded-3xl transition-all duration-300 w-full md:w-80 flex flex-col items-center gap-5 text-center ${policyFile ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]'}`}>
            <div className={`p-5 rounded-2xl transition-all duration-300 ${policyFile ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30 scale-110 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:scale-105'}`}>
              <FileText size={32} strokeWidth={1.5} />
            </div>
            <div>
              <span className={`text-lg font-bold block mb-1 ${policyFile ? 'text-indigo-400' : 'text-slate-200'}`}>
                {policyFile ? policyFile.name : "Corporate Policy"}
              </span>
              <span className="text-xs text-slate-500 font-medium">{policyFile ? 'Document Loaded' : 'Upload PDF Document'}</span>
            </div>
            <input type="file" hidden accept=".pdf" onChange={(e) => setPolicyFile(e.target.files[0])} />
            {policyFile && <div className="absolute top-4 right-4 text-indigo-400"><CheckCircle size={20} /></div>}
          </label>

          <label className={`group cursor-pointer glass-card p-8 rounded-3xl transition-all duration-300 w-full md:w-80 flex flex-col items-center gap-5 text-center ${expenseFile ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]'}`}>
            <div className={`p-5 rounded-2xl transition-all duration-300 ${expenseFile ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-110 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:scale-105'}`}>
              <FileSpreadsheet size={32} strokeWidth={1.5} />
            </div>
            <div>
              <span className={`text-lg font-bold block mb-1 ${expenseFile ? 'text-emerald-400' : 'text-slate-200'}`}>
                {expenseFile ? expenseFile.name : "Expense Ledger"}
              </span>
              <span className="text-xs text-slate-500 font-medium">{expenseFile ? 'Data Loaded' : 'Upload XLSX Dataset'}</span>
            </div>
            <input type="file" hidden accept=".xlsx" onChange={(e) => setExpenseFile(e.target.files[0])} />
            {expenseFile && <div className="absolute top-4 right-4 text-emerald-400"><CheckCircle size={20} /></div>}
          </label>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-20 relative z-10">
          <button 
            onClick={handleAudit} 
            disabled={loading || !policyFile || !expenseFile} 
            className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white transition-all duration-300 bg-white/5 backdrop-blur-md border border-white/10 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/20 overflow-hidden shadow-2xl"
          >
            {/* Button Highlight Effect */}
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-300 ${(policyFile && expenseFile && !loading) ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <span className="relative z-10 flex items-center gap-3">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Neural Analysis in Progress...
                </>
              ) : (
                <>
                  <Zap size={22} className={`${(policyFile && expenseFile) ? 'text-indigo-200' : 'text-slate-400'}`} fill="currentColor" />
                  Initiate AI Audit
                </>
              )}
            </span>
          </button>
        </div>

        {/* --- EXPORT ACTION --- */}
        {(approvedList.length > 0 || rejectedList.length > 0) && (
          <div className="flex justify-between items-end mb-6 animate-fade-in relative z-10">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-2">Audit Results</h3>
              <p className="text-slate-400 text-sm">Review AI categorization and take action.</p>
            </div>
            <button onClick={() => window.location.href = 'http://localhost:8000/download-excel'}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-indigo-500/10 group backdrop-blur-md">
              <Download size={16} className="group-hover:-translate-y-0.5 transition-transform text-indigo-400" />
              Export Final Report
            </button>
          </div>
        )}

        {/* Results Grid */}
        {(approvedList.length > 0 || rejectedList.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-8 animate-fade-in-up pb-20 relative z-10">
            
            {/* Compliant Column */}
            <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col h-[750px] shadow-2xl border-t border-t-emerald-500/50 group">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
              <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <CheckCircle className="text-emerald-400" size={20} />
                  </div>
                  <h3 className="font-bold text-white text-lg tracking-tight">Compliant Claims</h3>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {approvedList.length} Items
                </div>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar flex-1 relative z-10">
                {approvedList.map((row, i) => (
                  <div key={i} className="group/item p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex items-center justify-between shadow-sm cursor-pointer">
                    <div onClick={() => setSelectedAudit(row)} className="flex-1 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {row.EmployeeName ? row.EmployeeName.charAt(0) : <User size={16}/>}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm mb-0.5">{row.Category}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="text-slate-400">#{row.EmployeeID}</span> 
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="truncate max-w-[120px]">{row.EmployeeTitle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                        ${row.Amount}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); moveItem(row, approvedList, rejectedList, setApprovedList, setRejectedList, 'REJECTED'); }} className="opacity-0 group-hover/item:opacity-100 p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl transition-all shadow-sm">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {approvedList.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-50">
                    <CheckCircle size={48} strokeWidth={1} />
                    <p>No compliant claims found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejected Column */}
            <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col h-[750px] shadow-2xl border-t border-t-rose-500/50 group">
              <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none"></div>
              <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <XCircle className="text-rose-400" size={20} />
                  </div>
                  <h3 className="font-bold text-white text-lg tracking-tight">Violations Detected</h3>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {rejectedList.length} Items
                </div>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar flex-1 relative z-10">
                {rejectedList.map((row, i) => (
                  <div key={i} className="group/item p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all flex items-center justify-between shadow-sm cursor-pointer">
                    <button onClick={(e) => { e.stopPropagation(); moveItem(row, rejectedList, approvedList, setRejectedList, setApprovedList, 'APPROVED'); }} className="opacity-0 group-hover/item:opacity-100 p-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/30 rounded-xl transition-all shadow-sm">
                      <ArrowRight className="rotate-180" size={16} />
                    </button>
                    
                    <div onClick={() => setSelectedAudit(row)} className="flex-1 flex items-center justify-end gap-4 ml-2">
                      <div className="text-right">
                        <div className="font-bold text-slate-200 text-sm mb-1">{row.Category}</div>
                        <div className="text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 inline-block mb-1 max-w-[200px] truncate">
                          {row.Reason}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center justify-end gap-2">
                          <span className="text-slate-400">#{row.EmployeeID}</span> 
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center text-rose-400 shrink-0">
                        <span className="text-[10px] font-mono leading-none mt-1">$</span>
                        <span className="text-sm font-mono font-bold leading-none">{row.Amount}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {rejectedList.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-50">
                    <Shield size={48} strokeWidth={1} />
                    <p>No policy violations detected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity animate-fade-in"></div>
          
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden animate-float" style={{ animationDuration: '10s' }}>
            {/* Modal Header */}
            <div className={`p-8 relative overflow-hidden ${selectedAudit.Status === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              {/* Background gradient flare */}
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full mix-blend-screen filter blur-[80px] opacity-40 translate-x-1/2 -translate-y-1/2 ${selectedAudit.Status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border mb-4 ${selectedAudit.Status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                    {selectedAudit.Status === 'APPROVED' ? <Check size={12} /> : <X size={12} />}
                    {selectedAudit.Status}
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{selectedAudit.Category}</h2>
                  <p className="text-slate-400 mt-2 flex items-center gap-2 text-sm">
                    <User size={14} /> Employee #{selectedAudit.EmployeeID} • {selectedAudit.EmployeeTitle || 'Unknown Role'}
                  </p>
                </div>
                <button onClick={() => setSelectedAudit(null)} className="p-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors border border-slate-700/50">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              
              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-white/5 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Claim Amount</span>
                  <span className="font-mono text-3xl font-bold text-white flex items-center gap-1">
                    <span className="text-slate-500 text-xl">$</span>{selectedAudit.Amount}
                  </span>
                </div>
                <div className="bg-slate-800/40 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Policy Limit</span>
                  <span className="font-mono text-3xl font-bold text-slate-300 flex items-center gap-1">
                    <span className="text-slate-600 text-xl">$</span>{selectedAudit.LimitUsed || 'N/A'}
                  </span>
                  {selectedAudit.Status === 'REJECTED' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400 border border-rose-500/20">
                      <AlertTriangle size={20} />
                    </div>
                  )}
                </div>
              </div>

              {/* Violation Details */}
              {selectedAudit.Status === 'REJECTED' && (
                <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl">
                  <h4 className="text-rose-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <Shield size={16} /> AI Policy Assessment
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {selectedAudit.Reason}
                  </p>
                  <button
                    onClick={() => alert(`Escalation protocol initiated for ${selectedAudit.EmployeeName || 'Employee #' + selectedAudit.EmployeeID}`)}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all flex items-center gap-2 w-max"
                  >
                    📢 Escalate to Human Resources
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => handlePayment(selectedAudit.Status === 'APPROVED' ? 'FULL' : 'PARTIAL', selectedAudit.Status === 'APPROVED' ? selectedAudit.Amount : selectedAudit.LimitUsed, selectedAudit.EmployeeID, selectedAudit)} 
                  className={`w-full py-4 text-white rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2 relative overflow-hidden group ${selectedAudit.Status === 'APPROVED' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'}`}
                >
                  <DollarSign size={18} /> 
                  {selectedAudit.Status === 'APPROVED' ? 'Authorize Full Disbursement' : 'Authorize Partial Reimbursement'}
                </button>
                
                <button 
                  onClick={() => selectedAudit.Status === 'APPROVED' ? moveItem(selectedAudit, approvedList, rejectedList, setApprovedList, setRejectedList, 'REJECTED') : moveItem(selectedAudit, rejectedList, approvedList, setRejectedList, setApprovedList, 'APPROVED')} 
                  className="w-full py-3.5 bg-transparent text-slate-400 hover:text-white rounded-xl font-bold hover:bg-slate-800 transition-colors border border-slate-700/50 flex justify-center items-center gap-2"
                >
                  <ArrowRightLeft size={16} /> Override AI Classification to {selectedAudit.Status === 'APPROVED' ? 'Rejected' : 'Compliant'}
                </button>
              </div>

              {/* Notification Toast */}
              {actionMessage && (
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-bold animate-pulse border border-emerald-500/20 flex items-center justify-center gap-2 backdrop-blur-md">
                  <CheckCircle size={16} /> {actionMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
