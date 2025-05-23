import type { RedisClientType } from "@redis/client";
import { Redis } from "../redis";
import type { DNSAnswerType, DNSQuestionType } from "../types";

export class DNSCache {
  private readonly redis: RedisClientType;

  constructor() {
    this.redis = Redis;
  }

  get redisClient() {
    return this.redis;
  }

  private async connect() {
    if (!this.redis.isOpen) {
      await this.redis.connect();
    }
  }

  private async close() {
    await this.redis.quit();
  }

  async clear() {
    await this.connect();
    await this.redis.flushAll();
    await this.close();
  }

  async setDNSAnswer(
    question: DNSQuestionType,
    answers: DNSAnswerType[]
  ): Promise<null | string | undefined> {
    await this.connect();

    if (answers.length === 0) {
      await this.close();
      return null;
    }

    const key = `domain:${question.name}:${question.type}:${question.class}`;
    const value = JSON.stringify(answers);

    try {
      const result = await this.redis.set(key, value, {
        NX: true,
        EX: answers[0].ttl,
      });
      return result;
    } catch (error) {
      console.error("Error setting DNS answer:", error);
    } finally {
      await this.close();
    }
  }

  async getDNSAnswer(
    question: DNSQuestionType
  ): Promise<null | DNSAnswerType[] | undefined> {
    await this.connect();

    const key = `domain:${question.name}:${question.type}:${question.class}`;

    try {
      const value = await this.redis.get(key);

      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error getting DNS answer:", error);
    } finally {
      await this.close();
    }
  }
}
