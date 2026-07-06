import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  Palette,
  Users,
  Zap,
  Lock,
  Globe,
  Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">
                Testimonials
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/login">
                <Button variant="ghost" className="rounded-xl">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="rounded-xl">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
              New: Real-time collaboration features
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Your workspace for{" "}
              <span className="text-primary">everything</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              CollabSpace brings together docs, boards, and chat in one beautiful
              platform. Collaborate in real-time, stay organized, and ship faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="rounded-xl text-base">
                  Start for free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-xl text-base">
                Watch demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free forever · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Product Showcase */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border bg-card overflow-hidden shadow-2xl">
            <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur px-6 py-3 rounded-xl border">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="font-medium">Product Demo Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to collaborate</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools that work together seamlessly to keep your team in sync.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: "Rich Documents",
                description: "Create beautiful docs with real-time collaboration, comments, and version history.",
              },
              {
                icon: Palette,
                title: "Design Boards",
                description: "Visual whiteboarding with infinite canvas, shapes, sticky notes, and live cursors.",
              },
              {
                icon: MessageSquare,
                title: "Team Chat",
                description: "Organized channels, threads, reactions, and file sharing all in one place.",
              },
              {
                icon: Users,
                title: "Workspaces",
                description: "Organize teams, projects, and documents with powerful permission controls.",
              },
              {
                icon: Zap,
                title: "Real-time Sync",
                description: "See changes instantly with live cursors, presence indicators, and auto-save.",
              },
              {
                icon: Lock,
                title: "Enterprise Security",
                description: "SSO, audit logs, advanced permissions, and compliance-ready features.",
              },
            ].map((feature, index) => (
              <Card key={index} className="rounded-2xl border-2 hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Demo */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
                <Globe className="h-3 w-3 mr-1 inline" />
                Real-time Collaboration
              </Badge>
              <h2 className="text-4xl font-bold mb-4">Work together, anywhere</h2>
              <p className="text-lg text-muted-foreground mb-6">
                See who's online, watch changes happen live, and collaborate seamlessly
                with your team across documents, boards, and chat.
              </p>
              <ul className="space-y-3">
                {[
                  "Live cursors and presence indicators",
                  "Real-time comments and mentions",
                  "Version history and time travel",
                  "Seamless conflict resolution",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Sarah Chen</p>
                    <p className="text-sm text-muted-foreground">Editing document...</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                    Online
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" />
                    <AvatarFallback>AM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Alex Martinez</p>
                    <p className="text-sm text-muted-foreground">Viewing board...</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                    Online
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop" />
                    <AvatarFallback>MJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Maria Johnson</p>
                    <p className="text-sm text-muted-foreground">Left a comment</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    <span className="h-2 w-2 rounded-full bg-gray-400 mr-1" />
                    Away
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by teams worldwide</h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of teams already using CollabSpace
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Emily Rodriguez",
                role: "Product Manager at TechCorp",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
                content: "CollabSpace transformed how our team works. Real-time collaboration has never been this smooth.",
              },
              {
                name: "David Kim",
                role: "Design Lead at CreativeStudio",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                content: "The design boards are incredible. It's like Figma and Notion had a baby. We're obsessed.",
              },
              {
                name: "Lisa Thompson",
                role: "Engineering Manager at DevLabs",
                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
                content: "Finally, one tool for everything. No more switching between five different apps. Game changer.",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="rounded-2xl">
                <CardHeader>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <CardDescription className="text-base">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} />
                      <AvatarFallback>
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for trying out CollabSpace",
                features: [
                  "Up to 10 team members",
                  "Unlimited documents",
                  "5 GB storage",
                  "7-day version history",
                  "Community support",
                ],
                cta: "Get started",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "$12",
                description: "For growing teams",
                features: [
                  "Unlimited team members",
                  "Unlimited everything",
                  "100 GB storage",
                  "Unlimited version history",
                  "Priority support",
                  "Advanced permissions",
                ],
                cta: "Start free trial",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For large organizations",
                features: [
                  "Everything in Pro",
                  "Unlimited storage",
                  "SSO & SAML",
                  "Advanced security",
                  "Audit logs",
                  "Dedicated support",
                ],
                cta: "Contact sales",
                highlighted: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`rounded-2xl ${
                  plan.highlighted ? "border-primary border-2 shadow-xl" : ""
                }`}
              >
                <CardHeader>
                  {plan.highlighted && (
                    <Badge className="w-fit mb-2">Most popular</Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className={`w-full rounded-xl mb-6 ${
                      plan.highlighted ? "" : "variant-outline"
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-12 text-center text-primary-foreground">
            <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of teams already collaborating on CollabSpace.
              Start free, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="rounded-xl text-base">
                  Start for free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl text-base bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
              >
                Schedule a demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo />
              <p className="text-sm text-muted-foreground mt-4">
                Your workspace for everything. Collaborate, create, and ship faster.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
                <li><a href="#" className="hover:text-foreground">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Community</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 CollabSpace. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
              <a href="#" className="hover:text-foreground">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
