import React, { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, ShieldAlert, Sparkles, Zap, Filter, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../App';

interface KBItem {
  id: number;
  title: string;
  category: string;
  language: string;
  pattern: string;
  solution: string;
}

function KnowledgeBase() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');

  // Add Item Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('bug_pattern');
  const [newLanguage, setNewLanguage] = useState('javascript');
  const [newPattern, setNewPattern] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchKB();
  }, [categoryFilter, langFilter]);

  const fetchKB = async () => {
    setLoading(true);
    try {
      const qParams: string[] = [];
      if (categoryFilter !== 'all') qParams.push(`category=${categoryFilter}`);
      if (langFilter !== 'all') qParams.push(`language=${langFilter}`);
      
      const queryStr = qParams.length > 0 ? `?${qParams.join('&')}` : '';
      const response = await fetch(`${API_URL}/kb/search${queryStr}`);
      const data = await response.json();
      if (response.ok) {
        setItems(data);
      }
    } catch (err) {
      console.error('KB fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/kb/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          language: newLanguage,
          pattern: newPattern,
          solution: newSolution
        })
      });

      if (response.ok) {
        alert('Knowledge base article added successfully!');
        setShowAddModal(false);
        // Reset fields
        setNewTitle('');
        setNewPattern('');
        setNewSolution('');
        fetchKB();
      } else {
        const errData = await response.json();
        alert(`Error adding article: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      alert('Error connecting to backend database.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug_pattern': return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case 'security': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'optimization': return <Zap className="h-4 w-4 text-amber-400 animate-pulse" />;
      case 'best_practice': return <Sparkles className="h-4 w-4 text-emerald-400" />;
      default: return <BookOpen className="h-4 w-4 text-indigo-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace('_', ' ').toUpperCase();
  };

  // Filter items locally based on search text
  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.pattern.toLowerCase().includes(search.toLowerCase()) ||
    item.solution.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
      
      {/* Header and Add Button */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Developer Knowledge Base</h2>
          <p className="text-xs text-slate-400">Explore and search programming patterns, optimization checklists, and security practices.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#0e1320] border border-brand-border p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between shrink-0">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="w-full bg-[#161b26] border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3">
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#161b26] border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="bug_pattern">Bug Patterns</option>
              <option value="best_practice">Best Practices</option>
              <option value="security">Security</option>
              <option value="optimization">Optimizations</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Language:</span>
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="bg-[#161b26] border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>
        </div>

      </div>

      {/* Grid List */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500">Retrieving articles...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-24 text-center text-xs text-slate-500">No matching articles in knowledge base. Try resetting filters or search keywords.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-[#0e1320] border border-brand-border rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all hover:translate-y-[-1px]">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded tracking-wider">
                    {item.language}
                  </span>
                  <div className="flex items-center space-x-1.5 bg-[#161b26] border border-brand-border px-2.5 py-0.5 rounded-full text-[9px] font-bold text-slate-300">
                    {getCategoryIcon(item.category)}
                    <span>{getCategoryLabel(item.category)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{item.title}</h4>
                  <div className="space-y-2.5 mt-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Target Pattern</span>
                      <p className="text-xs text-slate-300 font-mono mt-0.5 whitespace-pre-wrap">{item.pattern}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Recommended Solution</span>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed mt-0.5">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-brand-border w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-bold text-white mb-2">New Knowledge Base Entry</h3>
            <p className="text-xs text-slate-400 mb-6">Contribute a new coding anti-pattern, diagnostic rule, or clean coding practice.</p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="bug_pattern">Bug Pattern</option>
                    <option value="best_practice">Best Practice</option>
                    <option value="security">Security Issue</option>
                    <option value="optimization">Optimization Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Language</label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="all">All Languages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Unintentional global variables"
                  className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pattern Description / Key Signature</label>
                <input
                  type="text"
                  required
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g. var decl using implicitly assigned tokens"
                  className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Solution / Recommended Fix</label>
                <textarea
                  required
                  rows={3}
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value)}
                  placeholder="Explain the pattern issue and how to remediate it..."
                  className="w-full bg-[#0b0f19] border border-brand-border rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all text-sm mt-2 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Publish Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default KnowledgeBase;
