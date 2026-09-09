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
    const trainingWorld = data.trainingWorlds.flatMap((world) => [
      { id: world.id, resultType: "Training World", title: world.name, description: world.description, href: "/environment", score: 0, metadata: ["North Valley Energy"] },
      ...world.people.map((person) => ({ id: person.id, resultType: "Person", title: person.name, description: person.roleSummary, href: "/environment", score: 0, metadata: [person.title] })),
      ...world.systems.map((system) => ({ id: system.id, resultType: "System", title: system.name, description: system.description, href: "/environment", score: 0, metadata: [system.systemType, system.owner ?? ""] })),
      ...world.vendors.map((vendor) => ({ id: vendor.id, resultType: "Vendor", title: vendor.name, description: vendor.description, href: "/environment", score: 0, metadata: vendor.services }))
    ]);
    const artifacts = data.trainingArtifacts.map((artifact) => ({ id: artifact.id, resultType: "Artifact", title: artifact.title, description: artifact.subtitle ?? artifact.artifactType.replaceAll("_", " "), href: artifact.relatedCourseIds[0] ? `/courses/${artifact.relatedCourseIds[0]}/reference` : "/environment", score: 0, metadata: [artifact.artifactType.replaceAll("_", " ")] }));
    const diagrams = data.learningDiagrams.map((diagram) => ({ id: diagram.id, resultType: "Diagram", title: diagram.title, description: diagram.description, href: "/environment", score: 0, metadata: [diagram.type.replaceAll("_", " ")] }));
    const extra = [...resources, ...trainingWorld, ...artifacts, ...diagrams];
    if (!query.trim()) return [...base, ...extra].slice(0, 20);
    const fuse = new Fuse(extra, { keys: ["title", "description", "metadata"], includeScore: true, threshold: 0.4 });
    return [...base, ...fuse.search(query).map((result) => ({ ...result.item, score: Math.round((1 - (result.score ?? 0)) * 100) }))].sort((left, right) => right.score - left.score);
  }
}
