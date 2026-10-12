// Waits between attempts, in milliseconds. CI backs off for about four minutes to ride out
// short GitHub outages; local work fails fast so offline development reaches its fallback.
export const retryDelays = process.env.CI ? [2000, 5000, 15000, 30000, 60000, 120000] : [500, 1000];

export async function withRetries(label, attempt, delays = retryDelays) {
  for (let index = 0; ; index += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (index >= delays.length) {
        throw new Error(`${label}: failed after ${index + 1} attempts`, { cause: error });
      }
      console.warn(`warning: ${error.message}; retrying in ${delays[index] / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delays[index]));
    }
  }
}
