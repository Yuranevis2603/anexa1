import { Bell } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminNotificationsPage() {
  return (
    <ComingSoon
      icon={Bell}
      title="Сповіщення"
      note="Розсилка сповіщень усім користувачам з адмінки ще не реалізована."
    />
  );
}
