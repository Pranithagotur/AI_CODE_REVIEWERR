import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Sparkles, ShieldAlert, Terminal, CheckCircle2, ChevronRight, BookOpen, AlertTriangle } from 'lucide-react';
import { API_URL } from '../App';

// Pre-defined code templates for users to test the platform's engines
const TEMPLATES: Record<string, string> = {
  python: `# Python Code Review Template
mySecretKey = "token_123456_super_private"
unused_var = 10

def divide(x, y):
    # Bug: Potential division by zero
    return x / y
    
def read_config(filepath):
    # Best Practice: File IO outside try-except / context manager
    f = open(filepath, "r")
    content = f.read()
    f.close()
    return content

print("Divide result:", divide(10, 2))
# Triggering runtime exception
print("Divide by zero:", divide(10, 0))
`,
  javascript: `// JavaScript Code Review Template
const my_secret_key = "api_key_abc123xyz_token";
var unused_variable = 99;
let camelCaseVar = "JavaScript naming";

function fetchMetadata(jsonStr) {
  // Warning: JSON.parse outside try-catch block
  const data = JSON.parse(jsonStr);
  return data;
}

const user = null;
// Triggering a runtime Null/Undefined reference crash
console.log(user.name);
`,
  cpp: `// C++ Code Review Template
#include <iostream>

void createLeak() {
    // Memory Leak: raw new without matching delete
    int* buffer = new int[100];
    buffer[0] = 42;
    std::cout << "Buffer allocated on heap" << std::endl;
}

int main() {
    createLeak();
    
    // Out of bounds exception risk
    int scores[3] = {90, 85, 95};
    std::cout << "Score at 5: " << scores[5] << std::endl;
    
    return 0;
}
`,
  java: `// Java Code Review Template
public class Main {
    public static void main(String[] args) {
        // Unused variable
        int unneededCounter = 100;

        // Null Pointer exception trigger
        String text = null;
        System.out.println("Text length: " + text.length());
    }
}
`
};

interface DashboardProps {
  token: string | null;
  onAuthRequired: () => void;
}

