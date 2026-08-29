import { Radio } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminEventsPage() {
  return (
    <ComingSoon
      icon={Radio}
      title="Події та Live"
      note="Загальний огляд подій і трансляцій усіх спільнот в адмінці ще не готовий — самі події вже можна створювати й вести зі сторінки кожної спільноти."
    />
  );
}
