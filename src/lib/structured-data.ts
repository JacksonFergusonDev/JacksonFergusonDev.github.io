import headshot from '../assets/profile/jackson-ferguson.jpg';
import { site } from './site';
import { projects, tools } from './projects';

const uvic = {
  '@type': 'CollegeOrUniversity',
  name: 'University of Victoria',
  url: 'https://www.uvic.ca/',
};

const personIdFor = (origin: URL) => `${new URL('/', origin).href}#person`;

// schema.org graph for the homepage: the site, the profile page, the person, and their projects.
export function homepageGraph(origin: URL) {
  const home = new URL('/', origin).href;
  const personId = personIdFor(origin);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        url: home,
        name: site.name,
        publisher: { '@id': personId },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${home}#profile`,
        url: home,
        name: site.name,
        isPartOf: { '@id': `${home}#website` },
        mainEntity: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: site.name,
        url: home,
        image: new URL(headshot.src, origin).href,
        description: site.description,
        email: site.emailAddress,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Vancouver',
          addressRegion: 'BC',
          addressCountry: 'CA',
        },
        alumniOf: uvic,
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'degree',
          name: 'Bachelor of Science, Major Combined Physics and Astronomy',
          recognizedBy: uvic,
          dateCreated: '2026',
        },
        knowsAbout: [
          'Python',
          'Release automation',
          'GitHub Actions',
          'Analog electronics',
          'Embedded data acquisition',
          'Digital signal processing',
          'Astrophysics',
          'Statistical inference',
        ],
        sameAs: [site.github, site.linkedin],
      },
      ...[...projects, ...tools].map((project) => ({
        '@type': 'SoftwareSourceCode',
        name: project.name,
        description: project.description,
        url: project.url,
        codeRepository: project.repo,
        author: { '@id': personId },
      })),
    ],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export interface GalleryImage {
  url: string;
  caption: string;
  /** Set only for work Jackson made, such as renders and generative art. */
  byAuthor?: boolean;
}

interface SubpageOptions {
  path: string;
  name: string;
  description: string;
  /** Trail below Home, ending with this page. */
  crumbs: Crumb[];
}

function subpageNodes(origin: URL, { path, name, description, crumbs }: SubpageOptions) {
  const url = new URL(path, origin).href;
  const home = new URL('/', origin).href;
  const person = { '@type': 'Person', '@id': personIdFor(origin), name: site.name, url: home };
  const page = {
    '@id': `${url}#page`,
    url,
    name,
    description,
    isPartOf: { '@id': `${home}#website` },
    author: { '@id': person['@id'] },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.path, origin).href,
    })),
  };
  return { person, page, breadcrumb };
}

// schema.org graph for an index page: a collection of linked subpages, with breadcrumbs.
export function collectionGraph(origin: URL, options: SubpageOptions & { items: Crumb[] }) {
  const { person, page, breadcrumb } = subpageNodes(origin, options);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        ...page,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: options.items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            url: new URL(item.path, origin).href,
          })),
        },
      },
      breadcrumb,
      person,
    ],
  };
}

// schema.org graph for a photo or artwork page: an image gallery, with breadcrumbs.
export function galleryGraph(
  origin: URL,
  options: SubpageOptions & { images: GalleryImage[]; location?: string },
) {
  const { person, page, breadcrumb } = subpageNodes(origin, options);
  const author = { '@id': person['@id'] };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ImageGallery',
        ...page,
        ...(options.location && {
          contentLocation: { '@type': 'Place', name: options.location },
        }),
        image: options.images.map((image) => ({
          '@type': 'ImageObject',
          contentUrl: new URL(image.url, origin).href,
          caption: image.caption,
          ...(image.byAuthor && {
            creator: author,
            creditText: site.name,
            copyrightHolder: author,
          }),
        })),
      },
      breadcrumb,
      person,
    ],
  };
}
