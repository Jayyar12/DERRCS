import { test, expect } from '@playwright/test';

test('DERRCS End-to-End Emergency Response Lifecycle', async ({ browser }) => {
  test.setTimeout(120000);

  const citizenContext = await browser.newContext();
  const dispatcherContext = await browser.newContext();
  const responderContext = await browser.newContext();

  const citizenPage = await citizenContext.newPage();
  const dispatcherPage = await dispatcherContext.newPage();
  const responderPage = await responderContext.newPage();

  // 1. Citizen Report
  console.log('--- CITIZEN: Submitting emergency report ---');
  await citizenPage.goto('/');
  await citizenPage.getByText('Fire', { exact: true }).click();
  await citizenPage.fill('textarea', 'E2E Automated Fire Report');
  await citizenPage.getByRole('button', { name: 'Continue' }).click();
  
  await citizenPage.getByRole('button', { name: 'Continue' }).click();

  await citizenContext.grantPermissions(['geolocation']);
  await citizenContext.setGeolocation({ latitude: 8.5385, longitude: 124.7533 });

  // Wait for the button that requests location, might be "Use My Location" or just click Continue if already set
  await citizenPage.getByRole('button', { name: /Use My Location|Location|Detect/i }).click().catch(() => {});
  
  await citizenPage.waitForTimeout(500);
  await citizenPage.getByRole('button', { name: 'Continue' }).click();

  await citizenPage.getByRole('button', { name: 'Submit Report' }).click();
  await expect(citizenPage.getByText('Help is being coordinated.')).toBeVisible();

  // 2. Dispatcher Login & Validation
  console.log('--- DISPATCHER: Logging in and validating ---');
  await dispatcherPage.goto('/login');
  await dispatcherPage.fill('input[type="text"]', 'dispatcher1');
  await dispatcherPage.fill('input[type="password"]', 'password123');
  await dispatcherPage.getByRole('button', { name: 'Sign In Securely' }).click();
  
  // Need to wait for dashboard load
  await expect(dispatcherPage.getByText('E2E Automated Fire Report')).toBeVisible({ timeout: 15000 });
  await dispatcherPage.getByText('E2E Automated Fire Report').click();

  await dispatcherPage.getByRole('button', { name: 'Confirm Candidate' }).click();
  await expect(dispatcherPage.getByRole('button', { name: 'Dispatch Unit' })).toBeVisible({ timeout: 5000 });

  // Select Unit (assuming there is a select element for response unit id)
  // Actually, we can just click "Dispatch Unit" and it might select the default recommended one.
  await dispatcherPage.getByRole('button', { name: 'Dispatch Unit' }).click();

  // 3. Responder Login & Resolution
  console.log('--- RESPONDER: Logging in and responding ---');
  await responderPage.goto('/login');
  await responderPage.fill('input[type="text"]', 'unit1');
  await responderPage.fill('input[type="password"]', 'password123');
  await responderPage.getByRole('button', { name: 'Sign In Securely' }).click();

  await expect(responderPage.getByText('Active Dispatch')).toBeVisible({ timeout: 10000 });
  
  await responderPage.getByRole('button', { name: 'En Route' }).click();
  await responderPage.getByRole('button', { name: 'Arrived on Scene' }).click();

  // Wait for the button
  await expect(responderPage.getByRole('button', { name: 'Field Assessment' })).toBeVisible();
  await responderPage.getByRole('button', { name: 'Field Assessment' }).click();
  
  // Fill the mandatory Disposition
  await responderPage.getByRole('combobox').click();
  await responderPage.getByRole('option', { name: 'Treated on Scene' }).click();
  
  await responderPage.getByRole('button', { name: 'Submit Assessment & Resolve' }).click();

  await expect(responderPage.getByText('No active dispatch')).toBeVisible({ timeout: 10000 });
  
  await citizenContext.close();
  await dispatcherContext.close();
  await responderContext.close();
});
