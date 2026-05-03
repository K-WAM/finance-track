import { Link } from "wouter";
import { TrendingUp, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <TrendingUp className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-5xl font-bold text-foreground">404</h1>
      <h2 className="text-xl font-semibold mt-2 text-foreground">Page Not Found</h2>
      <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button className="mt-6" data-testid="button-go-home">
          <Home className="w-4 h-4 mr-2" /> Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
