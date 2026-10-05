import headshot from '../assets/profile/jackson-ferguson.jpg';
import { site } from './site';
import { projects, tools } from './projects';

const uvic = {
  '@type': 'CollegeOrUniversity',
  name: 'University of Victoria',
  url: 'https://www.uvic.ca/',
};

// schema.org graph for the homepage: the site, the profile page, the person, and their projects.
export function homepageGraph(origin: URL) {
  const home = new URL('/', origin).href;
  const personId = `${home}#person`;
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
