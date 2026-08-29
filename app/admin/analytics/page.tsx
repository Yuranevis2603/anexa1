import { BarChart3 } from "lucide-react";
import ComingSoon from "@/components/admin/ComingSoon";

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Аналітика"
      note="Розширена аналітика (воронки, ретеншн, когорти) ще не підключена — базові цифри поки дивіться на сторінці «Огляд»."
    />
  );
}
