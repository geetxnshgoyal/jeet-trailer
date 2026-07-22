"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Calendar, Clock, User, Truck, Clipboard, Loader2 } from "lucide-react";
import { useIssue, useCompleteInstallation, useUploadPhotos } from "../hooks";
import { IssueStatusBadge } from "./issue-status-badge";
import { PhotoUpload } from "./photo-upload";
import { PhotoGallery } from "./photo-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatDate, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";

export function IssueDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: issue, isLoading, error } = useIssue(id);
  const uploadPhotosMutation = useUploadPhotos(id);
  const completeMutation = useCompleteInstallation(id);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canComplete = user?.role === "admin" || (issue && issue.workerId === user?.id);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;
    if (files.length === 0) {
      toast.error("Upload at least one installation photo.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload files
      toast.info("Uploading installation photos...");
      const uploadRes = await uploadPhotosMutation.mutateAsync(files);
      
      // 2. Complete installation
      toast.info("Completing installation record...");
      await completeMutation.mutateAsync({
        notes: notes || undefined,
        // Send the uploaded photo refs in the body
        photos: uploadRes.photos,
      } as any);

      toast.success("Installation marked complete!");
      setFiles([]);
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete installation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full animate-pulse" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground font-medium">Issue record not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/issues">Back to issues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/issues">
            <ArrowLeft className="size-4" />
            Issue Logs
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Issue Log: {issue.code}
              </h1>
              <IssueStatusBadge status={issue.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {formatDateTime(issue.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Details Card */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Clipboard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Item</p>
                <p className="font-medium truncate">{issue.itemName}</p>
                <p className="font-mono text-xs text-muted-foreground">{issue.itemCode}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Vehicle Number</p>
                <p className="font-semibold tracking-wide font-mono text-foreground">{issue.vehicleNumber || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Issued To</p>
                <p className="font-medium">{issue.workerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quantity Issued</p>
                <p className="font-semibold">{issue.quantity}</p>
              </div>
            </div>

            {issue.serialNumber && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Clipboard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Serial Number</p>
                  <p className="font-mono font-medium">{issue.serialNumber}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow & Status Card */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Installation Verification</CardTitle>
            <CardDescription>
              {issue.status === "installed"
                ? `Completed by ${issue.workerName} on ${formatDateTime(issue.installedAt || "")}`
                : "Record installation details and attach photographic evidence."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {issue.status === "installed" ? (
              <div className="space-y-6">
                {issue.notes && (
                  <div className="rounded-lg bg-muted/60 p-4 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Installation Notes</p>
                    <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{issue.notes}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Photos Uploaded</p>
                  <PhotoGallery photos={issue.photos} />
                </div>
              </div>
            ) : (
              <>
                {canComplete ? (
                  <form onSubmit={handleComplete} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">1. Upload Installation Photos</Label>
                      <PhotoUpload
                        files={files}
                        onFilesChange={setFiles}
                        isUploading={submitting}
                      />
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="notes" className="text-sm font-semibold">2. Add Installation Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add details about alignment, welding inspect, tyre pressure..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={submitting}
                        className="h-24 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={submitting || files.length === 0} className="w-full sm:w-auto">
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Installation Complete
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Only the worker who issued this item or an administrator can complete this installation.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
