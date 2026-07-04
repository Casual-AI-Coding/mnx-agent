export type ResourceReferenceSource =
  | 'prompt_template'
  | 'material'
  | 'material_item'
  | 'workflow_template'

export interface ResourceReferenceInput {
  readonly source: ResourceReferenceSource
  readonly id: string
  readonly name: string
  readonly category?: string
}

export interface ResourceReference {
  readonly source: ResourceReferenceSource
  readonly id: string
  readonly name: string
  readonly category?: string
}

export interface ResourceUsageMetadata {
  readonly resourceRefs: readonly ResourceReference[]
}

export function buildResourceReference(input: ResourceReferenceInput): ResourceReference {
  return input.category === undefined
    ? {
        source: input.source,
        id: input.id,
        name: input.name,
      }
    : {
        source: input.source,
        id: input.id,
        name: input.name,
        category: input.category,
      }
}

export function buildResourceUsageMetadata(
  references: readonly (ResourceReference | null)[]
): ResourceUsageMetadata {
  return {
    resourceRefs: references.filter((reference): reference is ResourceReference => reference !== null),
  }
}

export function mergeResourceUsageMetadata(
  metadata: Record<string, unknown>,
  references: readonly (ResourceReference | null)[]
): Record<string, unknown> {
  const usageMetadata = buildResourceUsageMetadata(references)

  if (usageMetadata.resourceRefs.length === 0) {
    return metadata
  }

  return {
    ...metadata,
    resourceRefs: usageMetadata.resourceRefs,
  }
}

export function upsertResourceReference(
  references: readonly ResourceReference[],
  nextReference: ResourceReference
): readonly ResourceReference[] {
  return [
    ...references.filter(
      (reference) => reference.source !== nextReference.source || reference.id !== nextReference.id
    ),
    nextReference,
  ]
}
