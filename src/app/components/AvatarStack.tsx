import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface User {
  id: string;
  name: string;
  avatar?: string;
  online?: boolean;
}

interface AvatarStackProps {
  users: User[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarStack({ users, max = 5, size = "md" }: AvatarStackProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <TooltipProvider>
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger>
              <div className="relative">
                <Avatar className={`${sizes[size]} border-2 border-background`}>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className={textSizes[size]}>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.online && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <Avatar className={`${sizes[size]} border-2 border-background bg-muted`}>
            <AvatarFallback className={textSizes[size]}>+{remaining}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </TooltipProvider>
  );
}
