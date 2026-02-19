const ONBOARDING_STEPS = [
  {
    target: 'template-type',
    title: 'Choose Your Template Type',
    description: 'Start by selecting whether you want to build an Email or a Newsletter. Each type has its own set of specialized sections.',
    position: 'right',
  },
  {
    target: 'examples',
    title: 'Example Templates',
    description: 'Load a pre-built example to see every section type in action with realistic township content. Great for learning the tool!',
    position: 'right',
  },
  {
    target: 'templates',
    title: 'Save & Load Templates',
    description: 'Save your work as reusable templates. Load them later to quickly create new emails based on previous designs.',
    position: 'right',
  },
  {
    target: 'section-list',
    title: 'Your Sections',
    description: 'This is your section list. Drag to reorder, click to select, and use the arrows or trash icon to move or delete sections.',
    position: 'right',
  },
  {
    target: 'add-section',
    title: 'Add New Sections',
    description: 'Click here to add content sections like text blocks, images, alerts, meeting details, and more to your template.',
    position: 'right',
  },
  {
    target: 'brand-settings',
    title: 'Brand Settings',
    description: 'Upload your township logo and customize theme colors. Save defaults so they\'re automatically applied to new templates.',
    position: 'bottom',
  },
  {
    target: 'editor',
    title: 'Section Editor',
    description: 'Edit each section\'s content here. Click a section in the sidebar to scroll to its editor. Rich text formatting is available for most text fields.',
    position: 'left',
  },
  {
    target: 'generate',
    title: 'Preview & Generate',
    description: 'When you\'re ready, click Preview to generate the HTML email. You can then copy the HTML and paste it into your email client.',
    position: 'bottom',
  },
  {
    target: 'top-bar',
    title: 'Save Your Work',
    description: 'Use Save Draft to preserve work-in-progress, or Save as Template to create a reusable template. The help button (?) restarts this tour anytime.',
    position: 'bottom',
  },
];

export default ONBOARDING_STEPS;
