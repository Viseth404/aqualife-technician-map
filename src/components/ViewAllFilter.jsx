// "View All" dropdown at the bottom-left of the map.
// Shows every technician, or only one technician and their zones.
import { Users } from "lucide-react"
import { useLanguage } from "@/i18n"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ViewAllFilter({ technicians, value, onChange }) {
  const { t } = useLanguage()
  return (
    <div className="absolute bottom-4 left-3 z-[1001]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-44 bg-background shadow-md" aria-label={t("viewAll")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <Users className="text-muted-foreground" /> {t("viewAll")}
          </SelectItem>
          <SelectSeparator />
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              <span className="size-2.5 rounded-full" style={{ backgroundColor: tech.color }} />
              {tech.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
