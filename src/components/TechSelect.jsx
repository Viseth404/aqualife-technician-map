// Dropdown to pick a technician (or "None"). Used in the zone panel.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/i18n"

// Radix Select cannot use "" as a value, so "none" stands for "no technician".
const NONE = "none"

export default function TechSelect({ id, value, onChange, technicians, excludeId }) {
  const { t } = useLanguage()
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("none")}</SelectItem>
        {technicians
          .filter((tech) => tech.id !== excludeId)
          .map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              <span className="size-2.5 rounded-full" style={{ backgroundColor: tech.color }} />
              {tech.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
