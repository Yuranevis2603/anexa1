import { Repeat } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminSubscriptionsPage() {
  return (
    <ComingSoon
      icon={Repeat}
      title="Підписки"
      note="Платних підписок поки не існує — весь функціонал платформи безкоштовний для учасників закритої бети."
    />
  );
}
