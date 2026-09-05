import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileText, CheckCircle, XCircle, Trophy, Users, Medal } from "lucide-react";
import { toast } from "sonner";
import { processResume, ResumeData } from "@/utils/atsParser";
import { jobRoles } from "@/utils/interviewUtils";
import { uploadResumeToS3 } from "@/lib/resumeService";

interface ProcessedResume {
  id: string;
  fileName: string;
  status: 'success' | 'failed';
  resumeData?: ResumeData;
  atsScore: number;
  rank?: number;
}

export const BulkResumeUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedResume[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate: PDFs only and <= 5MB
    const validated = selectedFiles.filter(f => {
      if (f.type !== 'application/pdf') {
        toast.error(`${f.name} skipped (only PDF allowed)`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} skipped (max 5MB)`);
        return false;
      }
      return true;
    });

    // Merge with existing and de-duplicate by name+size+lastModified
    const merged = [...files, ...validated];
    const uniqueMap = new Map<string, File>();
    for (const f of merged) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, f);
    }
    const unique = Array.from(uniqueMap.values());

    setFiles(unique);
    setResults([]);

    // Reset input value to allow re-selecting the same files later
    e.currentTarget.value = "";
  };

const removeFile = (index: number) => {
  setFiles(prev => prev.filter((_, i) => i !== index));
};

const clearFiles = () => {
  setFiles([]);
  setResults([]);
};

const handleBulkUpload = async () => {
    if (files.length === 0) return;
    if (!selectedRole) {
      toast.error("Please select a role first");
      return;
    }

    console.log(`📦 Starting bulk resume processing for ${files.length} files (role: ${selectedRole})`);
    
    setProcessing(true);
    setProgress(0);
    const processedResults: ProcessedResume[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`📄 [${i + 1}/${files.length}] Processing: ${files[i].name}`);
        const resumeData = await processResume(files[i], selectedRole);
        
        console.log(`✅ [${i + 1}/${files.length}] Success: ${files[i].name} (Score: ${resumeData.atsScore}%)`);

        // Upload PDF to S3
        uploadResumeToS3(files[i]).catch(() => {
          console.warn(`⚠️ S3 upload failed for ${files[i].name}`);
        });
        
        processedResults.push({
          id: `resume-${Date.now()}-${i}`,
          fileName: files[i].name,
          status: 'success',
          resumeData,
          atsScore: resumeData.atsScore
        });
      } catch (error) {
        console.error(`❌ [${i + 1}/${files.length}] Failed: ${files[i].name}`, error);
        console.error('Error details:', {
          message: error?.message,
          name: error?.name
        });
        
        processedResults.push({
          id: `resume-${Date.now()}-${i}`,
          fileName: files[i].name,
          status: 'failed',
          atsScore: 0
        });
        
        // Show toast for individual failures
        toast.error(`Failed to process ${files[i].name}`);
      }
      
      setProgress(((i + 1) / files.length) * 100);
    }

    // Sort by ATS score and assign ranks
    const sortedResults = processedResults
      .filter(r => r.status === 'success')
      .sort((a, b) => b.atsScore - a.atsScore)
      .map((result, index) => ({ ...result, rank: index + 1 }));
    
    const failedResults = processedResults.filter(r => r.status === 'failed');
    
    console.log(`📊 Bulk processing complete: ${sortedResults.length} successful, ${failedResults.length} failed`);
    
    setResults([...sortedResults, ...failedResults]);
    setProcessing(false);
    
    const successCount = sortedResults.length;
    const failureCount = failedResults.length;
    
    if (successCount > 0 && failureCount === 0) {
      toast.success(`✅ Successfully processed all ${successCount} resumes!`);
    } else if (successCount > 0 && failureCount > 0) {
      toast.warning(`⚠️ Processed ${successCount} resumes, ${failureCount} failed`);
    } else {
      toast.error(`❌ All ${failureCount} resumes failed to process`);
    }
  };

  const exportResults = () => {
    const selectedRoleTitle = jobRoles.find(r => r.id === selectedRole)?.title || selectedRole;
    const csvContent = [
      ['Rank', 'File Name', 'Target Role', 'ATS Score (%)', 'Matched Skills', 'Missing Skills', 'Experience Match (%)', 'Education Match (%)', 'Status'].join(','),
      ...results.map(r => [
        r.rank || 'N/A',
        `"${r.fileName}"`,
        `"${selectedRoleTitle}"`,
        r.atsScore || 0,
        r.resumeData ? `"${r.resumeData.atsAnalysis.matchedSkills.join('; ')}"` : 'N/A',
        r.resumeData ? `"${r.resumeData.atsAnalysis.missingSkills.join('; ')}"` : 'N/A',
        r.resumeData?.atsAnalysis.experienceMatch || 0,
        r.resumeData?.atsAnalysis.educationMatch || 0,
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-analysis-${selectedRoleTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk Resume Upload & Analysis
        </CardTitle>
        <CardDescription>
          Upload multiple resumes and analyze them against a specific role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Target Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose the role to analyze resumes against" />
            </SelectTrigger>
            <SelectContent>
              {jobRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {role.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Upload Resumes (PDF only, max 5MB each)</label>
          <Input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFilesChange}
            disabled={processing}
          />
          {files.length > 0 && (
            <div className="mt-3 rounded-md border bg-muted/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm">
                  Selected files: <span className="font-medium">{files.length}</span>
                </p>
                <Button variant="ghost" size="sm" onClick={clearFiles} disabled={processing}>
                  Clear all
                </Button>
              </div>
              <ul className="max-h-40 overflow-auto space-y-1">
                {files.map((f, idx) => (
                  <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between text-sm">
                    <span className="truncate mr-2">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(idx)} disabled={processing}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleBulkUpload}
            disabled={files.length === 0 || processing || !selectedRole}
            className="flex-1"
          >
            {processing ? (
              "Processing..."
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Process {files.length} Resume{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          {results.length > 0 && (
            <Button onClick={exportResults} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {processing && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Processing {files.length} resumes...
            </p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {/* Top Candidates Summary */}
            {results.filter(r => r.status === 'success').length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold">Top Candidates for {jobRoles.find(r => r.id === selectedRole)?.title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results
                    .filter(r => r.status === 'success')
                    .slice(0, 3)
                    .map((resume, index) => (
                      <div key={resume.id} className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center gap-2 mb-2">
                          {index === 0 && <Medal className="h-4 w-4 text-yellow-500" />}
                          {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                          {index === 2 && <Medal className="h-4 w-4 text-orange-600" />}
                          <span className="font-medium text-sm">#{resume.rank}</span>
                        </div>
                        <div className="text-sm font-medium truncate mb-1">{resume.fileName}</div>
                        <div className="text-2xl font-bold text-blue-600 mb-1">{resume.atsScore}%</div>
                        <div className="text-xs text-muted-foreground">
                          {resume.resumeData?.atsAnalysis.matchedSkills.length || 0} skills matched
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Detailed Results Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>ATS Score</TableHead>
                    <TableHead>Matched Skills</TableHead>
                    <TableHead>Missing Skills</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Education</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((resume) => (
                    <TableRow key={resume.id} className={resume.rank === 1 ? "bg-yellow-50 border-yellow-200" : ""}>
                      <TableCell>
                        {resume.rank && (
                          <div className="flex items-center gap-1">
                            {resume.rank === 1 && <Trophy className="h-4 w-4 text-yellow-600" />}
                            <span className="font-bold">#{resume.rank}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {resume.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <div className="max-w-[200px] truncate font-medium">{resume.fileName}</div>
                            {resume.resumeData?.parsedData.name && (
                              <div className="text-xs text-muted-foreground">{resume.resumeData.parsedData.name}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${
                            resume.atsScore >= 80 ? 'text-green-600' :
                            resume.atsScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {resume.atsScore}%
                          </span>
                          {resume.atsScore >= 80 && <Badge variant="default" className="bg-green-500">Excellent</Badge>}
                          {resume.atsScore >= 60 && resume.atsScore < 80 && <Badge variant="secondary">Good</Badge>}
                          {resume.atsScore < 60 && <Badge variant="outline">Needs Review</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          {resume.resumeData?.atsAnalysis.matchedSkills.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="mr-1 mb-1 text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(resume.resumeData?.atsAnalysis.matchedSkills.length || 0) > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{(resume.resumeData?.atsAnalysis.matchedSkills.length || 0) - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          {resume.resumeData?.atsAnalysis.missingSkills.slice(0, 2).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="mr-1 mb-1 text-xs text-red-600">
                              {skill}
                            </Badge>
                          ))}
                          {(resume.resumeData?.atsAnalysis.missingSkills.length || 0) > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{(resume.resumeData?.atsAnalysis.missingSkills.length || 0) - 2} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{resume.resumeData?.atsAnalysis.experienceMatch || 0}%</span>
                          <div className="text-xs text-muted-foreground">
                            {resume.resumeData?.parsedData.totalExperienceYears || 0} years
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{resume.resumeData?.atsAnalysis.educationMatch || 0}%</span>
                          <div className="text-xs text-muted-foreground max-w-[100px] truncate">
                            {resume.resumeData?.parsedData.education[0] || 'Not specified'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {resume.resumeData?.parsedData.email && (
                            <div>📧 {resume.resumeData.parsedData.email}</div>
                          )}
                          {resume.resumeData?.parsedData.phone && (
                            <div>📱 {resume.resumeData.parsedData.phone}</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};