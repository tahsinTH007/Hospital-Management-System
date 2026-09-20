import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Role, User } from "@/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  Mail,
  Lock,
  Building2,
  FileHeart,
  UserIcon,
} from "lucide-react";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UserValues,
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  SPECIALIZATION_OPTIONS,
  PATIENT_STATUS_OPTIONS,
  STAFF_STATUS_OPTIONS,
  userSchema,
} from "./create-user-schema";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createActivityLog, triggerAdmission, updateUser } from "@/lib/api";
import { emitSocket } from "@/lib/socket";

interface UserModalProps {
  role: Role;
  user?: User;
  loading?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  patient: "Patient",
  lab_tech: "Lab Technician",
  pharmacist: "Pharmacist",
};

const emptyValues = (role: Role): UserValues => ({
  name: "",
  email: "",
  password: "",
  specialization: "",
  department: "",
  age: "",
  gender: "",
  bloodgroup: "",
  medicalHistory: "",
  status: role === "patient" ? "admitted" : "active",
});

const CreateUserModal = ({ role, user, loading }: UserModalProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!user;
  const roleLabel = ROLE_LABELS[role] ?? role;

  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema(isEdit)),
    defaultValues: emptyValues(role),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      user
        ? {
            name: user.name,
            email: user.email,
            password: "",
            status: user.status,
            specialization: user.specialization || "",
            department: user.department || "",
            age: user.age || "",
            gender: user.gender || "",
            bloodgroup: user.bloodgroup || "",
            medicalHistory: user.medicalHistory || "",
          }
        : emptyValues(role),
    );
  }, [open, user, form, role]);

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    if (user) queryClient.invalidateQueries({ queryKey: ["user", user._id] });
  };

  const admitMutation = useMutation({
    mutationFn: triggerAdmission,
    onSuccess: () => {
      toast.info("AI triage started – doctor and nurse will be assigned shortly.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start admission");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      toast.success("User updated successfully!");
      setOpen(false);
      invalidateUsers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const activityMutation = useMutation({
    mutationFn: createActivityLog,
    onError: (error) => {
      console.error("Activity Log Error:", error);
    },
  });

  const onSubmit = async (data: UserValues) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      status: data.status,
    };

    if (role === "doctor") {
      payload.specialization = data.specialization;
      payload.department = data.department;
    } else if (role === "patient") {
      payload.age = data.age;
      payload.gender = data.gender;
      payload.bloodgroup = data.bloodgroup;
      payload.medicalHistory = data.medicalHistory;
    } else if (["nurse", "lab_tech", "pharmacist"].includes(role)) {
      payload.department = data.department;
    }

    if (isEdit && user) {
      if (data.password) {
        payload.password = data.password;
      }
      updateMutation.mutate({ userId: user._id, userData: payload });
      return;
    }

    setIsCreating(true);
    try {
      const { error, data: created } = await authClient.admin.createUser({
        name: data.name,
        email: data.email,
        password: data.password!,
        role: role as "admin",
        data: payload,
      });

      if (error || !created) {
        toast.error(error?.message || `Failed to create ${roleLabel.toLowerCase()}`);
        return;
      }

      if (role === "patient" && data.status === "admitted") {
        admitMutation.mutate({
          patientId: created.user.id,
          admissionReason: data.medicalHistory || "General Admission",
        });
      }

      emitSocket("notify_user_created");
      toast.success(`${roleLabel} created successfully!`);
      activityMutation.mutate({
        action: "create",
        details: `${roleLabel} account created for ${created.user.name}`,
      });
      invalidateUsers();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading =
    loading || isCreating || updateMutation.isPending || activityMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm" disabled={loading}>
            Edit
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus size={16} /> Add {roleLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[92vh] overflow-y-auto card">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "Add New"} {roleLabel}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update details for ${user?.name}.`
              : `Enter details to create a new ${roleLabel.toLowerCase()} account.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <CustomInput
            control={form.control}
            name="name"
            label="Full Name"
            placeholder="John Doe"
            autoComplete="off"
            startIcon={<UserIcon size={18} />}
          />

          <CustomInput
            control={form.control}
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@hospital.com"
            autoComplete="off"
            startIcon={<Mail size={18} />}
          />

          <CustomInput
            control={form.control}
            name="password"
            label={isEdit ? "New Password (Optional)" : "Password"}
            type="password"
            placeholder={isEdit ? "Leave blank to keep current" : "••••••••"}
            autoComplete="new-password"
            startIcon={<Lock size={18} />}
          />

          {role === "doctor" && (
            <>
              <CustomSelect
                control={form.control}
                name="specialization"
                label="Specialization"
                placeholder="Select Specialization"
                options={SPECIALIZATION_OPTIONS}
              />
              <CustomInput
                control={form.control}
                name="department"
                label="Department"
                placeholder="e.g. Cardiology Wing A"
                startIcon={<Building2 size={18} />}
              />
            </>
          )}
          {role === "patient" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  control={form.control}
                  name="age"
                  label="Age"
                  type="number"
                  min={0}
                  placeholder="e.g. 34"
                />
                <CustomSelect
                  control={form.control}
                  name="gender"
                  label="Gender"
                  options={GENDER_OPTIONS}
                />
              </div>
              <CustomSelect
                control={form.control}
                name="bloodgroup"
                label="Blood Group"
                options={BLOOD_GROUP_OPTIONS}
              />
              <CustomInput
                control={form.control}
                name="medicalHistory"
                label="Medical History / Allergies / Reason for Admission"
                placeholder="Peanuts, Penicillin..."
                startIcon={<FileHeart size={18} />}
              />
            </>
          )}
          {["nurse", "lab_tech", "pharmacist"].includes(role) && (
            <CustomInput
              control={form.control}
              name="department"
              label="Department"
              placeholder="e.g. ICU, Lab, Pharmacy"
              startIcon={<Building2 size={18} />}
            />
          )}
          <CustomSelect
            control={form.control}
            name="status"
            label="Status"
            placeholder="Select Status"
            options={
              role === "patient" ? PATIENT_STATUS_OPTIONS : STAFF_STATUS_OPTIONS
            }
          />
          <DialogFooter className="mt-6 border-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"} Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
