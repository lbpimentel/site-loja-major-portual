import { test, expect } from '@playwright/test';

test.describe('Landing Page & Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local homepage
    await page.goto('/');
  });

  test('should load the home page successfully with correct title', async ({ page }) => {
    // Assert page title contains the Lodge name
    await expect(page).toHaveTitle(/A∴R∴L∴S∴ Major Manoel dos Santos Portugal/);

    // Verify presence of the main heading
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Luz, Razão e');
  });

  test('should open and close the Agenda modal', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip(); // Desktop navbar elements are hidden on mobile
    }

    // Find the Agenda button in navigation and click it
    const agendaBtn = page.getByRole('button', { name: 'Agenda', exact: true });
    await expect(agendaBtn).toBeVisible();
    await agendaBtn.click({ force: true });

    // The modal should be visible and not contain the "hidden" class
    const agendaModal = page.locator('#agendaModal');
    await expect(agendaModal).toBeVisible();
    await expect(agendaModal).not.toHaveClass(/hidden/);

    // Find and click the close button inside the modal
    const closeBtn = agendaModal.locator('button').filter({ has: page.locator('span:has-text("close")') });
    await closeBtn.click();

    // The modal should now be hidden or contain the "hidden" class
    await expect(agendaModal).toHaveClass(/hidden/);
  });

  test('should open and close the "Quero ser Maçom" interest modal', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip(); // Desktop navbar elements are hidden on mobile
    }

    // Click the button to open the interest modal
    const interestBtn = page.getByRole('button', { name: 'Quero ser Maçom' });
    await expect(interestBtn).toBeVisible();
    await interestBtn.dispatchEvent('click');

    // The interest modal should be visible
    const interestModal = page.locator('#interestModal');
    await expect(interestModal).toBeVisible();
    await expect(interestModal).not.toHaveClass(/hidden/);

    // Close the interest modal
    const closeBtn = interestModal.locator('button').filter({ has: page.locator('span:has-text("close")') });
    await closeBtn.click();

    // Verify it is hidden
    await expect(interestModal).toHaveClass(/hidden/);
  });

  test('should navigate to specific Pages (História, Patrono, Timbre)', async ({ page }) => {
    // Direct navigation testing to make sure all built routes exist and load successfully
    await page.goto('/historia.html');
    await expect(page).toHaveURL(/historia\.html/);

    await page.goto('/patrono.html');
    await expect(page).toHaveURL(/patrono\.html/);

    await page.goto('/timbre.html');
    await expect(page).toHaveURL(/timbre\.html/);
  });
});

test.describe('Mobile Navigation Tests', () => {
  // Use a mobile viewport test specifically for mobile menu toggle
  test.use({ viewport: { width: 375, height: 667 } });

  test('should toggle mobile menu drawer', async ({ page }) => {
    await page.goto('/');

    // Check if the hamburger menu is visible on mobile viewport
    const menuBtn = page.locator('nav button').filter({ has: page.locator('span:has-text("menu")') });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Mobile menu drawer should now be visible and not hidden
    const mobileMenu = page.locator('#mobileMenu');
    await expect(mobileMenu).toBeVisible();
    await expect(mobileMenu).not.toHaveClass(/hidden/);

    // Find and click the close button in the mobile drawer
    const closeBtn = mobileMenu.locator('button').filter({ has: page.locator('span:has-text("close")') });
    await closeBtn.click();

    // Mobile drawer should be hidden
    await expect(mobileMenu).toHaveClass(/hidden/);
  });
});
