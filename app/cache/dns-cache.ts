import type { RedisClientType } from '@redis/client'
import { Redis } from '../redis'
import type { DNSAnswerType, DNSQuestionType } from '../types'

/**
 * A simple DNS cache that uses Redis as the underlying storage.
 *
 * The cache stores DNS answers in Redis with a TTL equal to the TTL of the
 * first answer in the response. The key format is `domain:<name>:<type>:<class>`.
 *
 * The cache provides methods to set and get DNS answers.
 *
 * @remarks
 * The cache is not thread-safe. If you need to use the cache in a multi-threaded
 * environment, you should use a thread-safe Redis client and make sure to
 * synchronize access to the cache.
 */
export class DNSCache {
  /**
   * The Redis client used by the cache.
   */
  private readonly redis: RedisClientType

  /**
   * Creates a new instance of the DNSCache class.
   */
  constructor() {
    this.redis = Redis
  }

  /**
   * Gets the Redis client used by the cache.
   */
  get redisClient() {
    return this.redis
  }

  /**
   * Connects to Redis if the connection is not already open.
   */
  private async connect() {
    if (!this.redis.isOpen) {
      await this.redis.connect()
    }
  }

  /**
   * Closes the Redis connection if it is open.
   */
  private async close() {
    if (this.redis.isOpen) {
      await this.redis.quit()
    }
  }

  /**
   * Clears the entire cache.
   */
  async clear() {
    await this.connect()
    await this.redis.flushAll()
    await this.close()
  }

  /**
   * Sets the DNS answers for a given question in the cache.
   *
   * @param question - The question to set the answers for.
   * @param answers - The answers to set.
   * @returns A promise that resolves to the result of the SET operation.
   */
  async set(
    question: DNSQuestionType,
    answers: DNSAnswerType[],
  ): Promise<null | string | undefined> {
    await this.connect()

    if (answers.length === 0) {
      await this.close()
      return null
    }

    const key = `domain:${question.name}:${question.type}:${question.class}`
    const value = JSON.stringify(answers)

    try {
      // Use NX to set the value only if it does not already exist.
      // Use EX to set the TTL of the key to the TTL of the first answer.
      const result = await this.redis.set(key, value, {
        NX: true,
        EX: answers[0].ttl,
      })
      return result
    } catch (error) {
      console.error('Error setting DNS answer:', error)
    } finally {
      await this.close()
    }
  }

  /**
   * Gets the DNS answers for a given question from the cache.
   *
   * @param question - The question to get the answers for.
   * @returns A promise that resolves to the DNS answers or null if the answers
   * are not in the cache.
   */
  async get(question: DNSQuestionType): Promise<null | DNSAnswerType[] | undefined> {
    await this.connect()

    const key = `domain:${question.name}:${question.type}:${question.class}`

    try {
      const value = await this.redis.get(key)

      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Error getting DNS answer:', error)
    } finally {
      await this.close()
    }
  }
}
