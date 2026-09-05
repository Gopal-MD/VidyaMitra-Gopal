import React, { useState, useEffect, useCallback } from "react";
import { s3Api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  FileText,
  Trash2,
  Download,
  RefreshCw,
  ChevronLeft,
  HardDrive,
  Image,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowUpFromLine,
} from "lucide-react";

interface S3File {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

interface S3Stats {
  bucketName: string;
  region: string;
  folders: Record<string, { count: number; totalSize: number }>;
  totalFiles: number;
  totalSize: number;
  totalSizeMB: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(key: string) {
  const ext = key.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')) return <Image className="h-4 w-4 text-purple-500" />;
  if (['pdf'].includes(ext || '')) return <FileText className="h-4 w-4 text-red-500" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="h-4 w-4 text-blue-500" />;
  if (['csv', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function getFileName(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

export default function S3Manager() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [stats, setStats] = useState<S3Stats | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async (prefix: string = "") => {
    setLoading(true);
    try {
      const data = await s3Api.listFiles(prefix, 200);
      setFiles(data.files || []);
      setFolders(data.folders || []);
      setCurrentPrefix(prefix);
      setSelectedFiles(new Set());
    } catch (err: any) {
      toast.error("Failed to load files: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await s3Api.getStats();
      setStats(data);
    } catch (err: any) {
      toast.error("Failed to load stats: " + err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [loadFiles, loadStats]);

  const handleDownload = async (key: string) => {
    try {
      const { url } = await s3Api.getDownloadUrl(key);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error("Download failed: " + err.message);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget) {
        await s3Api.deleteFile(deleteTarget);
        toast.success(`Deleted: ${getFileName(deleteTarget)}`);
      } else if (selectedFiles.size > 0) {
        const result = await s3Api.bulkDelete(Array.from(selectedFiles));
        toast.success(`Deleted ${result.deleted} file(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setSelectedFiles(new Set());
      loadFiles(currentPrefix);
      loadStats();
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const folder = currentPrefix || 'exports/';
    const folderName = folder.replace('/', '');
    const validFolders = ['resumes', 'profile-pictures', 'institution-logos', 'exports'];
    if (!validFolders.includes(folderName)) {
      toast.error('Navigate into a folder before uploading');
      return;
    }

    setUploading(true);
    try {
      const result = await s3Api.uploadFile(file, folderName);
      toast.success(`Uploaded: ${result.fileName} (${formatFileSize(result.size)})`);
      loadFiles(currentPrefix);
      loadStats();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleSelectFile = (key: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.key)));
    }
  };

  const navigateToFolder = (prefix: string) => {
    loadFiles(prefix);
  };

  const navigateBack = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    loadFiles(parts.length > 0 ? parts.join('/') + '/' : '');
  };

  const breadcrumbs = currentPrefix.split('/').filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Loading...</div>
              </CardContent>
            </Card>
          ))
        ) : stats && (
          <>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Storage</p>
                    <p className="text-lg font-bold">{stats.totalSizeMB} MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(stats.folders).map(([folder, data]) => (
              <Card key={folder}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground capitalize">{folder.replace('-', ' ')}</p>
                      <p className="text-lg font-bold">{data.count} <span className="text-xs font-normal text-muted-foreground">({formatFileSize(data.totalSize)})</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* File Browser */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                S3 File Browser
              </CardTitle>
              <CardDescription>
                Bucket: vidyamitra-uploads-629496 • Region: us-east-1
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteTarget(null); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedFiles.size})
                </Button>
              )}
              <label>
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4 mr-1" />}
                    Upload
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              <Button variant="outline" size="sm" onClick={() => { loadFiles(currentPrefix); loadStats(); }} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 mb-3 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => loadFiles('')}
            >
              🪣 Root
            </Button>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="text-muted-foreground">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => navigateToFolder(breadcrumbs.slice(0, i + 1).join('/') + '/')}
                >
                  {crumb}
                </Button>
              </React.Fragment>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {currentPrefix && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 h-12"
                      onClick={navigateBack}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                  {folders.map(folder => (
                    <Button
                      key={folder}
                      variant="outline"
                      className="justify-start gap-2 h-12"
                      onClick={() => navigateToFolder(folder)}
                    >
                      <FolderOpen className="h-4 w-4 text-amber-500" />
                      {folder.replace(currentPrefix, '').replace('/', '')}
                    </Button>
                  ))}
                </div>
              )}

              {/* Back button when inside a folder without sub-folders */}
              {currentPrefix && folders.length === 0 && (
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-10 mb-4"
                  onClick={navigateBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {/* Files Table */}
              {files.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={selectedFiles.size === files.length && files.length > 0}
                            onChange={selectAll}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map(file => (
                        <TableRow key={file.key} className="hover:bg-muted/20">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.key)}
                              onChange={() => toggleSelectFile(file.key)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.key)}
                              <div>
                                <p className="font-medium text-sm">{getFileName(file.key)}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-md">{file.key}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {file.lastModified ? new Date(file.lastModified).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(file.key)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { setDeleteTarget(file.key); setDeleteDialogOpen(true); }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No files in this location</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentPrefix ? 'This folder is empty' : 'Navigate into a folder to view files'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${getFileName(deleteTarget)}"?`
                : `Are you sure you want to delete ${selectedFiles.size} file(s)?`
              }
              <br />This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
