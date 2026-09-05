import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, BookOpen, Star, Clock, TrendingUp, Target, Award } from "lucide-react";
import { SkillGapAnalysis, CourseRecommendation, LearningPath } from "@/utils/learningRecommendations";
import { motion } from "framer-motion";

interface LearningRecommendationsProps {
  skillGapAnalysis: SkillGapAnalysis;
  title?: string;
  showOverallScore?: boolean;
}

const LearningRecommendations = ({ 
  skillGapAnalysis, 
  title = "🎯 Skill Gap Analysis & Learning Recommendations",
  showOverallScore = true 
}: LearningRecommendationsProps) => {
  const { overallScore, strengths, weaknesses, learningPaths, recommendedCourses } = skillGapAnalysis;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium": 
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-blue-100 text-blue-800";
      case "Intermediate":
        return "bg-purple-100 text-purple-800"; 
      case "Advanced":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
          <CardDescription>
            Personalized learning recommendations based on your performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showOverallScore && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Overall Performance</h3>
                <Badge className={getScoreBadge(overallScore)}>
                  {overallScore.toFixed(1)}/100
                </Badge>
              </div>
              <Progress 
                value={overallScore} 
                className="h-3 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {overallScore >= 80 ? "Excellent performance! Focus on advanced concepts." :
                 overallScore >= 60 ? "Good foundation. Work on identified skill gaps." :
                 "Significant improvement needed. Start with fundamentals."}
              </p>
            </div>
          )}

          {/* Strengths & Weaknesses Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                <Award className="h-4 w-4 mr-1" />
                Strengths
              </h4>
              <div className="flex flex-wrap gap-1">
                {strengths.slice(0, 5).map((strength, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    {strength}
                  </Badge>
                ))}
                {strengths.length > 5 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                    +{strengths.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                <Target className="h-4 w-4 mr-1" />
                Areas to Improve
              </h4>
              <div className="flex flex-wrap gap-1">
                {weaknesses.slice(0, 5).map((weakness, index) => (
                  <Badge key={index} variant="secondary" className="bg-red-100 text-red-800 text-xs">
                    {weakness}
                  </Badge>
                ))}
                {weaknesses.length > 5 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                    +{weaknesses.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Paths */}
      {learningPaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Recommended Learning Paths
            </CardTitle>
            <CardDescription>
              Structured learning paths to address your skill gaps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningPaths.map((path, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{path.category}</h4>
                    <Badge className={getPriorityBadge(path.priority)}>
                      {path.priority} Priority
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-2">Focus Areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {path.skillGaps.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {path.recommendations.map((course, idx) => (
                      <CourseCard key={idx} course={course} compact />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Course Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Top Course Recommendations
          </CardTitle>
          <CardDescription>
            Curated courses from top platforms to boost your skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface CourseCardProps {
  course: CourseRecommendation;
  compact?: boolean;
}

const CourseCard = ({ course, compact = false }: CourseCardProps) => {
  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-blue-100 text-blue-800";
      case "Intermediate":
        return "bg-purple-100 text-purple-800";
      case "Advanced":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (compact) {
    return (
      <div className="border rounded-md p-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <h5 className="font-medium text-sm leading-tight">{course.title}</h5>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={getLevelBadge(course.level)} variant="secondary">
            {course.level}
          </Badge>
          <span className="text-xs text-muted-foreground">{course.provider}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-xs">{course.rating}</span>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
          <Badge className={getLevelBadge(course.level)}>
            {course.level}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{course.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{course.duration}</span>
              </div>
            </div>
            <span className="font-semibold">{course.price}</span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Skills you'll learn:</p>
            <div className="flex flex-wrap gap-1">
              {course.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {course.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{course.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>

          <Button className="w-full" asChild>
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              View Course on {course.provider}
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningRecommendations;