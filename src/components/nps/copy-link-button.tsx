"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path }: { path: string }) {
  async function handleClick() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Link2 className="mr-1 h-4 w-4" /> Copiar link
    </Button>
  );
}
