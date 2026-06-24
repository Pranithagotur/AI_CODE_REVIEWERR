import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { BarChart3, TrendingUp, Trophy, AlertTriangle, Lightbulb } from 'lucide-react';
import { API_URL } from '../App';

interface AnalyticsProps {
  token: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

function Analytics({ token }: AnalyticsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [token]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Maps grades to numbers for charting (F = 1, D = 2, C = 3, B = 4, A = 5)
  const mapGradeToNumber = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 5;
      case 'B': return 4;
      case 'C': return 3;
      case 'D': return 2;
      case 'F': return 1;
      default: return 5;
    }
  };

  const getNumberToGradeLabel = (val: number) => {
    switch (val) {
      case 5: return 'A';
      case 4: return 'B';
      case 3: return 'C';
      case 2: return 'D';
      case 1: return 'F';
      default: return '';
    }
  };

  // Convert raw API summary into format charts understand
  const getLanguagesChartData = () => {
    if (!data?.languages) return [];
    return data.languages.map((l: any) => ({
      name: l.language.toUpperCase(),
      value: l.count
    }));
  };

  const getGradesChartData = () => {
    if (!data?.gradeHistory) return [];
    return data.gradeHistory.map((item: any, index: number) => ({
      run: `Review #${index + 1}`,
      score: mapGradeToNumber(item.grade)
    }));
  };

  const getMistakesChartData = () => {
    if (!data?.commonMistakes) return [];
    return data.commonMistakes.map((m: any) => ({
      rule: m.ruleId.replace('_', ' ').toUpperCase(),
      count: m.count
    }));
  };

  const getFocusRecommendation = () => {
    if (!data?.commonMistakes || data.commonMistakes.length === 0) {
      return {
        title: 'Keep it up!',
        body: 'You have not triggered any static code warning rules. Keep writing clean, well-tested expressions!'
      };
    }

    const topMistake = data.commonMistakes[0].ruleId;
    switch (topMistake) {
      case 'unused_variable':
        return {
          title: 'Clean Up Unused Declarations',
          body: 'Your top warning is unused variables. Before finalizing code, delete residual variables to clear allocations and clarify context.'
        };
      case 'infinite_loop':
        return {
          title: 'Review Termination Conditions',
          body: 'You have multiple infinite loop triggers. Ensure all loop variables are correctly incremented/mutated and break statements are reachable.'
        };
      case 'missing_exception_handling':
        return {
          title: 'Implement Graceful Exception Safeguards',
          body: 'A significant portion of warnings comes from missing try-catch blocks. Wrap file operations, parsers, and external calls in error handlers.'
        };
      case 'hardcoded_secret':
        return {
          title: 'Secure Credentials management',
          body: 'You have hardcoded keys/secrets inside source text. Refactor them out into env variables to secure repository codebases.'
        };
      case 'memory_leak':
        return {
          title: 'Optimize Heap Allocations',
          body: 'Memory leaks are common. Ensure every dynamic allocation is properly released, or migrate pointer handles to RAII container architectures.'
        };
      default:
        return {
          title: 'Refactor Code Logic Syntax',
          body: 'Review guidelines for coding standards, improve modular organization, and follow language specific formatting.'
        };
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 py-24">Calculating summary details...</div>;
  }

  const focusRec = getFocusRecommendation();
  const languagesData = getLanguagesChartData();
  const gradesData = getGradesChartData();
  const mistakesData = getMistakesChartData();

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Performance Analytics</h2>
        <p className="text-xs text-slate-400">Track language distributions, code quality trends, and targeted focus areas.</p>
      </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
        <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex items-center space-x-4">
          <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/30">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reviews Analyzed</span>
            <p className="text-2xl font-bold text-white">{data?.totalReviews || 0}</p>
          </div>
        </div>

        <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex items-center space-x-4">
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
            <Trophy className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Latest Review Quality</span>
            <p className="text-2xl font-bold text-white">
              {data?.gradeHistory?.[0]?.grade || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex items-center space-x-4">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
            <TrendingUp className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Top Practice Violation</span>
            <p className="text-sm font-bold text-white truncate max-w-[190px] mt-0.5">
              {data?.commonMistakes?.[0]?.ruleId.replace('_', ' ').toUpperCase() || 'NONE'}
            </p>
          </div>
        </div>
      </div>

      {data?.totalReviews === 0 ? (
        <div className="bg-[#0e1320] border border-brand-border p-8 text-center text-slate-500 rounded-2xl py-24">
          Submit files for analysis in the Workspace first to construct chart metrics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Grade Improvement Trend */}
            <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex flex-col justify-between">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Quality Score Progression</h4>
              <div className="h-[220px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gradesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242b3d" />
                    <XAxis dataKey="run" stroke="#64748b" />
                    <YAxis 
                      stroke="#64748b"
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={getNumberToGradeLabel}
                    />
                    <Tooltip 
                      formatter={(val) => [getNumberToGradeLabel(val as number), 'Quality Grade']}
                      contentStyle={{ backgroundColor: '#161b26', borderColor: '#242b3d', color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Language Distribution */}
            <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex flex-col justify-between">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Language Share Breakdown</h4>
              <div className="h-[220px] w-full flex items-center justify-center text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languagesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {languagesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#161b26', borderColor: '#242b3d', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend list */}
                <div className="flex flex-col space-y-2 shrink-0 ml-4">
                  {languagesData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-bold text-white text-[11px]">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Common Warnings Bar chart */}
            <div className="bg-[#0e1320] border border-brand-border p-5 rounded-2xl flex flex-col justify-between lg:col-span-2">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Common Warnings & Mistakes Frequency</h4>
              <div className="h-[220px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mistakesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242b3d" />
                    <XAxis dataKey="rule" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#161b26', borderColor: '#242b3d', color: '#fff' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {mistakesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* AI Focus Recommendation */}
          <div className="bg-gradient-to-r from-[#121624] to-[#1a1e35] border border-brand-border rounded-2xl p-6 flex items-start space-x-4 shrink-0">
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-amber-400 shrink-0">
              <Lightbulb className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">AI Improvement Tip</span>
              <h4 className="text-sm font-bold text-white mt-0.5">{focusRec.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{focusRec.body}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Analytics;
