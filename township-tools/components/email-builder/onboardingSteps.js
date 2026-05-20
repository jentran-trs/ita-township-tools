// Guided tour steps. Each step targets an element on the page via a
// `[data-tour="..."]` attribute (added on the corresponding component).
// Steps are kept short and beginner-friendly — the audience is older
// township staff who haven't used a builder before.
const ONBOARDING_STEPS = [
  {
    target: 'add-section',
    title: '1. Add elements to your email',
    description:
      'This is your toolbox. Click any element here (or drag it onto the canvas) to add it to your email. Try clicking "Rich Text" — it adds a paragraph block you can type into.',
    position: 'right',
  },
  {
    target: 'editor',
    title: '2. Edit on the canvas',
    description:
      'Your email shows up here. Click any text to edit it. Hover over a section to see options for moving, deleting, or opening its settings.',
    position: 'left',
  },
  {
    target: 'brand-settings',
    title: '3. Set your brand',
    description:
      'Upload your township logo and pick your colors. The colors are pulled automatically from your logo, but you can override any of them.',
    position: 'left',
  },
  {
    target: 'examples',
    title: '4. Start from an example',
    description:
      'Not sure where to start? Load one of the example templates and adjust the content. Great for learning what each element does.',
    position: 'left',
  },
  {
    target: 'templates',
    title: '5. Save your work',
    description:
      'Save your finished design as a reusable template. Next month, just load it and update the dates — no rebuilding required.',
    position: 'left',
  },
  {
    target: 'top-bar',
    title: '6. Draft &amp; preview',
    description:
      'Use Draft to save your work-in-progress on this device. When you\'re ready, click Preview to generate the HTML you can paste into Gmail, Outlook, or any email tool.',
    position: 'bottom',
  },
  {
    target: 'generate',
    title: '7. Copy the HTML',
    description:
      'After previewing, click "Copy HTML" — then paste it into your email client. That\'s it!',
    position: 'bottom',
  },
];

export default ONBOARDING_STEPS;
