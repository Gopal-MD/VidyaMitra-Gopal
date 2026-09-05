import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, TrendingUp, Award, BarChart3, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useInstitutionStudents, useInstitutionAnalytics } from '@/hooks/useDataQueries';

interface Student {
  id: string;
  email: string;
  name: string;
  student_category: string;
  target_role: string;
  created_at: string;
  interview_count: number;
  avg_score: number;
}

interface Analytics {
  totalStudents: number;
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  categoryBreakdown: Array<{ student_category: string; count: number }>;
  topPerformers: Array<{ id: string; name: string; email: string; avg_score: number; interview_count: number }>;
}

const InstitutionDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Use React Query hooks for data fetching with caching
  const { data: studentsData, isLoading: studentsLoading } = useInstitutionStudents(user?.id);
  const { data: analytics, isLoading: analyticsLoading } = useInstitutionAnalytics(user?.id);

  const students = studentsData?.students || [];

  const loading = studentsLoading || analyticsLoading;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              {user?.name}
            </h1>
            <p className="text-muted-foreground mt-1">Institution Dashboard - Track Student Progress</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">Registered students</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.completedInterviews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.totalInterviews || 0} total attempts
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.averageScore ? `${analytics.averageScore.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Across all interviews</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalInterviews
                    ? `${((analytics.completedInterviews / analytics.totalInterviews) * 100).toFixed(0)}%`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Interview completion</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Student Management Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Student Management</CardTitle>
            <CardDescription>View and manage your institution's students</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Students</TabsTrigger>
                <TabsTrigger value="performers">Top Performers</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Total: {students.length} students</p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Target Role</TableHead>
                        <TableHead className="text-right">Interviews</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No students linked to this institution yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name || 'N/A'}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.student_category || 'Not set'}</Badge>
                            </TableCell>
                            <TableCell>{student.target_role || 'Not set'}</TableCell>
                            <TableCell className="text-right">{student.interview_count}</TableCell>
                            <TableCell className="text-right">
                              {student.avg_score ? (
                                <span className={student.avg_score >= 70 ? 'text-green-600 font-medium' : student.avg_score >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                                  {student.avg_score.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="performers" className="space-y-4">
                <p className="text-sm text-muted-foreground">Top 5 performing students</p>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Interviews</TableHead>
                        <TableHead className="text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topPerformers && analytics.topPerformers.length > 0 ? (
                        analytics.topPerformers.map((performer, idx) => (
                          <TableRow key={performer.id}>
                            <TableCell>
                              <Badge variant={idx === 0 ? 'default' : 'outline'}>#{idx + 1}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{performer.name}</TableCell>
                            <TableCell>{performer.email}</TableCell>
                            <TableCell className="text-right">{performer.interview_count}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600 font-medium">
                                {performer.avg_score ? performer.avg_score.toFixed(1) : 'N/A'}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No performance data available yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-4">
                <p className="text-sm text-muted-foreground">Student distribution by category</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                    analytics.categoryBreakdown.map((cat) => (
                      <Card key={cat.student_category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">{cat.student_category || 'Not Specified'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{cat.count}</div>
                          <p className="text-xs text-muted-foreground">
                            {((cat.count / (analytics?.totalStudents || 1)) * 100).toFixed(0)}% of total
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No category data available
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>


            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InstitutionDashboard;
