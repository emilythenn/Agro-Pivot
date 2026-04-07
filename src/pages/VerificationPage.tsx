import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle, FileText, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const FARMER_DOCS = [
  { key: "mykad", label: "MyKad / ID", description: "Upload a copy of your identification card", hasFile: true, hasRef: true, refLabel: "IC Number" },
  { key: "farm_address", label: "Farm Address Proof", description: "Land title, utility bill, or tenancy agreement", hasFile: true, hasRef: false },
  { key: "doa_registration", label: "DOA Registration", description: "Farm registration with Department of Agriculture Malaysia", hasFile: true, hasRef: true, refLabel: "Registration No." },
  { key: "mygap", label: "MyGAP / Organic Certification", description: "Optional - MyGAP or organic certification", hasFile: true, hasRef: true, refLabel: "Certificate No." },
];

const SELLER_DOCS = [
  { key: "ssm", label: "SSM Registration", description: "Business registration certificate", hasFile: true, hasRef: true, refLabel: "SSM No." },
  { key: "mykad", label: "MyKad / ID", description: "Upload a copy of your identification card", hasFile: true, hasRef: true, refLabel: "IC Number" },
  { key: "business_address", label: "Business Address Proof", description: "Proof of business address", hasFile: true, hasRef: false },
  { key: "seed_cert", label: "Seed Certification", description: "Department of Agriculture Malaysia seed certification", hasFile: true, hasRef: true, refLabel: "Certificate No." },
];

export default function VerificationPage() {
  const { user } = useAuth();
  const { role, canVerify } = useUserRole();
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [existingRefs, setExistingRefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [refNumbers, setRefNumbers] = useState<Record<string, string>>({});

  const docTypes = role === "seed_seller" ? SELLER_DOCS : FARMER_DOCS;

  useEffect(() => {
    fetchVerification();
  }, [user]);

  const fetchVerification = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setVerificationStatus(data.status);
      const docs = Array.isArray(data.documents) ? data.documents : [];
      setExistingDocs(docs);
      const refs = typeof data.reference_numbers === "object" && data.reference_numbers ? data.reference_numbers as Record<string, string> : {};
      setExistingRefs(refs);
      setRefNumbers(refs);
      // Map existing doc URLs
      const fileMap: Record<string, string> = {};
      docs.forEach((d: any) => { if (d.key && d.url) fileMap[d.key] = d.url; });
      setUploadedFiles(fileMap);
    }
    setLoading(false);
  };

  const handleUpload = async (key: string, file: File) => {
    if (!user) return;
    setUploadingKey(key);
    const filePath = `${user.id}/${key}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("verification-docs").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("verification-docs").getPublicUrl(filePath);
      setUploadedFiles(prev => ({ ...prev, [key]: urlData.publicUrl }));
      toast({ title: "File uploaded" });
    }
    setUploadingKey(null);
  };

  const handleSubmit = async () => {
    if (!user || !role) return;
    setSubmitting(true);

    const documents = Object.entries(uploadedFiles).map(([key, url]) => ({ key, url }));

    const payload = {
      user_id: user.id,
      verification_type: role === "seed_seller" ? "seed_seller" : "farmer",
      documents: documents,
      reference_numbers: refNumbers,
      status: "pending",
      submitted_at: new Date().toISOString(),
    };

    let error;
    if (verificationStatus) {
      // Update existing
      const res = await supabase.from("verification_requests").update(payload).eq("user_id", user.id);
      error = res.error;
    } else {
      // Insert new
      const res = await supabase.from("verification_requests").insert(payload);
      error = res.error;
    }

    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification submitted!", description: "Your documents are under review." });
      setVerificationStatus("pending");
    }
  };

  if (!canVerify) {
    return (
      <div className="text-center py-16">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Verification is available for farmers and seed sellers only.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit your documents to get a verified badge. Verification is optional but builds trust with buyers.
        </p>
      </div>

      {/* Status Banner */}
      {verificationStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          verificationStatus === "verified" ? "bg-green-500/5 border-green-500/20" :
          verificationStatus === "pending" ? "bg-amber-500/5 border-amber-500/20" :
          "bg-destructive/5 border-destructive/20"
        }`}>
          {verificationStatus === "verified" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
           verificationStatus === "pending" ? <Clock className="h-5 w-5 text-amber-500" /> :
           <XCircle className="h-5 w-5 text-destructive" />}
          <div>
            <p className="text-sm font-medium text-foreground">
              {verificationStatus === "verified" ? "Verified ✓" :
               verificationStatus === "pending" ? "Pending Review" :
               "Verification Rejected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {verificationStatus === "verified" ? "Your profile is verified. A badge is shown on your marketplace listings." :
               verificationStatus === "pending" ? "Your documents are being reviewed. This usually takes 1-3 business days." :
               "Please resubmit your documents with the correct information."}
            </p>
          </div>
        </div>
      )}

      {/* Document Upload Cards */}
      <div className="space-y-4">
        {docTypes.map(doc => (
          <motion.div key={doc.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> {doc.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
              </div>
              {uploadedFiles[doc.key] && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>

            {/* File Upload */}
            {doc.hasFile && (
              <div>
                <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border/50 rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                  {uploadingKey === doc.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {uploadedFiles[doc.key] ? "File uploaded ✓ (click to replace)" : "Upload file (PDF, JPG, PNG)"}
                  </span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => { if (e.target.files?.[0]) handleUpload(doc.key, e.target.files[0]); }} />
                </label>
              </div>
            )}

            {/* Reference Number */}
            {doc.hasRef && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block flex items-center gap-1">
                  <Hash className="h-3 w-3" /> {doc.refLabel}
                </label>
                <input value={refNumbers[doc.key] || ""} onChange={e => setRefNumbers(prev => ({ ...prev, [doc.key]: e.target.value }))}
                  placeholder={`Enter ${doc.refLabel}`}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {verificationStatus ? "Resubmit Verification" : "Submit for Verification"}
      </Button>
    </div>
  );
}
