import { Cormorant_Garamond, Pinyon_Script, Cutive_Mono } from 'next/font/google';

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

export const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-pinyon',
});

export const cutive = Cutive_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-cutive',
});

export const certFontsClassName = `${cormorant.variable} ${pinyon.variable} ${cutive.variable}`;
