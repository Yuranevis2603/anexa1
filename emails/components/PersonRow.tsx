import React from "react";
import { Text } from "@react-email/components";
import { colors, fontFamily, gradient } from "./tokens";

/** Avatar-initial + name/subtitle row, the email equivalent of the app's
 * <Avatar> component (which needs a real <img> or JS fallback — email has
 * neither, so this always renders the gradient-circle-with-initial state). */
export default function PersonRow({ name, subtitle }: { name: string; subtitle?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginBottom: "20px" }}>
      <tbody>
        <tr>
          <td
            width={40}
            height={40}
            align="center"
            valign="middle"
            bgcolor={colors.purple}
            style={{
              background: gradient,
              backgroundColor: colors.purple,
              borderRadius: "20px",
              color: "#FFFFFF",
              fontFamily,
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            {initial}
          </td>
          <td style={{ paddingLeft: "12px" }}>
            <Text style={{ color: colors.inkPrimary, fontSize: "14px", fontWeight: 600, margin: 0, fontFamily }}>{name}</Text>
            {subtitle ? (
              <Text style={{ color: colors.inkTertiary, fontSize: "12.5px", margin: 0, fontFamily }}>{subtitle}</Text>
            ) : null}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
