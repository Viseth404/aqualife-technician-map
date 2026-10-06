// Technician photo in a circle with a ring in their color.
// Shows the first letter of their name if there is no photo.
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export default function TechAvatar({ tech, className }) {
  return (
    <Avatar className={cn("size-8 ring-2 ring-offset-1", className)} style={{ "--tw-ring-color": tech.color }}>
      {tech.photoUrl && <AvatarImage src={tech.photoUrl} alt={tech.name} className="object-cover" />}
      <AvatarFallback className="bg-white font-semibold" style={{ color: tech.color }}>
        {tech.name?.[0]?.toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
