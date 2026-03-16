import { appStorage } from './';
export interface Link {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  category?: string;
}

// Links data stored in appStorage
const STORAGE_KEY = 'student_links_data';

// Get links from appStorage
export const getLinksData = (): Link[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = appStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  
  return [];
};

// Save links to appStorage
export const saveLinksData = (links: Link[]): void => {
  if (typeof window !== 'undefined') {
    appStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }
};

// Add a new link
export const addLink = (link: Link): void => {
  const links = getLinksData();
  const updatedLinks = [link, ...links];
  saveLinksData(updatedLinks);
};

// Delete a link
export const deleteLink = (linkId: string): void => {
  const links = getLinksData();
  const updatedLinks = links.filter(link => link.id !== linkId);
  saveLinksData(updatedLinks);
};

// Update a link
export const updateLink = (linkId: string, updatedLink: Partial<Link>): void => {
  const links = getLinksData();
  const updatedLinks = links.map(link =>
    link.id === linkId ? { ...link, ...updatedLink } : link
  );
  saveLinksData(updatedLinks);
};


