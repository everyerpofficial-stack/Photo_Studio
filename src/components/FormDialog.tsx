import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function FormDialog({
  title,
  description,
  trigger,
  children,
  triggerLabel,
  wide,
}: {
  title: string;
  description?: string;
  trigger?: ReactNode;
  triggerLabel?: string;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="size-4" /> {triggerLabel ?? title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={wide ? "max-h-[90vh] overflow-y-auto sm:max-w-3xl" : "max-h-[90vh] overflow-y-auto sm:max-w-xl"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}
