import { FileText } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminPostsPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Пости"
      note="Модерація окремих постів (видалення, приховування) з адмінки ще не готова — зараз пост можна прибрати лише з боку його автора або спільноти."
    />
  );
}
