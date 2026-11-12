import { Plus_Jakarta_Sans } from 'next/font/google';

// Clean geometric sans close to the ITA event badge samples.
export const badgeFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-badge',
});
