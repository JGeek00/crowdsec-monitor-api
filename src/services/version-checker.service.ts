import axios from 'axios';
import packageJson from '../../package.json';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

/**
 * Version Checker Service
 * Checks for new releases on GitHub and compares with current version
 */
class VersionCheckerService {
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/JGeek00/crowdsec-monitor-api/releases/latest';
  private latestVersion: string | null = null;
  private lastCheckTime: Date | null = null;

  /**
   * Compare two semantic versions
   * Returns true if version1 is less than version2
   */
  private isVersionLower(version1: string, version2: string): boolean {
    // Remove 'v' prefix if present
    const v1 = version1.replace(/^v/, '');
    const v2 = version2.replace(/^v/, '');

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }

    return false; // versions are equal
  }

  /**
   * Check for new version from GitHub releases
   */
  async checkForNewVersion(): Promise<void> {
    try {
      console.log('🔍 Checking for new version...');
      
      const response = await axios.get<GitHubRelease>(this.GITHUB_API_URL, {
        timeout: 10000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'crowdsec-monitor-api',
        },
      });

      const latestRelease = response.data;
      const latestVersionTag = latestRelease.tag_name;
      const currentVersion = packageJson.version;

      this.lastCheckTime = new Date();

      // Compare versions
      if (this.isVersionLower(currentVersion, latestVersionTag)) {
        this.latestVersion = latestVersionTag;
        console.log(`📦 New version available: ${latestVersionTag} (current: ${currentVersion})`);
      } else {
        this.latestVersion = null;
        console.log(`✓ Version up to date: ${currentVersion}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Failed to check for new version: ${error.message}`);
      } else {
        console.error('❌ Failed to check for new version:', error);
      }
      // Don't throw, just log the error
    }
  }

  /**
   * Get the latest available version if newer than current
   * @returns Latest version string or null if up to date
   */
  getLatestVersion(): string | null {
    return this.latestVersion;
  }

  /**
   * Get the last time the version was checked
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion(): string {
    return packageJson.version;
  }
}

export const versionCheckerService = new VersionCheckerService();
