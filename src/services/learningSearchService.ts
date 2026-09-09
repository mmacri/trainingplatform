import Fuse from "fuse.js";
import type { AppData } from "../data/schema";
import { searchAuthorized } from "./appServices";

export interface SearchResult {
  id: string;
  resultType: string;
  title: string;
  description?: string;
  href: string;
  score: number;
  metadata?: string[];
}

export class LearningSearchService {
  static search(data: AppData, userId: string, query: string): SearchResult[] {
    const base = searchAuthorized(data, userId, query).map((item, index) => ({ id: `${item.type}-${item.href}`, resultType: item.type, title: item.title, description: item.description, href: item.href, score: 100 - index, metadata: [] }));
    const resources = data.learningResources.map((resource) => ({ id: resource.id, resultType: "Resource", title: resource.title, description: resource.description, href: `/resources/${resource.id}`, score: 0, metadata: [resource.type.replaceAll("_", " ")] }));
    if (!query.trim()) return [...base, ...resources].slice(0, 20);
    const fuse = new Fuse(resources, { keys: ["title", "description", "metadata"], includeScore: true, threshold: 0.4 });
    return [...base, ...fuse.search(query).map((result) => ({ ...result.item, score: Math.round((1 - (result.score ?? 0)) * 100) }))].sort((left, right) => right.score - left.score);
  }
}
