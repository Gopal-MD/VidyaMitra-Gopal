import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { codingQuestions } from '@/data/codingQuestions';
import { CodingQuestion } from '@/types/coding';
import { 
  Code, 
  Search, 
  Filter,
  Play,
  Clock,
  Trophy,
  Target,
  BookOpen,
  Zap,
  TrendingUp,
  Star,
  CheckCircle2,
  ArrowRight,
  BarChart,
  Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PracticeStats {
  totalQuestions: number;
  solvedQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  categories: Record<string, number>;
}

const PracticeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredQuestions, setFilteredQuestions] = useState<CodingQuestion[]>(codingQuestions);
  
  // Practice Statistics
  const [stats, setStats] = useState<PracticeStats>({
    totalQuestions: 0,
    solvedQuestions: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    categories: {}
  });

  // Get unique categories and difficulties
  const categories = [...new Set(codingQuestions.map(q => q.category))];
  const difficulties = ['easy', 'medium', 'hard'] as const;

  useEffect(() => {
    // Calculate statistics
    const totalQuestions = codingQuestions.length;
    const easyCount = codingQuestions.filter(q => q.difficulty === 'easy').length;
    const mediumCount = codingQuestions.filter(q => q.difficulty === 'medium').length;
    const hardCount = codingQuestions.filter(q => q.difficulty === 'hard').length;
    
    // Count by categories
    const categoryCount: Record<string, number> = {};
    codingQuestions.forEach(q => {
      categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
    });

    setStats({
      totalQuestions,
      solvedQuestions: 0, // TODO: Get from user's practice history
      easyCount,
      mediumCount,
      hardCount,
      categories: categoryCount
    });
  }, []);

  // Filter questions based on search and filters
  useEffect(() => {
    let filtered = codingQuestions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topics?.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    setFilteredQuestions(filtered);
  }, [searchQuery, selectedDifficulty, selectedCategory]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const startQuestionPractice = (questionId: string) => {
    // Store selected question and navigate to practice
    sessionStorage.setItem('selectedQuestion', questionId);
    navigate('/practice-coding');
  };

  const startRandomPractice = () => {
    navigate('/practice-coding');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Code className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Coding Practice Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Master algorithms and data structures with our comprehensive question bank
                </p>
              </div>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Questions</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Easy</p>
                    <p className="text-2xl font-bold text-green-600">{stats.easyCount}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medium</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.mediumCount}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Hard</p>
                    <p className="text-2xl font-bold text-red-600">{stats.hardCount}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Jump into practice mode or browse questions by topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={startRandomPractice} className="gap-2">
                  <Play className="h-4 w-4" />
                  Random Practice
                </Button>
                <Button variant="outline" onClick={() => setSelectedDifficulty('easy')} className="gap-2">
                  <Target className="h-4 w-4" />
                  Easy Problems
                </Button>
                <Button variant="outline" onClick={() => setSelectedDifficulty('medium')} className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Medium Problems
                </Button>
                <Button variant="outline" onClick={() => setSelectedDifficulty('hard')} className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Hard Problems
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search questions by title, description, or topic..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || selectedDifficulty !== 'all' || selectedCategory !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDifficulty('all');
                      setSelectedCategory('all');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Questions ({filteredQuestions.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredQuestions.map((question, index) => (
                    <Card key={question.id} className="hover:shadow-md transition-shadow border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm text-gray-500 font-mono">
                                {index + 1}.
                              </span>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {question.title}
                              </h3>
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.category}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {question.description.slice(0, 120)}...
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {question.timeLimit || 30} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" />
                                {question.hints.length} hints
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart className="h-3 w-3" />
                                {question.testCases.length} test cases
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-4">
                            <Button 
                              onClick={() => startQuestionPractice(question.id)}
                              size="sm"
                              className="gap-2"
                            >
                              <Play className="h-3 w-3" />
                              Practice
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredQuestions.length === 0 && (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions found</h3>
                      <p className="text-gray-600 mb-4">
                        Try adjusting your search filters or search terms.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedDifficulty('all');
                          setSelectedCategory('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PracticeDashboard;