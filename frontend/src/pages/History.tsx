import React, { useState, useEffect } from 'react';
import { Calendar, Code, Eye, FileCode2, Clock, Sparkles } from 'lucide-react';
import { API_URL } from '../App';

interface HistoryItem {
  id: number;
  language: string;
  mode: string;
  created_at: string;
}

interface HistoryProps {
  token: string;
}

function History({ token }: HistoryProps) {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/reviews/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistoryList(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewDetails = async (id: number) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_URL}/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedReview(data);
      }
    } catch (err) {
      console.error('Error fetching review details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Helper colors for Quality grades
  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
      case 'B': return 'text-cyan-400 border-cyan-500 bg-cyan-500/10';
      case 'C': return 'text-amber-400 border-amber-500 bg-amber-500/10';
      case 'D': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      case 'F': return 'text-rose-400 border-rose-500 bg-rose-500/10';
      default: return 'text-indigo-400 border-indigo-500 bg-indigo-500/10';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Code Review Logs</h2>
        <p className="text-xs text-slate-400">View and inspect historical static, runtime, and AI analysis reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left pane: History list */}
        <div className="lg:col-span-5 bg-[#0e1320] border border-brand-border rounded-2xl flex flex-col min-h-[300px]">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Submissions</span>
            <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
              {historyList.length} total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[550px]">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Retrieving logs...</div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No submission records found. Submit some code in the workspace first!</div>
            ) : (
              historyList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadReviewDetails(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-center group ${
                    selectedReview?.id === item.id
                      ? 'bg-indigo-600/10 border-indigo-500'
                      : 'bg-[#161b26] border-transparent hover:border-brand-border'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden mr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        Submission #{item.id}
                      </span>
                      <span className="text-[9px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-extrabold">
                        {item.language}
                      </span>
                    </div>
                    <div className="flex items-center text-[10px] text-slate-400 space-x-3">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="capitalize">{item.mode} mode</span>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right pane: Inspection details */}
        <div className="lg:col-span-7 bg-[#0e1320] border border-brand-border rounded-2xl flex flex-col min-h-[400px]">
          {loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400 space-y-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500/30 border-t-indigo-500"></div>
              <span className="text-xs">Loading logs details...</span>
            </div>
          ) : !selectedReview ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2 py-24">
              <FileCode2 className="h-8 w-8 stroke-[1.5] text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-400">No review selected</p>
                <p className="text-[10px] text-slate-600 max-w-[200px] mt-0.5">Select a submission from the list to view its code and analyzer reports.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden max-h-[610px]">
              {/* Header summary */}
              <div className="p-4 border-b border-brand-border bg-[#161b26]/50 flex items-center justify-between shrink-0">
                <div>
                  <h4 className="text-xs font-bold text-white">Review Summary for ID #{selectedReview.id}</h4>
                  <span className="text-[10px] text-slate-400">Run on {new Date(selectedReview.created_at).toLocaleString()}</span>
                </div>
                {selectedReview.aiFeedback?.code_quality && (
                  <div className={`h-10 w-10 border rounded-xl flex items-center justify-center font-extrabold text-sm shadow ${getGradeColor(selectedReview.aiFeedback.code_quality.rating)}`}>
                    {selectedReview.aiFeedback.code_quality.rating}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Code segment block */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted Source Code</span>
                  <div className="bg-[#0b0f19] border border-brand-border rounded-xl p-4 overflow-x-auto max-h-[200px]">
                    <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre">{selectedReview.source_code}</pre>
                  </div>
                </div>

                {/* Combined warnings list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Static & Runtime analysis</span>
                  
                  {/* Compilation/execution errors */}
                  {selectedReview.runtimeFeedback && !selectedReview.runtimeFeedback.success && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl space-y-2">
                      <p className="text-xs font-bold">Runtime Sandbox Failure</p>
                      <pre className="font-mono text-[10px] bg-black/30 p-2 rounded border border-rose-950 overflow-x-auto">{selectedReview.runtimeFeedback.error}</pre>
                      {selectedReview.runtimeFeedback.line && (
                        <p className="text-[10px] opacity-90">Debugger mapped error to Line {selectedReview.runtimeFeedback.line}</p>
                      )}
                    </div>
                  )}

                  {/* Static rule warnings */}
                  {selectedReview.ruleFeedback?.length === 0 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2">
                      <span>✓ Static validation checks passed</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedReview.ruleFeedback.map((r: any, idx: number) => (
                        <div key={idx} className="bg-[#121824] border border-brand-border p-3.5 rounded-xl flex items-start space-x-2.5">
                          <div className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${r.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-white">Line {r.line}</span>
                              <span className="text-indigo-400 uppercase">{r.ruleId}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 font-sans leading-normal">{r.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI quality summary */}
                {selectedReview.aiFeedback && (
                  <div className="bg-[#121824] border border-brand-border rounded-xl p-4 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      AI Code Quality Assessment
                    </span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">{selectedReview.aiFeedback.code_quality?.summary}</p>
                    {selectedReview.aiFeedback.complexity_analysis && (
                      <div className="pt-2.5 border-t border-brand-border/60 grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Time complexity</span>
                          <p className="text-white font-bold">{selectedReview.aiFeedback.complexity_analysis.time_complexity}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Space complexity</span>
                          <p className="text-white font-bold">{selectedReview.aiFeedback.complexity_analysis.space_complexity}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default History;
