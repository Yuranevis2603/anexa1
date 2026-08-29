import { Coins } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminEconomyPage() {
  return (
    <ComingSoon
      icon={Coins}
      title="AX Економіка"
      note="Загальний дашборд емісії й витрат AX ще не підключено — платформа поки не веде окремий облік економіки AX за межами балансів окремих користувачів."
    />
  );
}
