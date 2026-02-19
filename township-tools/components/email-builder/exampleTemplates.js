const EXAMPLE_TEMPLATES = [
  {
    id: 'builtin-email-example',
    builtIn: true,
    name: 'Community Update Email',
    templateType: 'email',
    themeColors: {
      primary: '#2e5f7f',
      primaryDark: '#1a4a63',
      accent: '#8B0000',
      gold: '#f0ad4e',
    },
    sections: [
      {
        id: 'ex-e-header',
        type: 'header',
        data: {
          title: 'Springfield Township Update',
          subtitle: 'Office of the Township Trustee — March 2026',
        },
        locked: true,
      },
      {
        id: 'ex-e-greeting',
        type: 'greeting',
        data: {
          greeting: 'Dear Springfield Township Residents,',
          content: '<p>We hope this message finds you well. As spring approaches, we want to share several important updates about township services, upcoming projects, and community events that may affect you and your family.</p>',
          signOffLine: '',
          signOffs: [],
          org: '',
        },
        locked: false,
      },
      {
        id: 'ex-e-body',
        type: 'contentBody',
        data: {
          content: '<p><b>Road Improvement Project — Oak Street & Maple Avenue</b></p><p>Beginning March 15, the township will undertake a major resurfacing project along Oak Street from Main to 5th Avenue and Maple Avenue from County Road 100 to the township line. Work is expected to last approximately six weeks. During construction, please expect lane closures and use alternate routes when possible.</p><p>This project is funded through the Community Crossings matching grant and represents a $420,000 investment in our local infrastructure.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-e-highlighted',
        type: 'highlighted',
        data: {
          heading: 'Property Tax Reminder',
          content: '<p>Spring installment property tax payments are due <b>May 10, 2026</b>. Payments can be made online through the County Treasurer\'s website, by mail, or in person at the County Government Center. Late payments are subject to a 10% penalty.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-e-notice',
        type: 'importantNotice',
        data: {
          heading: 'Severe Weather Preparedness',
          content: '<p>With tornado season approaching, please ensure your family has an emergency plan in place. The township fire department will be testing tornado sirens on the first Saturday of each month at noon. If you need assistance creating an emergency plan, contact the trustee\'s office.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-e-alert',
        type: 'alertBox',
        data: {
          heading: 'Boil Water Advisory — Lifted',
          content: '<p>The boil water advisory issued on February 28 for the Cherry Lane area has been <b>officially lifted</b> as of March 3. Water quality testing has confirmed the water is safe for consumption. Thank you for your patience.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-e-twocol',
        type: 'twoColumn',
        data: {
          leftHeading: 'Township Office Hours',
          leftText: 'Monday–Friday: 8:00 AM – 4:30 PM\nSaturday: 9:00 AM – 12:00 PM (1st & 3rd only)\nSunday: Closed\nHoliday closures posted on our website.',
          rightHeading: 'Contact Information',
          rightText: 'Phone: (317) 555-0142\nEmail: trustee@springfieldtwp.gov\nAddress: 200 E. Main Street, Suite 100\nSpringfield, IN 46001',
        },
        locked: false,
      },
      {
        id: 'ex-e-image',
        type: 'image',
        data: {
          url: '',
          alt: 'Springfield Township Community Park rendering',
          width: '100',
          shape: 'rounded',
          align: 'center',
          linkUrl: '',
        },
        locked: false,
      },
      {
        id: 'ex-e-list',
        type: 'list',
        data: {
          heading: 'Upcoming Community Events',
          listType: 'bullet',
          items: [
            'Spring Clean-Up Day — Saturday, April 5 at Community Park (8 AM – 1 PM)',
            'Township Board Meeting — Tuesday, March 18 at 7:00 PM (Town Hall)',
            'Senior Citizens Luncheon — Wednesday, March 26 at 11:30 AM (Fire Station #2)',
            'Easter Egg Hunt — Saturday, April 12 at Veterans Memorial Park (10 AM)',
            'Household Hazardous Waste Collection — April 19 at the Highway Garage',
          ],
        },
        locked: false,
      },
      {
        id: 'ex-e-meeting',
        type: 'meetingDetails',
        data: {
          date: 'Tuesday, March 18, 2026',
          time: '7:00 PM EST',
          format: 'In-Person & Virtual',
          meetingId: '856 2914 7703',
          passcode: 'Township2026',
          meetingUrl: 'https://zoom.us/j/85629147703',
          buttonText: 'Join Virtual Meeting',
        },
        locked: false,
      },
      {
        id: 'ex-e-cta',
        type: 'ctaButton',
        data: {
          buttons: [
            { text: 'View Full Township Calendar', url: 'https://springfieldtwp.gov/calendar' },
          ],
          helperText: 'Visit our website for the latest news and meeting agendas.',
        },
        locked: false,
      },
      {
        id: 'ex-e-links',
        type: 'resourceLinks',
        data: {
          heading: 'Quick Links & Resources',
          links: [
            { text: 'Pay Property Taxes Online', url: 'https://county.gov/taxes' },
            { text: 'Request Road Repair', url: 'https://springfieldtwp.gov/road-request' },
            { text: 'Township Assistance Application', url: 'https://springfieldtwp.gov/assistance' },
            { text: 'Fire Department Volunteer Sign-Up', url: 'https://springfieldtwp.gov/volunteer' },
          ],
        },
        locked: false,
      },
      {
        id: 'ex-e-closing',
        type: 'closing',
        data: {
          content: '<p>Thank you for being an engaged member of our community. We are committed to transparency and service, and we welcome your feedback at any time. Don\'t hesitate to reach out to our office with questions or concerns.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-e-sig',
        type: 'signature',
        data: {
          name: 'James R. Patterson',
          title: 'Township Trustee',
          org: 'Springfield Township',
        },
        locked: false,
      },
      {
        id: 'ex-e-footer',
        type: 'footer',
        data: {
          orgName: 'Springfield Township',
          website: 'https://springfieldtwp.gov',
          tagline: 'Serving our community with integrity and dedication.',
        },
        locked: true,
      },
    ],
  },
  {
    id: 'builtin-newsletter-example',
    builtIn: true,
    name: 'Monthly Newsletter',
    templateType: 'newsletter',
    themeColors: {
      primary: '#1a5632',
      primaryDark: '#0e3d22',
      accent: '#c0392b',
      gold: '#e67e22',
    },
    sections: [
      {
        id: 'ex-n-title',
        type: 'newsletterTitle',
        data: {
          name: 'The Springfield Gazette',
          volume: '12',
          issue: '3',
          date: 'March 2026',
        },
        locked: true,
      },
      {
        id: 'ex-n-featured',
        type: 'featuredArticle',
        data: {
          heading: 'New Community Center Breaks Ground This Spring',
          content: '<p>After two years of planning and fundraising, Springfield Township is thrilled to announce that construction on the new 15,000 sq. ft. Community Center will officially begin on April 1, 2026. The facility, located on the former Elm Street lot, will feature a gymnasium, commercial kitchen, meeting rooms, and a senior activity center.</p><p>The $3.2 million project is funded through a combination of state grants, township bonds, and generous community donations. Construction is expected to be completed by late fall 2027.</p><p>"This center will be the heart of our community for generations to come," said Trustee Patterson at the February board meeting.</p>',
          ctaText: 'View Building Plans & Timeline',
          ctaUrl: 'https://springfieldtwp.gov/community-center',
        },
        locked: false,
      },
      {
        id: 'ex-n-news',
        type: 'newsSection',
        data: {
          heading: 'Township Board Approves 2026 Budget',
          content: '<p>At the February meeting, the Township Board unanimously approved the 2026 annual budget of $4.8 million. Key allocations include $1.2 million for road maintenance and improvements, $800,000 for fire protection services, $600,000 for township assistance programs, and $350,000 for parks and recreation.</p><p>The full budget document is available for public review at the trustee\'s office and on our website. Residents are encouraged to attend the quarterly budget review meetings to stay informed about how township funds are being used.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-n-events',
        type: 'eventListing',
        data: {
          heading: 'Upcoming Events',
          events: [
            {
              title: 'Annual Spring Clean-Up Day',
              description: 'Join fellow residents for our community-wide beautification effort. Gloves, bags, and refreshments provided. Meet at Community Park pavilion.',
              link: 'https://springfieldtwp.gov/cleanup',
              date: 'Saturday, April 5 · 8:00 AM – 1:00 PM',
              calendarDate: '2026-04-05',
              startTime: '08:00',
              endTime: '13:00',
            },
            {
              title: 'Volunteer Firefighter Open House',
              description: 'Interested in serving your community? Tour the fire station, meet the crew, and learn about training opportunities. Families welcome!',
              link: 'https://springfieldtwp.gov/fire-openhouse',
              date: 'Saturday, April 12 · 10:00 AM – 2:00 PM',
              calendarDate: '2026-04-12',
              startTime: '10:00',
              endTime: '14:00',
            },
            {
              title: 'Senior Citizens Spring Luncheon',
              description: 'Complimentary lunch and entertainment for township seniors aged 60+. RSVP required by March 20.',
              link: '',
              date: 'Wednesday, March 26 · 11:30 AM',
              calendarDate: '2026-03-26',
              startTime: '11:30',
              endTime: '13:00',
            },
          ],
        },
        locked: false,
      },
      {
        id: 'ex-n-banner',
        type: 'highlightBanner',
        data: {
          heading: 'Township Assistance Available',
          text: 'Struggling with utility bills, rent, or medical expenses? Springfield Township offers emergency assistance to qualifying residents. All inquiries are confidential.',
          buttonText: 'Learn About Assistance Programs',
          buttonUrl: 'https://springfieldtwp.gov/assistance',
        },
        locked: false,
      },
      {
        id: 'ex-n-body',
        type: 'contentBody',
        data: {
          content: '<p><b>Parks & Recreation Update</b></p><p>The township parks department has completed installation of new playground equipment at Veterans Memorial Park, including ADA-accessible swings and a sensory play area. The basketball courts at Community Park will be resurfaced in April, weather permitting.</p><p>Residents are reminded that park shelter reservations for the summer season open on April 1. Popular dates fill up quickly, so plan ahead!</p>',
        },
        locked: false,
      },
      {
        id: 'ex-n-highlighted',
        type: 'highlighted',
        data: {
          heading: 'Census Data & Township Growth',
          content: '<p>Recent census estimates show Springfield Township\'s population has grown to <b>12,450 residents</b>, a 4.2% increase since 2020. This growth impacts our state funding allocation and helps justify additional infrastructure investments. Thank you to everyone who participated in the count!</p>',
        },
        locked: false,
      },
      {
        id: 'ex-n-notice',
        type: 'importantNotice',
        data: {
          heading: 'Road Closure Notice',
          content: '<p>Oak Street between Main and 5th Avenue will be <b>closed to through traffic March 15 – April 25</b> for resurfacing. Local access will be maintained. Please use County Road 200 as an alternate route. Electronic message boards will be in place to guide traffic.</p>',
        },
        locked: false,
      },
      {
        id: 'ex-n-image',
        type: 'image',
        data: {
          url: '',
          alt: 'Rendering of the new Springfield Community Center',
          width: '100',
          shape: 'rounded',
          align: 'center',
          linkUrl: '',
        },
        locked: false,
      },
      {
        id: 'ex-n-twocol',
        type: 'twoColumn',
        data: {
          leftHeading: 'By the Numbers — February',
          leftText: '47 — Road service calls answered\n12 — Tons of salt applied\n23 — Assistance applications processed\n$18,400 — Emergency aid distributed\n156 — Fire/EMS runs',
          rightHeading: 'Did You Know?',
          rightText: 'Springfield Township maintains 87 miles of roads, 3 parks totaling 42 acres, and operates 2 fire stations staffed by 8 career and 24 volunteer firefighters. Our annual report is available at springfieldtwp.gov/report.',
        },
        locked: false,
      },
      {
        id: 'ex-n-list',
        type: 'list',
        data: {
          heading: 'Board Meeting Highlights — February',
          listType: 'bullet',
          items: [
            'Approved 2026 annual budget of $4.8 million',
            'Awarded road paving contract to Midwest Asphalt Corp.',
            'Authorized purchase of new brush chipper for highway dept.',
            'Scheduled public hearing on proposed zoning amendment (March 18)',
            'Recognized Volunteer Firefighter Tom Harris for 20 years of service',
          ],
        },
        locked: false,
      },
      {
        id: 'ex-n-resources',
        type: 'memberResources',
        data: {
          heading: 'Resident Resources',
          items: [
            'Township Assistance Application — springfieldtwp.gov/assistance',
            'Road Concern Report Form — springfieldtwp.gov/roads',
            'Fire Department Volunteer Application — springfieldtwp.gov/volunteer',
            'Meeting Minutes & Agendas — springfieldtwp.gov/meetings',
            'Annual Report 2025 — springfieldtwp.gov/report',
          ],
        },
        locked: false,
      },
      {
        id: 'ex-n-cta',
        type: 'ctaButton',
        data: {
          buttons: [
            { text: 'Visit Our Website', url: 'https://springfieldtwp.gov' },
          ],
          helperText: 'Stay connected — follow us on Facebook @SpringfieldTownshipIN',
        },
        locked: false,
      },
      {
        id: 'ex-n-links',
        type: 'resourceLinks',
        data: {
          heading: 'Important Links',
          links: [
            { text: 'County Tax Payment Portal', url: 'https://county.gov/taxes' },
            { text: 'Indiana Gateway (Financial Transparency)', url: 'https://gateway.ifionline.org' },
            { text: 'Township Emergency Alerts Sign-Up', url: 'https://springfieldtwp.gov/alerts' },
            { text: 'Community Center Project Updates', url: 'https://springfieldtwp.gov/community-center' },
          ],
        },
        locked: false,
      },
      {
        id: 'ex-n-footer',
        type: 'footer',
        data: {
          orgName: 'Springfield Township',
          website: 'https://springfieldtwp.gov',
          tagline: 'Your local government, working for you.',
        },
        locked: true,
      },
    ],
  },
];

export default EXAMPLE_TEMPLATES;
