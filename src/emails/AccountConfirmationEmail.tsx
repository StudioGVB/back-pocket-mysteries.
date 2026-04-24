import { Html, Head, Body, Container, Section, Text, Img, Heading, Hr, Link, Button } from '@react-email/components';
import * as React from 'react';

const baseUrl = 'https://mysteries.backpocketgames.com';

export default function AccountConfirmationEmail() {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${baseUrl}/logo-horizontal-white.png`}
              width="200"
              alt="Back Pocket Mysteries"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            <Heading style={heading}>Welcome to the Agency!</Heading>
            <Text style={paragraph}>
              You're one step away from solving your first case.
            </Text>
            <Text style={paragraph}>
              Please confirm your email address by clicking the button below to activate your account.
            </Text>

            <Section style={btnContainer}>
              <Button style={button} href="{{ .ConfirmationURL }}">
                Confirm Email
              </Button>
            </Section>

            <Text style={paragraph}>
              Or, copy and paste this temporary login code:
            </Text>
            
            <div style={codeBox}>
                <Text style={codeText}>{"{{ .Token }}"}</Text>
            </div>

            <Text style={paragraph}>
              If you didn't request this, you can safely ignore this email.
            </Text>
            <Text style={paragraph}>
              Stay curious,<br />
              <strong>The Back Pocket Mysteries Team</strong>
            </Text>
          </Section>

          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Back Pocket Mysteries. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href={baseUrl} style={footerLink}>backpocketgames.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f9f9f9',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#111111',
  padding: '30px 40px',
  textAlign: 'center' as const,
  borderBottom: '4px solid #F02882',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '40px',
};

const heading = {
  color: '#111111',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '20px',
};

const paragraph = {
  color: '#444444',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '20px',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#F02882',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
};

const codeBox = {
  backgroundColor: '#f5f5f5',
  border: '1px solid #e0e0e0',
  padding: '12px 24px',
  display: 'inline-block',
  borderRadius: '6px',
  marginBottom: '24px',
};

const codeText = {
  color: '#111111',
  fontSize: '20px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '0',
};

const footer = {
  backgroundColor: '#fafafa',
  padding: '20px 40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#888888',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#F02882',
  textDecoration: 'none',
};
