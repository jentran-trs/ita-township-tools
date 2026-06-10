import { Cormorant_Garamond, Cutive_Mono, Playfair_Display } from 'next/font/google';

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

// Recipient name — a formal high-contrast diploma serif, far more legible than
// the Pinyon Script it replaced while keeping the ceremonial feel.
export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-playfair',
});

export const cutive = Cutive_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-cutive',
});

export const certFontsClassName = `${cormorant.variable} ${cutive.variable} ${playfair.variable}`;
