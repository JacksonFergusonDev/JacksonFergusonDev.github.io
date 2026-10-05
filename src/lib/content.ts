import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { routes } from './site';

export type TripEntry = CollectionEntry<'trips'> & {
  data: Extract<CollectionEntry<'trips'>['data'], { type: 'trip' }>;
};

type CreativeSubpageData = Exclude<CollectionEntry<'creative'>['data'], { type: 'index' }>;
type CreativeSubpage = CollectionEntry<'creative'> & { data: CreativeSubpageData };

// Creative subpages appear in this order wherever they are listed.
const creativeOrder: CreativeSubpageData['type'][] = ['events', 'blender', 'python'];

const creativeNouns: Record<CreativeSubpageData['type'], { singular: string; plural: string }> = {
  events: { singular: 'PHOTO', plural: 'PHOTOS' },
  blender: { singular: 'PROJECT', plural: 'PROJECTS' },
  python: { singular: 'ARTWORK', plural: 'ARTWORKS' },
};

export interface CreativeCollection {
  id: string;
  href: string;
  title: string;
  description: string;
  image: ImageMetadata;
  alt: string;
  badge: string;
}

/** Published trips, newest first. */
export async function getTrips(): Promise<TripEntry[]> {
  const trips = (await getCollection(
    'trips',
    ({ data }) => data.type === 'trip' && !data.draft,
  )) as TripEntry[];
  return trips.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** The events, Blender, and Python subpages, in display order. */
export async function getCreativeSubpages(): Promise<CreativeSubpage[]> {
  const pages = (await getCollection(
    'creative',
    ({ data }) => data.type !== 'index',
  )) as CreativeSubpage[];
  return pages.sort(
    (a, b) => creativeOrder.indexOf(a.data.type) - creativeOrder.indexOf(b.data.type),
  );
}

function coverOf(data: CreativeSubpageData) {
  switch (data.type) {
    case 'events':
      return { image: data.images[0].src, alt: data.images[0].alt, count: data.images.length };
    case 'blender':
      return {
        image: data.projects[0].image,
        alt: data.projects[0].alt,
        count: data.projects.length,
      };
    case 'python':
      return { image: data.pieces[0].image, alt: data.pieces[0].alt, count: data.pieces.length };
  }
}

/** Cards for the creative collections, as listed in src/content/creative/index.md. */
export async function getCreativeCollections(): Promise<CreativeCollection[]> {
  const index = await getEntry('creative', 'index');
  if (!index || index.data.type !== 'index') {
    throw new Error('Missing or invalid creative index entry in src/content/creative/index.md');
  }

  const subpages = await getCreativeSubpages();
  return index.data.collections.map((collection) => {
    const page = subpages.find((subpage) => subpage.id === collection.id);
    if (!page) {
      throw new Error(`Missing subpage content entry for creative collection: ${collection.id}`);
    }

    const { image, alt, count } = coverOf(page.data);
    const nouns = creativeNouns[page.data.type];
    const noun = collection.noun ?? (count === 1 ? nouns.singular : nouns.plural);

    return {
      id: collection.id,
      href: routes.creative[page.data.type].path,
      title: page.data.title,
      description: page.data.description,
      image,
      alt,
      badge: `${count} ${noun} · ${collection.tag}`,
    };
  });
}
