import { createClient } from '@redis/client'

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not defined')
} else {
  console.log('Using REDIS_URL:', process.env.REDIS_URL)
}

const Redis = createClient({ url: process.env.REDIS_URL }).on('error', (err) =>
  console.log('Redis Client Error', err),
)

export { Redis }
