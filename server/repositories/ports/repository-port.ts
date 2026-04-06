/**
 * Repository Port Interfaces - DDD Architecture
 * 
 * These interfaces define the contract for repository implementations.
 * Following the Repository Pattern from Domain-Driven Design.
 */

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Base repository port interface
 * Defines standard CRUD operations for entities
 */
export interface RepositoryPort<T extends { id: string }> {
  /**
   * Find an entity by its unique identifier
   */
  findById(id: string): Promise<T | null>

  /**
   * Find all entities with optional pagination
   */
  findAll(params?: PaginationParams): Promise<PaginatedResult<T>>

  /**
   * Create a new entity
   * @param data - Entity data without id, createdAt, updatedAt
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>

  /**
   * Update an existing entity
   * @param id - Entity identifier
   * @param data - Partial update data
   */
  update(id: string, data: Partial<T>): Promise<T | null>

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<boolean>

  /**
   * Check if an entity exists by ID
   */
  exists(id: string): Promise<boolean>
}

/**
 * Base entity interface for repositories with owner tracking
 */
export interface WithOwner {
  id: string
  ownerId?: string | null
}

/**
 * Repository with owner-based data isolation
 * Extends base repository with owner-scoped operations
 */
export interface RepositoryWithOwner<T extends WithOwner> extends RepositoryPort<T> {
  /**
   * Find all entities owned by a specific owner
   */
  findByOwner(ownerId: string, params?: PaginationParams): Promise<PaginatedResult<T>>

  /**
   * Find an entity by ID and owner
   */
  findByIdAndOwner(id: string, ownerId: string): Promise<T | null>

  /**
   * Delete an entity by ID and owner
   */
  deleteByOwner(id: string, ownerId: string): Promise<boolean>

  /**
   * Check if an entity exists for a specific owner
   */
  existsForOwner(id: string, ownerId: string): Promise<boolean>
}
