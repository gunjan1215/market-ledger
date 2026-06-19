import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Trash2, 
  Download, 
  Upload, 
  Plus, 
  RotateCcw, 
  Settings, 
  Activity, 
  LayoutDashboard, 
  User, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Search,
  ArrowUpDown,
  Filter,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TransactionType, CurrencyCode, CURRENCIES, UserProfile } from './types';
import { DEMO_TRANSACTIONS } from './constants';
import PerformanceChart from './components/PerformanceChart';

export default function App() {
  // -----------------------------------------
  // 1. Persistence & State Initialization
  // -----------------------------------------
  
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'settings'>('dashboard');

  // Transactions State
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Currency State
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('market_ledger_currency');
    return (saved as CurrencyCode) || 'INR';
  });

  // User Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('market_ledger_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignored
      }
    }
    return {
      name: 'Rathigp',
      experience: 'Professional',
      targetMonthlyProfit: 50000
    };
  });

  // Form Adding Fields
  const [formType, setFormType] = useState<TransactionType>('profit');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formNote, setFormNote] = useState<string>('');
  
  // Feedback indicator
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);

  // Activity Tab filter mechanisms
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [activitySort, setActivitySort] = useState<string>('date-desc');
  const [activityStartDate, setActivityStartDate] = useState<string>('');
  const [activityEndDate, setActivityEndDate] = useState<string>('');

  // Diagnostic state modifiers
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch(`${API_URL}/transactions`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error('Failed to load transactions', error);
      }
    };
    loadTransactions();
  }, []);

  useEffect(() => {
    localStorage.setItem('market_ledger_currency', selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    localStorage.setItem('market_ledger_profile', JSON.stringify(profile));
  }, [profile]);

  // Current currency configuration
  const currentCurrency = useMemo(() => {
    return CURRENCIES[selectedCurrency] || CURRENCIES.INR;
  }, [selectedCurrency]);

  // -----------------------------------------
  // 2. Metric Syntheses (Financial Math)
  // -----------------------------------------
  const financialMetrics = useMemo(() => {
    let totalProfit = 0;
    let totalLoss = 0;
    let totalInvested = 0;
    let totalWithdrawn = 0;

    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'profit') totalProfit += amt;
      else if (t.type === 'loss') totalLoss += amt;
      else if (t.type === 'capital') totalInvested += amt;
      else if (t.type === 'withdraw') totalWithdrawn += amt;
    });

    const netPL = totalProfit - totalLoss;
    const walletBalance = (totalInvested + totalProfit) - (totalWithdrawn + totalLoss);

    return {
      totalProfit,
      totalLoss,
      totalInvested,
      totalWithdrawn,
      netPL,
      walletBalance,
    };
  }, [transactions]);

  // -----------------------------------------
  // 3. Activity Filter logic
  // -----------------------------------------
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by type
    if (activityFilter !== 'all') {
      result = result.filter(t => t.type === activityFilter);
    }

    // Filter by search query
    if (activitySearch.trim() !== '') {
      const query = activitySearch.toLowerCase();
      result = result.filter(t => 
        (t.note && t.note.toLowerCase().includes(query)) ||
        t.type.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    }

    // Date range filters
    if (activityStartDate) {
      result = result.filter(t => t.date >= activityStartDate);
    }
    if (activityEndDate) {
      result = result.filter(t => t.date <= activityEndDate);
    }

    // Simple sorting
    result.sort((a, b) => {
      if (activitySort === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (activitySort === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (activitySort === 'amount-desc') {
        return b.amount - a.amount;
      } else if (activitySort === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return result;
  }, [transactions, activityFilter, activitySearch, activitySort, activityStartDate, activityEndDate]);

  // -----------------------------------------
  // 4. Input record submission
  // -----------------------------------------
  const handleAddRecord = async (e: React.FormEvent) => {
  e.preventDefault();

  const amountNum = parseFloat(formAmount);

  if (isNaN(amountNum) || amountNum <= 0) return;

  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    type: formType,
    amount: amountNum,
    date: formDate,
    note: formNote.trim() ? formNote.trim() : undefined
  };

  try {
    const response = await fetch(
      'http://localhost:5000/transactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTx)
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save transaction');
    }

    // Reload transactions from database
    const refreshed = await fetch(
      'http://localhost:5000/transactions'
    );

    const data = await refreshed.json();

    setTransactions(data);

    setShowSavedFeedback(true);
    setFormAmount('');
    setFormNote('');
    setFormDate(new Date().toISOString().split('T')[0]);

    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 1500);

  } catch (error) {
    console.error('Failed to save transaction:', error);
    alert('Failed to save transaction to database.');
  }
  };

  const handleDeleteRecord = async (id: string) => {
  try {
    const response = await fetch(
      `http://localhost:5000/transactions/${id}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete transaction');
    }

    // Reload from database
    const refreshed = await fetch(
      'http://localhost:5000/transactions'
    );

    const data = await refreshed.json();

    setTransactions(data);

  } catch (error) {
    console.error('Delete failed:', error);
    alert('Failed to delete transaction.');
  }
  };

  // -----------------------------------------
  // 4b. CSV and JSON Data Utilities
  // -----------------------------------------
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Your portfolio does not have any records to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,ID,Date,Transaction Type,Amount,Note\n';
    transactions.forEach(t => {
      const sanitizedNote = t.note ? t.note.replace(/"/g, '""') : '';
      csvContent += `"${t.id}","${t.date}","${t.type}",${t.amount},"${sanitizedNote}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Market_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `market_ledger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    setImportError(null);
    setImportSuccess(false);

    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            // validate keys
            const isValid = parsed.every(item => 
              typeof item.id === 'string' &&
              ['profit', 'loss', 'capital', 'withdraw'].includes(item.type) &&
              typeof item.amount === 'number' &&
              typeof item.date === 'string'
            );

            if (isValid) {
              setTransactions(parsed);
              setImportSuccess(true);
            } else {
              setImportError('Failed validation: Items do not match ledger schema rules.');
            }
          } else {
            setImportError('File format issue: Root element must be a transactions matrix.');
          }
        } catch (error) {
          setImportError('Syntax error: This file is not a valid JSON structure.');
        }
      };
    }
  };

  const restoreDemoLedger = () => {
    setTransactions(DEMO_TRANSACTIONS);
    alert('Demo ledger re-populated with 8 historical logs.');
  };

  const clearAllLedgerData = () => {
    setTransactions([]);
    setShowClearConfirm(false);
  };

  // -----------------------------------------
  // 5. Utility formatting
  // -----------------------------------------
  const formatMoney = (val: number) => {
    return val.toLocaleString(currentCurrency.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatRawValue = (val: number) => {
    return Math.abs(val).toLocaleString(currentCurrency.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Helper labels for the pill style
  const getPillMarkup = (type: TransactionType) => {
    switch (type) {
      case 'profit':
        return {
          label: 'Profit (+)',
          classes: 'bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1'
        };
      case 'loss':
        return {
          label: 'Loss (-)',
          classes: 'bg-secondary/15 text-secondary border border-secondary/20 px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1'
        };
      case 'capital':
        return {
          label: 'Capital',
          classes: 'bg-tertiary/15 text-tertiary border border-tertiary/20 px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1'
        };
      case 'withdraw':
        return {
          label: 'Withdraw',
          classes: 'bg-surface-container-highest text-on-surface-variant border border-outline-variant px-2.5 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1'
        };
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24 md:pb-8 flex flex-col font-sans selection:bg-primary-container selection:text-on-primary-container">
      
      {/* 1. Header Toolbar */}
      <header className="w-full top-0 sticky z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-4 md:px-12 h-16 shadow-lg shadow-surface-container-lowest/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
            <Wallet className="text-primary w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="font-bold text-lg md:text-xl text-primary tracking-tight font-sans">Market Ledger</h1>
            <span className="text-[10px] text-on-surface-variant font-mono tracking-wider block -mt-1 uppercase">Pro Terminal</span>
          </div>
        </div>

        {/* Desktop Navigation Link Tabs */}
        <div className="hidden md:flex gap-8 items-center">
          <nav className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/15' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg transition-all ${
                activeTab === 'activity' 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/15' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity Logs
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-lg transition-all ${
                activeTab === 'settings' 
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/15' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>
          
          <div className="h-6 w-px bg-outline-variant/60"></div>
          
          <div className="flex items-center gap-2 bg-surface-container-high/80 border border-outline-variant px-3 py-1.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center uppercase">
              {profile.name.charAt(0)}
            </div>
            <span className="text-xs font-bold text-on-surface">{profile.name}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Frame */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 md:px-12 py-6 flex flex-col gap-6">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {/* Massive Hero Core Trading Summary Card */}
              <section id="performance-hero" className="w-full">
                <div className="relative overflow-hidden rounded-2xl border border-outline-variant p-6 md:p-8 transition-all duration-300 bg-surface-container flex flex-col justify-center min-h-[200px]">
                  {/* High visual left border block decoration */}
                  <div className={`absolute top-0 left-0 w-2.5 h-full ${
                    financialMetrics.netPL >= 0 ? 'bg-primary' : 'bg-secondary'
                  }`}></div>
                  
                  <h2 className="text-xs md:text-sm font-bold text-on-surface-variant tracking-wider uppercase font-sans mb-1">
                    Overall Trading Performance
                  </h2>
                  
                  <div className="flex items-baseline gap-1 md:gap-3 flex-wrap">
                    <span className={`font-mono text-5xl md:text-7xl font-bold tracking-tight ${
                      financialMetrics.netPL >= 0 ? 'text-primary' : 'text-secondary'
                    }`}>
                      {financialMetrics.netPL >= 0 ? '+' : '-'}
                    </span>
                    <span className={`font-mono text-5xl md:text-7xl font-bold tracking-tight ${
                      financialMetrics.netPL >= 0 ? 'text-primary' : 'text-secondary'
                    }`}>
                      {formatRawValue(financialMetrics.netPL)}
                    </span>
                    <span className={`text-2xl md:text-4xl font-bold font-mono ml-1.5 ${
                      financialMetrics.netPL >= 0 ? 'text-primary' : 'text-secondary'
                    }`}>
                      {currentCurrency.symbol}
                    </span>
                  </div>

                  <p className="text-sm md:text-base text-on-surface-variant mt-2 font-medium">
                    Current Absolute Net Profits / Loss Drawdowns Status
                  </p>
                </div>
              </section>

              {/* Grid representation of metrics values */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-grid">
                {/* 1. Total Invested */}
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-tertiary" />
                      <span className="text-sm font-bold tracking-wide">Total Capital Invested</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface tracking-tight font-mono mt-1">
                    {currentCurrency.symbol}{formatMoney(financialMetrics.totalInvested)}
                  </div>
                </div>

                {/* 2. Total Withdrawn */}
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-bold tracking-wide">Total Capital Withdrawn</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface tracking-tight font-mono mt-1">
                    {currentCurrency.symbol}{formatMoney(financialMetrics.totalWithdrawn)}
                  </div>
                </div>

                {/* 3. Safe Wallet Balance */}
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Wallet className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold tracking-wide">Ledger Balance Equity</span>
                    </div>
                    {financialMetrics.walletBalance < 0 && (
                      <span className="bg-red-500/10 text-rose-300 border border-red-500/20 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase inline">
                        Overdraw
                      </span>
                    )}
                  </div>
                  <div className={`text-4xl font-bold tracking-tight font-mono mt-1 ${
                    financialMetrics.walletBalance >= 0 ? "text-primary" : "text-secondary"
                  }`}>
                    {currentCurrency.symbol}{formatMoney(financialMetrics.walletBalance)}
                  </div>
                </div>
              </section>

              {/* Performance Trend SVG Chart */}
              <PerformanceChart transactions={transactions} currency={currentCurrency} />

              {/* Bento Grid layout containing Quick Enter form & Recent Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Form: Add New Record */}
                <section className="lg:col-span-5 bg-surface-container-high border border-outline-variant rounded-xl p-5 h-fit">
                  <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
                    <h3 className="font-bold text-lg text-on-surface">Add New Record</h3>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold font-mono px-2 py-0.5 rounded uppercase">
                      Live Input
                    </span>
                  </div>

                  <form onSubmit={handleAddRecord} className="flex flex-col gap-4" id="record-form">
                    
                    {/* Transaction Type select option */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="transaction-type">
                        Transaction Type
                      </label>
                      <div className="relative">
                        <select 
                          className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-sm font-semibold text-on-surface focus:border-primary focus:ring-0 cursor-pointer appearance-none" 
                          id="transaction-type"
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as TransactionType)}
                        >
                          <option value="profit">Profit (+)</option>
                          <option value="loss">Loss (-)</option>
                          <option value="capital">Add Capital (+)</option>
                          <option value="withdraw">Withdraw Capital (-)</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-on-surface-variant">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Numeric Amount */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="amount">
                        Amount ({currentCurrency.symbol})
                      </label>
                      <div className="relative">
                        <input 
                          className="w-full bg-surface border border-outline-variant rounded-lg h-12 pl-4 pr-12 font-mono text-xl text-on-surface focus:border-primary focus:ring-0 placeholder:text-on-surface-variant/40" 
                          id="amount" 
                          placeholder="0.00" 
                          required 
                          step="0.01" 
                          min="0.01"
                          type="number"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-sm font-mono font-bold text-disabled">
                          {currentCurrency.code}
                        </div>
                      </div>
                    </div>

                    {/* Record Select Date */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="record-date">
                        Record Date
                      </label>
                      <input 
                        className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-sm text-on-surface focus:border-primary focus:ring-0" 
                        id="record-date" 
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>

                    {/* Transaction description/comment descriptor */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="record-note">
                        Trade Note / Description (Optional)
                      </label>
                      <input 
                        className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-sm text-on-surface focus:border-primary focus:ring-0 placeholder:text-on-surface-variant/30" 
                        id="record-note" 
                        placeholder="e.g. Stock index binary calls breakout trade"
                        type="text"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                      />
                    </div>

                    <button 
                      className={`mt-2 h-14 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        showSavedFeedback 
                          ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                          : 'bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary shadow-md shadow-primary-container/10'
                      }`}
                      type="submit"
                    >
                      {showSavedFeedback ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Record Saved Successfully!
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Save Ledger Record
                        </>
                      )}
                    </button>
                  </form>
                </section>

                {/* Right Lists: Recent Transactions table */}
                <section className="lg:col-span-7 bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
                      <div>
                        <h3 className="font-bold text-lg text-on-surface">Recent Logs</h3>
                        <p className="text-xs text-on-surface-variant">Last transactions recorded on ledger</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleExportCSV}
                          className="flex items-center gap-1.5 bg-surface-container-highest hover:bg-surface-bright text-on-surface px-3 py-1.5 rounded-lg transition-colors border border-outline-variant text-xs font-bold"
                          title="Export all data to CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
                          <tr>
                            <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Date</th>
                            <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Type</th>
                            <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                            <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60" id="transaction-history">
                          {transactions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-on-surface-variant opacity-80">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <AlertTriangle className="w-8 h-8 text-secondary/70 stroke-[1.5]" />
                                  <p className="font-semibold text-sm">No ledger entries registered.</p>
                                  <p className="text-xs text-on-surface-variant/70">Fill out the quick entry form to populate.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            transactions.slice(0, 5).map((t) => {
                              const styleData = getPillMarkup(t.type);
                              const isLossOrWithdraw = t.type === 'loss' || t.type === 'withdraw';
                              return (
                                <tr key={t.id} className="hover:bg-surface-container-high/40 transition-colors">
                                  <td className="px-5 py-4 text-xs font-medium text-on-surface font-mono whitespace-nowrap">
                                    {t.date}
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={styleData.classes}>
                                      {styleData.label}
                                    </span>
                                    {t.note && (
                                      <span className="block text-[11px] text-on-surface-variant/80 font-sans mt-0.5 max-w-[160px] truncate" title={t.note}>
                                        {t.note}
                                      </span>
                                    )}
                                  </td>
                                  <td className={`px-5 py-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                                    isLossOrWithdraw ? 'text-secondary' : 'text-primary'
                                  }`}>
                                    {isLossOrWithdraw ? '-' : '+'}{currentCurrency.symbol}{t.amount.toLocaleString(currentCurrency.locale)}
                                  </td>
                                  <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <button 
                                      onClick={() => handleDeleteRecord(t.id)} 
                                      className="text-on-surface-variant hover:text-secondary p-1.5 rounded-lg hover:bg-secondary/10 transition-colors"
                                      title="Delete transaction entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {transactions.length > 5 && (
                    <div className="p-4 border-t border-outline-variant bg-surface-container-low/30 text-center">
                      <button 
                        onClick={() => setActiveTab('activity')}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Showing 5 of {transactions.length} items. View full detailed logs inside Activity Tab ➜
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          )}

          {/* TAB 2: DETAILED ACTIVITY LOGS */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              
              {/* Detailed search & filter controls */}
              <section className="bg-surface-container border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg text-on-surface">Explore Portfolio Ledger</h3>
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant font-mono">
                    {filteredTransactions.length} of {transactions.length} Matches
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search Description input */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search note or description..." 
                      className="w-full bg-surface border border-outline-variant rounded-lg h-11 pl-9 pr-4 text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-0"
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                    />
                  </div>

                  {/* Filter Type selects */}
                  <div>
                    <select 
                      className="w-full bg-surface border border-outline-variant rounded-lg h-11 px-4 text-xs font-semibold text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                    >
                      <option value="all">All Transactions</option>
                      <option value="profit">Only Profits (+)</option>
                      <option value="loss">Only Losses (-)</option>
                      <option value="capital">Only Deposits/Capital (+)</option>
                      <option value="withdraw">Only Withdrawals (-)</option>
                    </select>
                  </div>

                  {/* Sorting methods */}
                  <div>
                    <select 
                      className="w-full bg-surface border border-outline-variant rounded-lg h-11 px-4 text-xs font-semibold text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
                      value={activitySort}
                      onChange={(e) => setActivitySort(e.target.value)}
                    >
                      <option value="date-desc">Newest Recorded First</option>
                      <option value="date-asc">Oldest Recorded First</option>
                      <option value="amount-desc">High Value Outstanding</option>
                      <option value="amount-asc">Low Value Outstanding</option>
                    </select>
                  </div>

                  {/* Export CSV Utility Shortcut */}
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportCSV}
                      className="w-full h-11 flex items-center justify-center gap-1.5 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary text-xs font-bold rounded-lg transition-all shadow-md shadow-primary-container/5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Spreadsheet CSV
                    </button>
                  </div>
                </div>

                {/* Additional advanced Date filters */}
                <div className="flex flex-wrap items-center gap-4 bg-surface-container-low/50 p-3 rounded-lg border border-outline-variant/60">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Filter by Date Range:
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      className="bg-surface border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface font-mono"
                      value={activityStartDate}
                      onChange={(e) => setActivityStartDate(e.target.value)}
                    />
                    <span className="text-xs text-on-surface-variant">to</span>
                    <input 
                      type="date" 
                      className="bg-surface border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface font-mono"
                      value={activityEndDate}
                      onChange={(e) => setActivityEndDate(e.target.value)}
                    />
                  </div>
                  {(activityStartDate || activityEndDate || activitySearch) && (
                    <button 
                      onClick={() => {
                        setActivityStartDate('');
                        setActivityEndDate('');
                        setActivitySearch('');
                        setActivityFilter('all');
                      }}
                      className="text-xs font-bold text-secondary hover:underline cursor-pointer ml-auto"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              </section>

              {/* Detailed Performance Statistics row */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <span className="text-xs text-on-surface-variant font-bold block uppercase tracking-wider">Entries Count</span>
                  <span className="text-2xl font-bold font-mono text-on-surface block mt-1">{filteredTransactions.length}</span>
                </div>
                
                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <span className="text-xs text-on-surface-variant font-bold block uppercase tracking-wider">Average Gain Size</span>
                  <span className="text-2xl font-bold font-mono text-primary block mt-1">
                    {currentCurrency.symbol}
                    {(() => {
                      const gains = filteredTransactions.filter(t => t.type === 'profit');
                      if (gains.length === 0) return 0;
                      return Math.round(gains.reduce((sum, g) => sum + g.amount, 0) / gains.length).toLocaleString();
                    })()}
                  </span>
                </div>

                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <span className="text-xs text-on-surface-variant font-bold block uppercase tracking-wider">Average Drawdown</span>
                  <span className="text-2xl font-bold font-mono text-secondary block mt-1">
                    {currentCurrency.symbol}
                    {(() => {
                      const drawdowns = filteredTransactions.filter(t => t.type === 'loss');
                      if (drawdowns.length === 0) return 0;
                      return Math.round(drawdowns.reduce((sum, l) => sum + l.amount, 0) / drawdowns.length).toLocaleString();
                    })()}
                  </span>
                </div>

                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <span className="text-xs text-on-surface-variant font-bold block uppercase tracking-wider">Target Status</span>
                  <span className="text-2xl font-bold block mt-1 select-none">
                    {financialMetrics.netPL >= profile.targetMonthlyProfit ? (
                      <span className="text-primary text-xs bg-primary/10 border border-primary/25 px-2 py-1 rounded font-bold uppercase">Goal Reached</span>
                    ) : (
                      <span className="text-on-surface-variant text-xs bg-surface-container-high border border-outline-variant px-2 py-1 rounded font-bold">
                        {Math.min(100, Math.max(0, Math.round((financialMetrics.netPL / profile.targetMonthlyProfit) * 100)))}% computed
                      </span>
                    )}
                  </span>
                </div>
              </section>

              {/* Comprehensive logs view */}
              <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-sans">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Type category</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Trading Note Detail</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Delete Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-on-surface-variant/70">
                            <span className="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/50">history</span>
                            <p className="font-semibold text-sm">No transaction matches identified.</p>
                            <p className="text-xs text-on-surface-variant/50 mt-1">Try to broaden your filters or search keywords.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t) => {
                          const stateTheme = getPillMarkup(t.type);
                          const isLossOrWithdraw = t.type === 'loss' || t.type === 'withdraw';
                          return (
                            <tr key={t.id} className="hover:bg-surface-container-high/40 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold font-mono text-on-surface">
                                {t.date}
                              </td>
                              <td className="px-6 py-4">
                                <span className={stateTheme.classes}>
                                  {stateTheme.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-on-surface-variant">
                                {t.note ? t.note : '—'}
                              </td>
                              <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${
                                isLossOrWithdraw ? 'text-secondary' : 'text-primary'
                              }`}>
                                {isLossOrWithdraw ? '-' : '+'}{currentCurrency.symbol}{t.amount.toLocaleString(currentCurrency.locale)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteRecord(t.id)}
                                  className="text-on-surface-variant hover:text-secondary p-1.5 rounded-lg hover:bg-secondary/15 transition-colors cursor-pointer"
                                  title="Delete transaction log permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

            </motion.div>
          )}

          {/* TAB 3: SYSTEM SETTINGS AND DATA PORTABILITY */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6"
            >
              
              {/* Profile Config Column */}
              <section className="md:col-span-6 bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-6">
                <div>
                  <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                    <User className="text-primary w-5 h-5" />
                    Trader Profile Configuration
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">Configure workspace names and investment thresholds</p>
                </div>

                <div className="flex flex-col gap-4">
                  
                  {/* Trader Display name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Trader Display Name
                    </label>
                    <input 
                      type="text"
                      className="bg-surface border border-outline-variant rounded-lg h-12 px-4 text-sm text-on-surface focus:border-primary focus:ring-0"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Level experience tier select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Experience Segment
                    </label>
                    <select
                      className="bg-surface border border-outline-variant rounded-lg h-12 px-4 text-sm font-semibold text-on-surface focus:border-primary focus:ring-0 cursor-pointer"
                      value={profile.experience}
                      onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value as any }))}
                    >
                      <option value="Beginner">Beginner Portfolio</option>
                      <option value="Intermediate">Intermediate Derivative Trader</option>
                      <option value="Professional">Professional Account Manager</option>
                    </select>
                  </div>

                  {/* Target monthly threshold */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Target Monthly Net Profit ({currentCurrency.symbol})
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        className="w-full bg-surface border border-outline-variant rounded-lg h-12 pl-4 pr-12 font-mono text-sm text-on-surface focus:border-primary focus:ring-0"
                        value={profile.targetMonthlyProfit}
                        onChange={(e) => setProfile(prev => ({ ...prev, targetMonthlyProfit: Number(e.target.value) || 0 }))}
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-xs font-bold text-on-surface-variant">
                        Target Value
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/60 flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-on-surface block">Your monthly milestone target:</span>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                        Currently set to <span className="font-mono text-primary font-bold">{currentCurrency.symbol}{profile.targetMonthlyProfit.toLocaleString()}</span>. This value is computed in your activity dashboard filters to verify portfolio target completion.
                      </p>
                    </div>
                  </div>

                </div>
              </section>

              {/* System Prefs & Backup Column */}
              <section className="md:col-span-6 flex flex-col gap-6">
                
                {/* 1. Currency choices */}
                <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">System Currency Presets</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Select the system base trading currency denomination</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(CURRENCIES).map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setSelectedCurrency(curr.code)}
                        className={`p-3.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          selectedCurrency === curr.code
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface hover:bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest">{curr.code}</span>
                        <span className="text-xl font-bold font-mono">{curr.symbol} ({curr.code})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Ledger safety & migration backups */}
                <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                      <RefreshCw className="text-tertiary w-5 h-5" />
                      Ledger Backups & Migration
                    </h3>
                    <p className="text-xs text-on-surface-variant">Safely move and restore your financial ledgers instantly</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    
                    {/* Export JSON backup bundle */}
                    <button
                      onClick={handleExportJSON}
                      className="w-full h-11 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-bold text-xs rounded-lg transition-colors border border-outline-variant flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      Download Ledger Backup (JSON format)
                    </button>

                    {/* Import JSON */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                        Upload Backup File (Format: .json)
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportJSON}
                          className="w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-container-highest file:text-on-surface hover:file:bg-surface-bright file:cursor-pointer bg-surface border border-outline-variant p-2.5 rounded-lg"
                        />
                      </div>
                      
                      {importError && (
                        <span className="text-[11px] font-bold text-secondary mt-1 block">
                          ⚠ {importError}
                        </span>
                      )}
                      {importSuccess && (
                        <span className="text-[11px] font-bold text-primary mt-1 block">
                          ✔ Backup file restored successfully!
                        </span>
                      )}
                    </div>

                    <div className="h-px bg-outline-variant/60 my-1"></div>

                    {/* Admin hard resets */}
                    <div className="flex gap-2">
                      <button
                        onClick={restoreDemoLedger}
                        className="flex-1 h-11 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/80 text-on-surface font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        title="Resets standard mock portfolio values"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />
                        <span>Load Demo Records</span>
                      </button>

                      {showClearConfirm ? (
                        <div className="flex gap-1.5 flex-1">
                          <button
                            onClick={clearAllLedgerData}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-wide rounded-lg flex-1 h-11 flex items-center justify-center"
                          >
                            Yes, delete!
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="bg-surface border border-outline-variant text-[10px] text-on-surface font-bold uppercase rounded-lg px-2 h-11"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="flex-1 h-11 bg-red-950/20 hover:bg-red-950/40 border border-red-500/25 text-red-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-secondary" />
                          <span>Clear All Data</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              </section>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 3. Bottom Navigation bar (Mobile screens only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center bg-surface-container/95 backdrop-blur-md px-2 pb-safe-bottom h-20 border-t border-outline-variant">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'dashboard'
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'text-on-surface-variant font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className="text-xs">Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'activity'
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'text-on-surface-variant font-medium'
          }`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-xs">Activity</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'settings'
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'text-on-surface-variant font-medium'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0 animate-spin-hover" />
          <span className="text-xs">Settings</span>
        </button>
      </nav>

    </div>
  );
}
