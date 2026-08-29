import { Settings } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Налаштування"
      note="Налаштування платформи (ліміти AX, рівні тощо) поки редагуються напряму в базі даних."
    />
  );
}
