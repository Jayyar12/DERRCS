/**
 * Standardized status styles for DERRCS incident, unit, and user lifecycle states.
 * Colors align with the design tokens in services/frontend/src/index.css.
 */

export const INCIDENT_STATUS_STYLES = {
  Reported: 'bg-warning text-warning-foreground',
  Validated: 'bg-primary text-primary-foreground',
  Dispatched: 'bg-secondary text-secondary-foreground',
  Active: 'bg-destructive text-destructive-foreground',
  Resolved: 'bg-success text-success-foreground',
  Closed: 'bg-muted text-muted-foreground',
};

export const UNIT_STATUS_STYLES = {
  Available: 'bg-success text-success-foreground',
  Busy: 'bg-warning text-warning-foreground',
  Offline: 'bg-muted text-muted-foreground',
};

export const ACCOUNT_STATUS_STYLES = {
  Active: 'bg-success text-success-foreground',
  Inactive: 'bg-muted text-muted-foreground',
};
