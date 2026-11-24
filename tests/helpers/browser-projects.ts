import type { Project } from '@playwright/test';

export function browserProjects(includeChannels = false): Project[] {
  const projects: Project[] = ['webkit', 'firefox', 'chromium'].map(browserName => ({
    name: browserName,
    use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit', viewport: { width: 1440, height: 1000 },
      ...(browserName === 'chromium' && process.env.CROSS_BROWSER_CHROMIUM_EXECUTABLE
        ? { launchOptions: { executablePath: process.env.CROSS_BROWSER_CHROMIUM_EXECUTABLE } } : {}),
    },
  }));
  if (includeChannels) projects.push(
    { name: 'google-chrome', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'microsoft-edge', use: { browserName: 'chromium', channel: 'msedge', viewport: { width: 1440, height: 1000 } } },
  );
  return projects;
}