function Dashboard({ token, onAuthRequired }: DashboardProps) {
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>(TEMPLATES['python']);
  const [mode, setMode] = useState<'student' | 'developer'>('developer');
  
  // Loading & Outputs
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'rules' | 'sandbox'>('ai');
  const [result, setResult] = useState<any>(null);

  // Auto-sync code when language changes
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang] || '');
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/reviews/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language,
          sourceCode: code,
          mode
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze code');
      
      setResult(data);
      // Auto switch tabs based on code results
      if (data.runtimeFeedback && !data.runtimeFeedback.success) {
        setActiveTab('sandbox');
      } else if (data.ruleFeedback && data.ruleFeedback.length > 0) {
        setActiveTab('rules');
      } else {
        setActiveTab('ai');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing review service.');
    } finally {
      setAnalyzing(false);
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b13]">
      
      {/* Top Controls Header */}
      <header className="p-4 border-b border-brand-border bg-[#0e1320] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-6">
          {/* Language Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Language:</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-[#161b26] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Audience Mode Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Mode:</span>
            <div className="bg-[#161b26] p-0.5 rounded-xl border border-brand-border flex">
              <button
                onClick={() => setMode('developer')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'developer' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Developer
              </button>
              <button
                onClick={() => setMode('student')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'student' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Student
              </button>
            </div>
          </div>
        </div>

        {/* Trigger Review Button */}
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className={`flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20`}
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Initiate Code Review</span>
            </>
          )}
        </button>
      </header>

      {/* Main Split Interface */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Left Side: Monaco Code Editor */}
        <div className="flex-1 border-r border-brand-border flex flex-col min-h-[350px] lg:min-h-0 bg-[#0b0e17]">
          <div className="p-3 bg-[#0d111b] border-b border-brand-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2 animate-ping"></span>
              Live Editor Workspace
            </span>
            {!token && (
              <button 
                onClick={onAuthRequired}
                className="text-[10px] text-amber-400 hover:underline flex items-center"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Sign in to save review history
              </button>
            )}
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                lineHeight: 20,
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>
        </div>

        {/* Right Side: Tabbed Results Pane */}
        <div className="w-full lg:w-[48%] bg-[#080c14] flex flex-col min-h-[350px] lg:min-h-0 border-t lg:border-t-0 border-brand-border">
          
          {/* Tab Selector */}
          <div className="bg-[#0e1320] border-b border-brand-border flex shrink-0">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3.5 text-center text-xs font-bold flex justify-center items-center space-x-1.5 border-b-2 transition-all ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/25'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Feedback</span>
            </button>
            
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 py-3.5 text-center text-xs font-bold flex justify-center items-center space-x-1.5 border-b-2 transition-all relative ${
                activeTab === 'rules'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/25'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Rule Engine</span>
              {result?.ruleFeedback?.length > 0 && (
                <span className="absolute top-2 right-2 bg-amber-500 text-[#070b13] font-extrabold text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                  {result.ruleFeedback.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex-1 py-3.5 text-center text-xs font-bold flex justify-center items-center space-x-1.5 border-b-2 transition-all ${
                activeTab === 'sandbox'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/25'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Sandbox Console</span>
              {result?.runtimeFeedback && !result.runtimeFeedback.success && (
                <span className="absolute top-2 right-2 bg-rose-500 w-2 h-2 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-16">
                <CheckCircle2 className="h-10 w-10 text-slate-600 stroke-[1.5]" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Workspace Idle</p>
                  <p className="text-xs text-slate-600 max-w-[260px] mt-1">Press the review button to trigger static, dynamic, and AI diagnostic reports.</p>
                </div>
              </div>
            ) : (
              <>
                {/* --- AI REVIEW TAB --- */}
                {activeTab === 'ai' && result.aiFeedback && (
                  <div className="space-y-6">
                    {/* Quality Header summary */}
                    <div className="bg-[#121824] border border-brand-border p-5 rounded-2xl flex items-center space-x-5">
                      <div className={`h-16 w-16 shrink-0 rounded-2xl border-2 flex flex-col items-center justify-center font-extrabold text-2xl shadow-lg ${getGradeColor(result.aiFeedback.code_quality?.rating)}`}>
                        {result.aiFeedback.code_quality?.rating || 'A'}
                        <span className="text-[8px] font-bold tracking-wider -mt-1 uppercase">Grade</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Code Quality Analysis</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{result.aiFeedback.code_quality?.summary}</p>
                        <div className="mt-2 flex items-center space-x-1.5">
                          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                            Maintainability: {result.aiFeedback.code_quality?.maintainability || 'Good'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Complexity analysis metrics */}
                    <div className="bg-[#121824] border border-brand-border rounded-2xl p-5">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Complexity Estimation</h4>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-[#0b0f19] border border-brand-border p-3.5 rounded-xl text-center">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time Complexity</span>
                          <p className="text-lg font-mono font-extrabold text-white mt-1">{result.aiFeedback.complexity_analysis?.time_complexity || 'O(1)'}</p>
                        </div>
                        <div className="bg-[#0b0f19] border border-brand-border p-3.5 rounded-xl text-center">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Space Complexity</span>
                          <p className="text-lg font-mono font-extrabold text-white mt-1">{result.aiFeedback.complexity_analysis?.space_complexity || 'O(1)'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{result.aiFeedback.complexity_analysis?.explanation}</p>
                    </div>

                    {/* Refactoring Recommendations */}
                    {result.aiFeedback.refactoring_suggestions?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Refactoring & Improvement Tips</h4>
                        {result.aiFeedback.refactoring_suggestions.map((ref: any, idx: number) => (
                          <div key={idx} className="bg-[#121824] border border-brand-border rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-brand-border/60 bg-indigo-500/5">
                              <span className="text-xs font-semibold text-white">Suggestion {idx + 1}</span>
                              <p className="text-[11px] text-slate-400 mt-1">{ref.explanation}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 font-mono text-[11px] divide-y md:divide-y-0 md:divide-x divide-brand-border bg-[#0b0f19]">
                              <div className="p-3">
                                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block mb-1">Original</span>
                                <pre className="text-rose-300 whitespace-pre-wrap overflow-x-auto p-1.5 bg-rose-950/20 rounded-lg border border-rose-950/50">{ref.original}</pre>
                              </div>
                              <div className="p-3">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Recommended</span>
                                <pre className="text-emerald-300 whitespace-pre-wrap overflow-x-auto p-1.5 bg-emerald-950/20 rounded-lg border border-emerald-950/50">{ref.replacement}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Student Mode Specific Learning resources */}
                    {mode === 'student' && result.aiFeedback.learning_resources && (
                      <div className="space-y-3 border-t border-brand-border pt-5">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center">
                          <BookOpen className="h-4 w-4 mr-1.5" />
                          Recommended Learning Resources
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {result.aiFeedback.learning_resources.map((res: any, idx: number) => (
                            <a
                              key={idx}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-[#121824] border border-brand-border hover:border-amber-500/40 p-4 rounded-2xl block transition-all group"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white group-hover:text-amber-300">{res.title}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1">{res.tip}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- STATIC RULES TAB --- */}
                {activeTab === 'rules' && result.ruleFeedback && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Rule engine Warnings</h4>
                      <span className="text-xs text-slate-400 font-medium">{result.ruleFeedback.length} issue(s) identified</span>
                    </div>

                    {result.ruleFeedback.length === 0 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-5 rounded-2xl flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Standard Violations Check Passed</p>
                          <p className="text-[11px] text-emerald-500/80 mt-0.5">No unused variables, memory leaks, duplicate logic, or hardcoded secrets found.</p>
                        </div>
                      </div>
                    ) : (
                      result.ruleFeedback.map((v: any, idx: number) => (
                        <div key={idx} className="bg-[#121824] border border-brand-border rounded-2xl overflow-hidden">
                          <div className="p-4 flex items-start space-x-3">
                            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                              v.severity === 'error' ? 'bg-rose-500 animate-pulse' : v.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white uppercase tracking-wide">Line {v.line}</span>
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold border ${
                                  v.severity === 'error' 
                                    ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' 
                                    : v.severity === 'warning'
                                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                                    : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                }`}>
                                  {v.ruleId}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans">{v.message}</p>
                              {v.fix && (
                                <div className="mt-3 bg-[#0b0f19] border border-brand-border p-2.5 rounded-xl">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Suggested Correction</span>
                                  <pre className="text-slate-400 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">{v.fix}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* --- SANDBOX CONSOLE TAB --- */}
                {activeTab === 'sandbox' && result.runtimeFeedback && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Dynamic Execution Output</h4>
                    
                    {/* Status Banner */}
                    <div className={`p-4 border rounded-2xl flex items-center space-x-3 ${
                      result.runtimeFeedback.success 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {result.runtimeFeedback.success ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">
                            {result.runtimeFeedback.success ? 'Execution Successful' : 'Execution Failed'}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {result.runtimeFeedback.executionTimeMs} ms
                          </span>
                        </div>
                        {!result.runtimeFeedback.success && (
                          <p className="text-[10px] opacity-80 mt-0.5">Program failed compiler checks or crashed during execution.</p>
                        )}
                      </div>
                    </div>

                    {/* Standard Output (Terminal Box) */}
                    <div className="bg-[#0b0f19] border border-brand-border rounded-2xl overflow-hidden">
                      <div className="bg-[#0e1320] border-b border-brand-border px-4 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stdout Console</span>
                      </div>
                      <div className="p-4 font-mono text-xs text-slate-300 min-h-[100px] max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {result.runtimeFeedback.output || (result.runtimeFeedback.success ? '[No console outputs returned]' : '')}
                        {result.runtimeFeedback.error && (
                          <span className="text-rose-400 block font-semibold">{result.runtimeFeedback.error}</span>
                        )}
                      </div>
                    </div>

                    {/* Compile or Runtime trace diagnostic mapping */}
                    {!result.runtimeFeedback.success && result.runtimeFeedback.line && (
                      <div className="bg-[#121824] border border-brand-border p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">Debugger Analysis</span>
                          <span className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                            Crash Line: {result.runtimeFeedback.line}
                          </span>
                        </div>
                        {result.runtimeFeedback.fix && (
                          <div className="bg-[#0b0f19] border border-brand-border p-3 rounded-xl">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Recommended Debug Step</span>
                            <p className="text-xs text-slate-300 font-sans leading-relaxed">{result.runtimeFeedback.fix}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
