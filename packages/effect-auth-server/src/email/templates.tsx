import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import { render } from "@react-email/render";
import * as React from "react";

export type VerifyEmailTemplateProps = {
  readonly appName: string;
  readonly url: string;
};

export type ResetPasswordTemplateProps = {
  readonly appName: string;
  readonly url: string;
};

const styles = {
  body: {
    backgroundColor: "#f6f7fb",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
    margin: 0,
  },
  button: {
    backgroundColor: "#7c3aed",
    borderRadius: "10px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "700",
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    margin: "40px auto",
    padding: "32px",
    width: "520px",
  },
  muted: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
  },
  text: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
  },
};

export function VerifyEmailTemplate({ appName, url }: VerifyEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your {appName} email address</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1">Verify your email</Heading>
          <Text style={styles.text}>Click the button below to finish setting up your {appName} account.</Text>
          <Section>
            <Button href={url} style={styles.button}>Verify email</Button>
          </Section>
          <Text style={styles.muted}>If you did not create this account, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ResetPasswordTemplate({ appName, url }: ResetPasswordTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your {appName} password</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1">Reset your password</Heading>
          <Text style={styles.text}>Use the button below to choose a new password for your {appName} account.</Text>
          <Section>
            <Button href={url} style={styles.button}>Reset password</Button>
          </Section>
          <Text style={styles.muted}>If you did not request a password reset, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const renderVerifyEmail = (props: VerifyEmailTemplateProps) => render(<VerifyEmailTemplate {...props} />);

export const renderResetPassword = (props: ResetPasswordTemplateProps) => render(<ResetPasswordTemplate {...props} />);
