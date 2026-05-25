import { test, expect } from '@playwright/test';

test.describe('Portal do Membro - Authentication & Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the login page
    await page.goto('/login.html');
  });

  test('should render the login card and inputs correctly', async ({ page }) => {
    // Confirm we are on the Member Portal login page by checking the primary heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/A∴R∴L∴S∴ Major Manoel dos Santos Portugal/i);

    // Verify presence of input fields and labels
    const emailLabel = page.locator('label[for="identifier"]');
    await expect(emailLabel).toHaveText(/Email ou CIM/i);

    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'E-mail ou Nº do CIM');

    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toHaveText(/Senha de Acesso/i);

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
  });

  test('should show validation error for incorrect credentials', async ({ page }) => {
    // Fill in fictitious credentials
    await page.locator('#email').fill('non-existent-member@majorportugal.org.br');
    await page.locator('#password').fill('WrongPassword123');

    // Click the submit button
    const submitBtn = page.getByRole('button', { name: 'Acesso Seguro' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Since Supabase isn't logged in or will fail, it should report a failure message in the error box
    const errorMessage = page.locator('#errorMessage');
    
    // Wait for the error text container to appear or be populated
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    const textContent = await errorMessage.textContent();
    expect(textContent).not.toBeNull();
    expect(textContent?.length).toBeGreaterThan(0);
  });

  test('should display toggle password visibility icon and toggle input type on click', async ({ page }) => {
    const passwordInput = page.locator('#password');
    const visibilityToggle = page.locator('#togglePassword');
    
    // 1. Inicialmente deve ser do tipo "password" e ter o ícone "visibility_off"
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(visibilityToggle).toBeVisible();
    await expect(visibilityToggle).toHaveText('visibility_off');

    // 2. Clica no olho para exibir a senha
    await visibilityToggle.click();

    // 3. Agora o campo deve mudar para o tipo "text" e exibir o ícone "visibility"
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(visibilityToggle).toHaveText('visibility');

    // 4. Clica novamente no olho para ocultar a senha
    await visibilityToggle.click();

    // 5. Deve retornar para o tipo "password" e exibir "visibility_off"
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(visibilityToggle).toHaveText('visibility_off');
  });

  test('should navigate to the Solicitar Ingresso page', async ({ page }) => {
    // Locate the "Solicitar Ingresso" link on the login page
    const requestIngressLink = page.getByRole('link', { name: 'Solicitar Ingresso' });
    await expect(requestIngressLink).toBeVisible();
    
    // Click the link and assert navigation to cadastro.html
    await requestIngressLink.click();
    await expect(page).toHaveURL(/cadastro.html/);
    
    // Confirm the registration page renders correctly
    const heading = page.locator('h1, h2');
    await expect(heading.first()).toContainText(/solicitar ingresso/i);
  });

  test('should open and close the Forgot Password recovery modal', async ({ page }) => {
    const recoveryModal = page.locator('#resetPasswordModal');
    
    // 1. Inicialmente o modal deve estar oculto
    await expect(recoveryModal).toBeHidden();

    // 2. Clica no link de esquecimento de senha
    const forgotBtn = page.locator('#forgotPassword');
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // 3. O modal de recuperação deve ficar visível
    await expect(recoveryModal).toBeVisible();
    await expect(recoveryModal).not.toHaveClass(/hidden/);

    // 4. Clica no botão de fechar dentro do modal
    const closeBtn = recoveryModal.locator('#closeResetModal');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // 5. O modal deve sumir
    await expect(recoveryModal).toHaveClass(/hidden/);
  });
});
