import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Brain, BarChart3,
  Briefcase, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  getCombinedTrends,
  getTopSkills,
  getAllForecasts,
  getAIPredictions,
  getRoleDemand,
  type CombinedTrendsResponse,
} from '@/utils/auraSkillService';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

type TopSkillsResponse = {
  skills: Array<{
    skill_name: string;
    category: string;
    total_freq: number;
    avg_pct: number;
  }>;
  skill_type: string;
};

type ForecastData = {
  skill: string;
  model: string;
  skill_type: string;
  current_demand: number;
  predicted_2031: number;
  growth_rate: number;
  r2_score: number;
  trend_direction: string;
  historical: Array<{ period: string; demand_pct: number }>;
  forecast: Array<{ period: string; demand_pct: number }>;
};

type ForecastsResponse = {
  forecasts: ForecastData[];
  count: number;
  skill_type: string;
};

type AIPrediction = {
  skill: string;
  current_demand_pct: number;
  predicted_growth_12m: string;
  confidence: string;
  trend_direction: string;
  reasoning: string;
};

type AIPredictionsResponse = {
  analysis: {
    market_insight: string;
    top_emerging: string[];
    top_declining: string[];
    predictions: AIPrediction[];
  };
};

type RoleDemandData = {
  category: string;
  posting_count: number;
  percentage: number;
  avg_salary: number | null;
  remote_count: number;
};

type RoleDemandResponse = {
  roles: RoleDemandData[];
};

