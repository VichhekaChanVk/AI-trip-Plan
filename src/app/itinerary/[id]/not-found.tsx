import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Trip not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Button asChild className="mt-6">
        <Link href="/">Plan a new trip</Link>
      </Button>
    </div>
  );
}
