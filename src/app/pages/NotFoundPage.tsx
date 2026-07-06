import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Logo } from "../components/Logo";
import { Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-background">
      <div className="text-center max-w-md">
        <Logo size="lg" />
        <div className="mt-12 mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-bold mb-2">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have been
            moved or deleted.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button className="rounded-xl gap-2">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