type ChartDataPoint = {
  period: string;
  [skillName: string]: string | number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const trendIcon = (trend: string) => {
  if (trend === 'rising') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (trend === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-500" />;
};

const trendBadge = (trend: string) => {
  if (trend === 'rising') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (trend === 'declining') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
};

const confidenceBadge = (conf: string) => {
  if (conf === 'High') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (conf === 'Low') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
};

const colorPalette = [
  '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444',
  '#06b6d4', '#f97316', '#6366f1', '#ec4899', '#14b8a6',
];

// ─────────────────────────────────────────────────────────────────────────────
// Combined Intelligence Tab
// ─────────────────────────────────────────────────────────────────────────────

const CombinedTab = () => {
  const [data, setData] = useState<CombinedTrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await getCombinedTrends(25, 'all');
      setData(result);
      setLoaded(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load combined trends');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !loading) {
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Market Insight */}
      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            Market Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.market_insight}</p>
        </CardContent>
      </Card>

      {/* Skills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Intelligence Scores</CardTitle>
          <CardDescription>
            ML + AI unified analysis • {data.meta.ml_weight * 100}% ML + {data.meta.ai_weight * 100}% AI weights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-center py-2 px-3">Combined</th>
                  <th className="text-center py-2 px-3">ML Score</th>
                  <th className="text-center py-2 px-3">AI Score</th>
                  <th className="text-center py-2 px-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.skills.slice(0, 20).map((skill, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{skill.skill}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {skill.skill_type}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-violet-400">{skill.combined_score.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 text-center text-green-400">
                      {skill.ml_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-center text-blue-400">
                      {skill.ai_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="outline" className={`text-xs ${trendBadge(skill.combined_trend)}`}>
                          {trendIcon(skill.combined_trend)}
                          <span className="ml-1 capitalize">{skill.combined_trend}</span>
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Top Skills Tab
// ─────────────────────────────────────────────────────────────────────────────

const TopSkillsTab = () => {
  const [data, setData] = useState<TopSkillsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await getTopSkills(30, 'all');
      setData(result);
      setLoaded(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load top skills');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !loading) {
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>Top Skills by Demand</CardTitle>
          <CardDescription>
            Based on {data.skills.length} skills from real job postings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-center py-2 px-3">Frequency</th>
                  <th className="text-left py-2 px-3">Demand %</th>
                </tr>
              </thead>
              <tbody>
                {data.skills.map((skill, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-3 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-3 font-medium">{skill.skill_name}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-xs">
                        {skill.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {skill.total_freq}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[200px]">
                          <Progress value={skill.avg_pct} className="h-2" />
                        </div>
                        <span className="text-xs font-medium min-w-[45px]">
                          {skill.avg_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ML Forecasts Tab (3-WAY VIEW TOGGLE)
// ─────────────────────────────────────────────────────────────────────────────

type ForecastView = 'combined' | 'ml' | 'kaggle';

const ForecastsTab = () => {
  const [activeView, setActiveView] = useState<ForecastView>('combined');
  const [cachedData, setCachedData] = useState<{
    combined: CombinedTrendsResponse | null;
    ml: ForecastsResponse | null;
    kaggle: TopSkillsResponse | null;
  }>({
    combined: null,
    ml: null,
    kaggle: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedViews, setLoadedViews] = useState<Set<ForecastView>>(new Set());

  const loadView = async (view: ForecastView) => {
    if (loadedViews.has(view)) return;

    setLoading(true);
    setError('');
    try {
      let result;
      if (view === 'combined') {
        result = await getCombinedTrends(20, 'technical');
        setCachedData(prev => ({ ...prev, combined: result }));
      } else if (view === 'ml') {
        result = await getAllForecasts(10, 70, 'technical');
        setCachedData(prev => ({ ...prev, ml: result }));
      } else {
        result = await getTopSkills(30, 'technical');
        setCachedData(prev => ({ ...prev, kaggle: result }));
      }
      setLoadedViews(prev => new Set([...prev, view]));
    } catch (err: unknown) {
      setError((err as Error).message || `Failed to load ${view} data`);
    } finally {
      setLoading(false);
    }
  };

  // Load default view on mount
  if (!loadedViews.has('combined') && !loading) {
    loadView('combined');
  }

  const handleViewChange = (view: ForecastView) => {
    setActiveView(view);
    if (!loadedViews.has(view)) {
      loadView(view);
    }
  };

  if (loading && !loadedViews.has(activeView)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* View Toggle Bar */}
      <Card className="border-blue-500/30">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => handleViewChange('combined')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeView === 'combined'
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              Combined Model
            </button>
            <button
              onClick={() => handleViewChange('ml')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeView === 'ml'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              ML Forecast 2022–2031
            </button>
            <button
              onClick={() => handleViewChange('kaggle')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeView === 'kaggle'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              Kaggle Dataset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* View Content */}
      {activeView === 'combined' && cachedData.combined && (
        <CombinedModelView data={cachedData.combined} />
      )}
      {activeView === 'ml' && cachedData.ml && (
        <MLForecastView data={cachedData.ml} />
      )}
      {activeView === 'kaggle' && cachedData.kaggle && (
        <KaggleDatasetView data={cachedData.kaggle} />
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// View 1: Combined Model (Bar + Line Mixed Chart)
// ─────────────────────────────────────────────────────────────────────────────

const CombinedModelView = ({ data }: { data: CombinedTrendsResponse }) => {
  const skills = data.skills.slice(0, 20).sort((a, b) => b.combined_score - a.combined_score);

  const chartData = skills.map(s => ({
    skill: s.skill.length > 12 ? s.skill.slice(0, 10) + '…' : s.skill,
    fullSkill: s.skill,
    ml_score: s.ml_score,
    ai_score: s.ai_score,
    combined_score: s.combined_score,
  }));

  return (
    <>
      {/* Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold mb-3">Combined Intelligence — ML (60%) + AI (40%)</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Weighted model: Kaggle dataset ML forecast + Groq LLM predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 420 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                <XAxis
                  dataKey="skill"
                  stroke="#888"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#888"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  label={{ value: 'Score (0–100)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid #444',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => chartData.find(d => d.skill === label)?.fullSkill || label}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}`,
                    name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="ml_score"
                  name="ML Score (60%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="ai_score"
                  name="AI Score (40%)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="combined_score"
                  name="Combined Score"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Intelligence Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-center py-2 px-3">Combined</th>
                  <th className="text-center py-2 px-3">ML</th>
                  <th className="text-center py-2 px-3">AI</th>
                  <th className="text-center py-2 px-3">Trend</th>
                  <th className="text-center py-2 px-3">Confidence</th>
                  <th className="text-center py-2 px-3">Current %</th>
                  <th className="text-center py-2 px-3">Predicted 2031 %</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{skill.skill}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-violet-400">{skill.combined_score.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 text-center text-green-400">
                      {skill.ml_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-center text-blue-400">
                      {skill.ai_score.toFixed(1)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="outline" className={`text-xs ${trendBadge(skill.combined_trend)}`}>
                          {trendIcon(skill.combined_trend)}
                          <span className="ml-1 capitalize">{skill.combined_trend}</span>
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className={`text-xs ${confidenceBadge(skill.confidence)}`}>
                        {skill.confidence}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">{skill.current_demand_pct.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-center font-semibold text-blue-400">
                      {skill.predicted_2031_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// View 2: ML Forecast 2022-2031 (Existing Line Chart)
// ─────────────────────────────────────────────────────────────────────────────

const MLForecastView = ({ data }: { data: ForecastsResponse }) => {
  // Prepare chart data
  const chartData: ChartDataPoint[] = [];
  let transitionIndex = 0;

  if (data.forecasts[0]) {
    transitionIndex = data.forecasts[0].historical.length;
    const allPoints = [...data.forecasts[0].historical, ...data.forecasts[0].forecast];
    allPoints.forEach((p) => {
      chartData.push({ period: p.period });
    });
  }

  data.forecasts.forEach((f) => {
    const points = [...f.historical, ...f.forecast];
    points.forEach((p, idx) => {
      chartData[idx][f.skill] = p.demand_pct;
    });
  });

  // Get transition period for reference line (Feb 2026)
  const transitionPeriod = chartData[transitionIndex - 1]?.period || 'Feb 2026';

  return (
    <>
      {/* Line Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold mb-3">ML Demand Forecast (2022–2031)</CardTitle>
          <CardDescription className="text-sm leading-relaxed space-y-1">
            <div>Ensemble model: 40% Polynomial Ridge + 60% Random Forest</div>
            <div>Current date marked | Skills predicted to boom: AI/ML, Cloud, Python</div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                <XAxis
                  dataKey="period"
                  stroke="#888"
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(chartData.length / 10)}
                  label={{ value: 'Period (2022–2031)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  stroke="#888"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Demand %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid #444',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                
                {/* Vertical line marking Historical | Forecast transition (Current: Feb 2026) */}
                <ReferenceLine 
                  x={transitionPeriod} 
                  stroke="#888" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ 
                    value: '← Historical | Forecast →', 
                    position: 'top',
                    fill: '#bbb',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />

                {data.forecasts.map((f, i) => (
                  <Line
                    key={f.skill}
                    type="monotone"
                    dataKey={f.skill}
                    stroke={colorPalette[i % colorPalette.length]}
                    strokeWidth={2}
                    dot={false}
                    name={f.skill}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-center py-2 px-3">Current %</th>
                  <th className="text-center py-2 px-3">Predicted 2031</th>
                  <th className="text-center py-2 px-3">Growth</th>
                  <th className="text-center py-2 px-3">Trend</th>
                  <th className="text-center py-2 px-3">R² Score</th>
                </tr>
              </thead>
              <tbody>
                {data.forecasts.map((f, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{f.skill}</td>
                    <td className="py-2 px-3 text-center">{f.current_demand.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-center font-semibold text-blue-400">
                      {f.predicted_2031.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={f.growth_rate >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {f.growth_rate >= 0 ? '+' : ''}{f.growth_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="outline" className={`text-xs ${trendBadge(f.trend_direction)}`}>
                          {trendIcon(f.trend_direction)}
                          <span className="ml-1 capitalize">{f.trend_direction}</span>
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-muted-foreground">
                      {f.r2_score.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// View 3: Kaggle Dataset (Horizontal Bar Chart)
// ─────────────────────────────────────────────────────────────────────────────

const KaggleDatasetView = ({ data }: { data: TopSkillsResponse }) => {
  const skills = data.skills.sort((a, b) => b.avg_pct - a.avg_pct);

  return (
    <>
      {/* Line Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold mb-3">Raw Dataset — Skill Demand Distribution</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Source: Kaggle LinkedIn Job Postings 2024 — 22,155 tech postings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
              <LineChart data={skills}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                <XAxis
                  dataKey="skill_name"
                  stroke="#888"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#888"
                  tick={{ fontSize: 11 }}
                  label={{ value: '% of Job Postings', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid #444',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [
                    `${value.toFixed(2)}%`,
                    'Demand %'
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="avg_pct"
                  name="Demand %"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kaggle Dataset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-center py-2 px-3">Total Mentions</th>
                  <th className="text-left py-2 px-3">Demand %</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-3 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-3 font-medium">{skill.skill_name}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-xs">
                        {skill.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {skill.total_freq}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[200px]">
                          <Progress value={skill.avg_pct} className="h-2" />
                        </div>
                        <span className="text-xs font-medium min-w-[45px]">
                          {skill.avg_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Predictions Tab
// ─────────────────────────────────────────────────────────────────────────────

const AIPredictionsTab = () => {
  const [data, setData] = useState<AIPredictionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await getAIPredictions();
      setData(result);
      setLoaded(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load AI predictions');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !loading) {
    load();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
        <p className="text-sm text-muted-foreground">Fetching AI predictions from Groq LLM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !data.analysis) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Market Insight */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            AI Market Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.analysis.market_insight}</p>
        </CardContent>
      </Card>

      {/* Emerging & Declining */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-400" />
              Top Emerging Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.analysis.top_emerging.map((skill: string, i: number) => (
                <Badge key={i} variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-400" />
              Top Declining Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.analysis.top_declining.map((skill: string, i: number) => (
                <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Skill Predictions</CardTitle>
          <CardDescription>Powered by Groq LLM (qwen/qwen3.8-27b)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">Skill</th>
                  <th className="text-center py-2 px-3">Current %</th>
                  <th className="text-center py-2 px-3">Predicted Growth (12m)</th>
                  <th className="text-center py-2 px-3">Confidence</th>
                  <th className="text-center py-2 px-3">Trend</th>
                  <th className="text-left py-2 px-3">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {data.analysis.predictions.map((p, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-3 px-3 font-medium">{p.skill}</td>
                    <td className="py-3 px-3 text-center">{p.current_demand_pct.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-center">
                      <span className={p.predicted_growth_12m.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                        {p.predicted_growth_12m}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="outline" className={`text-xs ${confidenceBadge(p.confidence)}`}>
                          {p.confidence}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="outline" className={`text-xs ${trendBadge(p.trend_direction)}`}>
                          {trendIcon(p.trend_direction)}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground max-w-xs">{p.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Role Demand Tab
// ─────────────────────────────────────────────────────────────────────────────

const RoleDemandTab = () => {
  const [data, setData] = useState<RoleDemandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await getRoleDemand();
      setData(result);
      setLoaded(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load role demand');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !loading) {
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !data.roles) return null;

  const totalPostings = data.roles.reduce((sum, r) => sum + (r.posting_count ?? 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>Role Category Demand</CardTitle>
          <CardDescription>
            Distribution across {data.roles.length} role categories • {totalPostings.toLocaleString()} total postings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3">Role Category</th>
                  <th className="text-center py-2 px-3">Postings</th>
                  <th className="text-left py-2 px-3">Distribution</th>
                  <th className="text-center py-2 px-3">Avg Salary</th>
                  <th className="text-center py-2 px-3">Remote %</th>
                </tr>
              </thead>
              <tbody>
                {data.roles.map((role, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-3 px-3 font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-400" />
                      {role.category}
                    </td>
                    <td className="py-3 px-3 text-center">{(role.posting_count ?? 0).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[200px]">
                          <Progress value={role.percentage ?? 0} className="h-2" />
                        </div>
                        <span className="text-xs font-medium min-w-[45px]">
                          {role.percentage != null ? `${role.percentage.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-green-400">
                      {role.avg_salary ? `$${Math.round(role.avg_salary).toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {role.remote_count != null && role.posting_count > 0
                        ? `${((role.remote_count / role.posting_count) * 100).toFixed(0)}%`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const SkillTrends = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 backdrop-blur-sm">
            <BarChart3 className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Skill Trends & Forecasts</h1>
            <p className="text-sm text-muted-foreground">
              ML Forecasting + AI Predictions • Data from 22,155+ tech job postings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="combined" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            <TabsTrigger value="combined" className="text-xs">Combined Intelligence</TabsTrigger>
            <TabsTrigger value="top" className="text-xs">Top Skills</TabsTrigger>
            <TabsTrigger value="forecasts" className="text-xs">ML Forecasts</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">AI Predictions</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs">Role Demand</TabsTrigger>
          </TabsList>

          <TabsContent value="combined" className="mt-6">
            <CombinedTab />
          </TabsContent>

          <TabsContent value="top" className="mt-6">
            <TopSkillsTab />
          </TabsContent>

          <TabsContent value="forecasts" className="mt-6">
            <ForecastsTab />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <AIPredictionsTab />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleDemandTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SkillTrends;
