import React from "react";
import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import { colors, copyrightLine, fontFamily, logoUrl } from "./tokens";

/**
 * Shared shell for every ANEXA email: dark header with the logo mark, a
 * content slot (each template supplies its own heading + card), and a
 * consistent footer. Every color is set as inline `style` (react-email
 * inlines these on render -- no <style>/class selectors, which Gmail
 * strips unreliably) and, on the outermost table cells, ALSO as a literal
 * `bgcolor` attribute so a client that ignores <style> or
 * prefers-color-scheme still renders the intended dark background instead
 * of falling through to white.
 */
export default function EmailLayout({
  preview,
  showManagePreferences = false,
  children,
}: {
  preview: string;
  showManagePreferences?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Html lang="uk">
      <Head>
        {/* Opts out of Gmail/Apple Mail/Outlook.com's automatic color
            re-inversion -- ANEXA's design is dark-by-default (not an
            adaptive light/dark pair), so this exists purely to stop
            clients from "fixing" our intentional dark background. */}
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.base, margin: 0, padding: 0, fontFamily }}>
        <table
          role="presentation"
          width="100%"
          bgcolor={colors.base}
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: colors.base }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                <Container style={{ maxWidth: "600px", width: "100%" }}>
                  <table role="presentation" width="600" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
                    <tbody>
                      <tr>
                        <td align="center" style={{ paddingBottom: "28px" }}>
                          <Img src={logoUrl} width={40} height={40} alt="ANEXA" style={{ borderRadius: "9px" }} />
                        </td>
                      </tr>
                      <tr>
                        <td>{children}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingTop: "32px" }}>
                          <Section style={{ textAlign: "center" }}>
                            <Text
                              style={{
                                color: colors.inkTertiary,
                                fontSize: "12px",
                                lineHeight: "18px",
                                margin: "0 0 4px",
                                fontFamily,
                              }}
                            >
                              ANEXA · {copyrightLine}
                            </Text>
                            {showManagePreferences ? (
                              <Text
                                style={{
                                  color: colors.inkTertiary,
                                  fontSize: "12px",
                                  lineHeight: "18px",
                                  margin: 0,
                                  fontFamily,
                                }}
                              >
                                Керувати сповіщеннями можна в налаштуваннях профілю на anexa.club
                              </Text>
                            ) : null}
                          </Section>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
