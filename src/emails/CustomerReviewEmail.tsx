import { Html, Head, Body, Container, Section, Text, Img, Heading, Hr, Link } from '@react-email/components';
import * as React from 'react';

interface CustomerReviewEmailProps {
  name: string;
  rating: number;
}

const baseUrl = 'https://mysteries.backpocketgames.com';

export default function CustomerReviewEmail({
  name = 'Guest',
  rating = 5,
}: CustomerReviewEmailProps) {
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
            <Heading style={heading}>Thank you for your review!</Heading>
            <Text style={paragraph}>
              Hi {name},
            </Text>
            <Text style={paragraph}>
              We saw that you just left us a {rating}-star review. Thank you so much for taking the time to share your experience with Back Pocket Mysteries!
            </Text>
            <Text style={paragraph}>
              It's detectives like you that make our community so incredible. We pour our hearts into crafting these mysteries, and hearing your feedback means the world to us.
            </Text>

            <Section style={discountContainer}>
              <Text style={discountText}>
                As a small token of our appreciation, please use the code below for <strong>15% off</strong> your next mystery:
              </Text>
              <div style={codeBox}>
                <Text style={codeText}>MYSTERY15</Text>
              </div>
            </Section>

            <Text style={paragraph}>
              We hope to welcome you to another gripping case soon.
            </Text>
            <Text style={paragraph}>
              Stay suspicious,<br />
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

const discountContainer = {
  backgroundColor: '#fef5f9',
  border: '1px solid #f9dbe8',
  padding: '24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const discountText = {
  color: '#F02882',
  fontSize: '15px',
  margin: '0 0 16px',
};

const codeBox = {
  backgroundColor: '#ffffff',
  border: '2px dashed #F02882',
  padding: '12px 24px',
  display: 'inline-block',
  borderRadius: '6px',
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
