import { ScrollText } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminAuditLogPage() {
  return (
    <ComingSoon
      icon={ScrollText}
      title="Журнал дій"
      note="Аудит-лог дій адміністраторів ще не ведеться — його потрібно буде додати окремою таблицею в базі даних."
    />
  );
}
