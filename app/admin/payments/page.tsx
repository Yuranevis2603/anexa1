import { CreditCard } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminPaymentsPage() {
  return (
    <ComingSoon
      icon={CreditCard}
      title="Платежі"
      note="У платформі ще немає платіжної системи — цей розділ з'явиться, коли буде підключено платіжного провайдера."
    />
  );
}
