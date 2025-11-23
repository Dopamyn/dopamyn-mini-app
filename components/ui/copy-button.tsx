import { copyToClipboard } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`hover:bg-gray-700 ${className}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="text-accent-brand w-4 h-4" />
      ) : (
        <Copy className="text-gray-200 hover:text-accent-brand transition-colors w-4 h-4" />
      )}
    </Button>
  );
}
