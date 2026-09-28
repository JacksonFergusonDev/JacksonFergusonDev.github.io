export const site = {
  name: 'Jackson Ferguson',
  description:
    'Physics & Astronomy graduate building reliable systems across software, infrastructure, and hardware. Explore Protostar, instrumentation, and projects.',
  github: 'https://github.com/JacksonFergusonDev',
  linkedin: 'https://www.linkedin.com/in/jackson--ferguson/',
  email: 'mailto:jackson.ferguson0@gmail.com',
};

export const routes = {
  home: {
    path: '/',
  },
  about: {
    path: '/#about',
    title: 'About',
  },
  projects: {
    path: '/#projects',
    title: 'Projects',
  },
  contact: {
    path: '/#contact',
    title: 'Contact',
  },
  trips: {
    path: '/trips/',
    title: 'Camping Trips',
    navLabel: 'Trips',
    exploreLabel: 'Explore camping trips',
    breadcrumb: 'ALL GALLERIES',
    description: 'Photos from the mountains, coastlines, and campsites beyond the terminal.',
  },
  creative: {
    path: '/creative/',
    title: 'Creative studio, events & 3D',
    pageTitle: 'Creative & Field Archives',
    navLabel: 'Creative',
    exploreLabel: 'Explore creative studio, events & 3D',
    breadcrumb: 'ALL CREATIVE ARCHIVES',
    hubLabel: 'Back to creative hub',
    description:
      'Beyond the codebase: live event sound, 3D simulations in Blender, and algorithmic art in Python.',
    events: {
      path: '/creative/events/',
    },
    blender: {
      path: '/creative/blender/',
    },
    python: {
      path: '/creative/python/',
    },
  },
} as const;
