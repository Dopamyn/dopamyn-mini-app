import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckQuest: () => void;
  title?: string;
  description?: string;
}

export function SuccessPopup({
  isOpen,
  onClose,
  onCheckQuest,
  title = "Campaign Created Successfully!",
  description = "Your campaign has been published and is now live on the platform.",
}: SuccessPopupProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Prevent closing the dialog
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md bg-dark-secondary border-dark-alpha-tertiary rounded-none"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-none">
            <CheckCircle2 className="h-12 w-12 text-accent-brand" />
          </div>
          <DialogTitle className="text-xl font-bold text-light-primary flex items-center justify-center gap-2">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-2">
          <div className="text-center">
            <p className="text-base text-light-secondary leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={onCheckQuest}
              className="h-12 bg-accent-brand hover:bg-accent-brand/90 text-black font-semibold rounded-none border-0 transition-all duration-200"
            >
              Check Campaign Now
            </Button>
            {/* <Button
              variant="outline"
              onClick={onClose}
              className="h-12 bg-dark-secondary border-dark-alpha-tertiary text-light-primary hover:bg-dark-secondary hover:text-light-primary rounded-none transition-all duration-200"
            >
              Close
            </Button> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
