import { Html, Head, Body, Container, Section, Text, Img, Heading, Hr, Link } from '@react-email/components';
import * as React from 'react';

interface CustomerEnquiryEmailProps {
  name: string;
  message: string;
}

const baseUrl = 'https://mysteries.backpocketgames.com';

export default function CustomerEnquiryEmail({
  name = 'Guest',
  message = 'Your message here...',
}: CustomerEnquiryEmailProps) {
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
            <Heading style={heading}>We've received your enquiry!</Heading>
            <Text style={paragraph}>
              Hi {name},
            </Text>
            <Text style={paragraph}>
              Thank you for reaching out to Back Pocket Mysteries. This email is just to confirm that we've received your message and our team is looking into it. 
            </Text>
            <Text style={paragraph}>
              We aim to respond to all inquiries within 24-48 hours. Here is a copy of your message for your records:
            </Text>
            
            <Section style={messageContainer}>
              <Text style={messageText}>
                {message}
              </Text>
            </Section>

            <Text style={paragraph}>
              If you have any further questions in the meantime, feel free to reply directly to this email.
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

const messageContainer = {
  backgroundColor: '#f5f5f5',
  borderLeft: '4px solid #F02882',
  padding: '20px',
  borderRadius: '0 8px 8px 0',
  marginBottom: '24px',
};

const messageText = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
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
