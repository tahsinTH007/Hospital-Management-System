import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomInput } from "@/components/global/CustomInput";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { createLabResult, deleteFile } from "@/lib/api";

const XRayUploadModal = ({ patientId }: { patientId: string }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm({ defaultValues: { bodyPart: "" } });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createLabResult,
    onSuccess: () => {
      setOpen(false);
      toast.success("X-Ray recorded – AI analysis will follow shortly");
      form.reset();
      setImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["lab-results", patientId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record X-Ray");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      setImageUrl("");
      toast.success("File removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });

  const handleSave = (formData: { bodyPart: string }) => {
    if (!imageUrl) return toast.error("Please upload an image first");
    if (!formData.bodyPart.trim()) return toast.error("Please enter the body part");
    mutation.mutate({
      patientId,
      testType: "X-Ray",
      bodyPart: formData.bodyPart.trim(),
      imageUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Upload X-Ray
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg card">
        <DialogHeader>
          <DialogTitle>Upload New X-Ray</DialogTitle>
          <DialogDescription>
            The image is analysed by AI automatically after saving.
          </DialogDescription>
        </DialogHeader>
        {!imageUrl ? (
          <UploadDropzone
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              const url = res[0]?.ufsUrl;
              if (!url) {
                toast.error("Upload did not return a file URL");
                return;
              }
              setImageUrl(url);
              toast.success("Image uploaded");
            }}
            headers={async () => {
              const session = await authClient.getSession();
              return {
                Authorization: `Bearer ${session.data?.session.token ?? ""}`,
              };
            }}
            onUploadError={(error: Error) => {
              toast.error(`Upload failed: ${error.message}`);
              console.error("Upload Error:", error);
            }}
            className="border-dashed border-slate-300 dark:border-slate-500 ut-label:text-blue-600"
          />
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-full w-full object-contain"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                type="button"
                onClick={() => deleteMutation.mutate({ file: imageUrl })}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </div>

            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="space-y-3"
            >
              <CustomInput
                control={form.control}
                name="bodyPart"
                label="Body Part"
                placeholder="e.g. Left Knee"
                disabled={mutation.isPending}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : "Save to Patient Record"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default XRayUploadModal;
