import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getProfile, initials, type Profile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const SIZE = 1080;
const TEMPLATES = ["purple", "gold", "minimal"] as const;
export type CreativeTemplate = (typeof TEMPLATES)[number];

function isTemplate(v: string): v is CreativeTemplate {
  return (TEMPLATES as readonly string[]).includes(v);
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }[]> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), "assets/fonts");
    fontsPromise = Promise.all([
      readFile(path.join(dir, "Inter-Regular.woff")),
      readFile(path.join(dir, "Inter-Bold.woff")),
      readFile(path.join(dir, "Inter-ExtraBold.woff")),
    ]).then(([regular, bold, extraBold]) => [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
      { name: "Inter", data: extraBold, weight: 800 as const, style: "normal" as const },
    ]);
  }
  return fontsPromise;
}

function AvatarCircle({
  profile,
  size,
  ringGradient,
  bg,
  fontSize,
}: {
  profile: Profile;
  size: number;
  ringGradient: string;
  bg: string;
  fontSize: number;
}) {
  const inner = size - 12;
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: 9999,
        background: ringGradient,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: inner,
          height: inner,
          borderRadius: 9999,
          overflow: "hidden",
          background: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} width={inner} height={inner} style={{ objectFit: "cover" }} alt="" />
        ) : (
          <span style={{ fontSize, fontWeight: 800, color: "#F5F5F7" }}>{initials(profile.full_name)}</span>
        )}
      </div>
    </div>
  );
}

function purpleTemplate(profile: Profile, linkDisplay: string, qrSrc: string) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: SIZE,
        height: SIZE,
        padding: 64,
        background: "linear-gradient(160deg, #120E1F 0%, #09090B 45%, #0A1220 100%)",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4, color: "#F5F5F7" }}>ANEXA</span>
        <span style={{ fontSize: 20, color: "#9B9BA3", marginTop: 8 }}>приватний клуб для власників бізнесу</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <AvatarCircle
          profile={profile}
          size={200}
          ringGradient="linear-gradient(135deg, #7C5CFF, #4E8CFF)"
          bg="#111217"
          fontSize={72}
        />
        <span style={{ fontSize: 44, fontWeight: 700, color: "#F5F5F7", marginTop: 28, textAlign: "center" }}>
          {profile.full_name}
        </span>
        <span style={{ fontSize: 26, color: "#9A82FF", marginTop: 8 }}>запрошує тебе в ANEXA</span>
        <span style={{ fontSize: 20, color: "#5C5C64", marginTop: 12, textAlign: "center", maxWidth: 640 }}>
          Приватна бізнес-спільнота. Вхід лише за запрошенням.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          background: "#FFFFFF",
          borderRadius: 28,
          padding: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} width={200} height={200} alt="" />
        <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: "#111217" }}>{linkDisplay}</span>
      </div>
    </div>
  );
}

function goldTemplate(profile: Profile, linkDisplay: string, qrSrc: string) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: SIZE,
        height: SIZE,
        padding: 64,
        background: "linear-gradient(160deg, #1A1408 0%, #09090B 45%, #120D06 100%)",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, color: "#E8B85C" }}>
          ЕКСКЛЮЗИВНЕ ЗАПРОШЕННЯ
        </span>
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4, color: "#F5F5F7", marginTop: 10 }}>ANEXA</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <AvatarCircle
          profile={profile}
          size={200}
          ringGradient="linear-gradient(135deg, #E8B85C, #F2CE87)"
          bg="#111217"
          fontSize={72}
        />
        <span style={{ fontSize: 44, fontWeight: 700, color: "#F5F5F7", marginTop: 28, textAlign: "center" }}>
          {profile.full_name}
        </span>
        <span style={{ fontSize: 26, color: "#F2CE87", marginTop: 8 }}>запрошує тебе в ANEXA</span>
        <span style={{ fontSize: 20, color: "#5C5C64", marginTop: 12, textAlign: "center", maxWidth: 640 }}>
          Закритий клуб для власників бізнесу. Вхід лише за запрошенням.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          background: "#FFFFFF",
          borderRadius: 28,
          padding: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} width={200} height={200} alt="" />
        <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: "#111217" }}>{linkDisplay}</span>
      </div>
    </div>
  );
}

function minimalTemplate(profile: Profile, linkDisplay: string, qrSrc: string) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: SIZE,
        height: SIZE,
        padding: 72,
        background: "#000000",
        justifyContent: "space-between",
        fontFamily: "Inter",
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: "#F5F5F7" }}>ANEXA</span>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <span
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.08,
            color: "#F5F5F7",
            maxWidth: 860,
            whiteSpace: "pre-line",
          }}
        >
          {"Тебе\nзапрошено."}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36 }}>
          <AvatarCircle
            profile={profile}
            size={64}
            ringGradient="rgba(255,255,255,0.18)"
            bg="#111217"
            fontSize={22}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#F5F5F7" }}>{profile.full_name}</span>
            <span style={{ fontSize: 18, color: "#9B9BA3" }}>запрошує приєднатися до ANEXA</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 16, color: "#5C5C64", marginBottom: 8 }}>Приватна бізнес-спільнота</span>
          <span style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: "#F5F5F7" }}>{linkDisplay}</span>
        </div>
        <div style={{ display: "flex", background: "#FFFFFF", borderRadius: 16, padding: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} width={130} height={130} alt="" />
        </div>
      </div>
    </div>
  );
}

const RENDERERS: Record<CreativeTemplate, typeof purpleTemplate> = {
  purple: purpleTemplate,
  gold: goldTemplate,
  minimal: minimalTemplate,
};

export async function GET(request: Request, { params }: { params: { template: string } }) {
  const template = isTemplate(params.template) ? params.template : "purple";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Не авторизовано.", { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile || !profile.referral_code) {
    return new Response("Профіль або реферальний код не знайдено.", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const link = `${origin}/register?invite=${profile.referral_code}`;
  const linkDisplay = `anexa.club/register?invite=${profile.referral_code}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;

  const fonts = await loadFonts();

  return new ImageResponse(RENDERERS[template](profile, linkDisplay, qrSrc), {
    width: SIZE,
    height: SIZE,
    fonts,
  });
}
