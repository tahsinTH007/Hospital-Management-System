import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User as UserType } from "@/types";
import Profile from "./tabs/profile";
import History from "./tabs/History";
import Radiology from "./tabs/Radiology";
import { STATUS_CONFIG } from "./statusBadge";
import { getInitials } from "@/lib/utils";

interface UserDetailsSheetProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailsSheet({ user, isOpen, onClose }: UserDetailsSheetProps) {
  if (!user) return null;

  const isPatient = user.role === "patient";
  const statusConf = STATUS_CONFIG[user.status] || STATUS_CONFIG["active"]!;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="inset-y-2! right-2! h-auto! w-[calc(100vw-1rem)] sm:w-full sm:max-w-xl rounded-xl border shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-950 flex flex-col"
        side="right"
      >
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b shrink-0">
          <SheetHeader className="flex flex-row items-center gap-4 space-y-0 text-left">
            <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-700">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold truncate">
                {user.name}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  {user.role.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={statusConf.color}>
                  {statusConf.label}
                </Badge>
              </SheetDescription>
            </div>
          </SheetHeader>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList
                className={`grid w-full mb-6 ${isPatient ? "grid-cols-3" : "grid-cols-1"}`}
              >
                <TabsTrigger value="profile">Profile</TabsTrigger>
                {isPatient && (
                  <TabsTrigger value="history">History & AI</TabsTrigger>
                )}
                {isPatient && (
                  <TabsTrigger value="radiology">X-Rays</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="profile">
                <Profile user={user} />
              </TabsContent>
              {isPatient && (
                <>
                  <TabsContent value="history">
                    <History user={user} />
                  </TabsContent>
                  <TabsContent value="radiology">
                    <Radiology patientId={user._id} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
