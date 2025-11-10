import { timedFetch } from './util/ssrFetch.js';

/**
 * Test pages to snapshot for SSR parity analysis
 * These pages should exist in astro-frontend/src/pages/
 */
const TEST_PATHS = [
  '/',
  '/about',
  '/api-check' // Created during US3 (T018)
];

/**
 * Collect page snapshots from both Astro dev and Workers dev
 * Returns array of snapshot objects with rendering metadata
 *
 * @param {Object} hosts - Expected hosts from environment { astroDev, workersDev, ddevSite }
 * @param {Array} diagnostics - Diagnostics array to append messages to
 * @returns {Promise<Array>} Array of snapshot objects
 */
export const collectSnapshots = async (hosts, diagnostics = []) => {
  if (!hosts || !hosts.astroDev || !hosts.workersDev) {
    throw new Error('hosts.astroDev and hosts.workersDev required for snapshot collection');
  }

  const snapshots = [];
  const timeoutMs = 5000;

  for (const testPath of TEST_PATHS) {
    try {
      // Fetch from Astro dev
      const astroUrl = `${hosts.astroDev}${testPath}`;
      const astroResponse = await timedFetch(astroUrl, {
        timeoutMs,
        readMode: 'text'
      });

      // Fetch from Workers dev
      const workersUrl = `${hosts.workersDev}${testPath}`;
      const workersResponse = await timedFetch(workersUrl, {
        timeoutMs,
        readMode: 'text'
      });

      snapshots.push({
        path: testPath,
        astro: astroResponse,
        workers: workersResponse,
        collectedAt: new Date().toISOString()
      });

      diagnostics.push({
        level: 'debug',
        message: `Snapshot collected for ${testPath}: Astro ${astroResponse.status}, Workers ${workersResponse.status}`
      });
    } catch (error) {
      diagnostics.push({
        level: 'error',
        message: `Failed to collect snapshot for ${testPath}: ${error.message}`
      });
    }
  }

  return snapshots;
};

export default collectSnapshots;
