#!/usr/bin/env bash
# Shared Clerk webhook event list (Billing-3 + subscription sync).
CLERK_WEBHOOK_EVENTS=(
  subscriptionItem.active
  subscriptionItem.updated
  subscriptionItem.ended
  subscriptionItem.canceled
  subscriptionItem.expired
  subscriptionItem.abandoned
  organization.created
  organizationInvitation.created
)

clerk_webhook_print_events() {
  local ev
  for ev in "${CLERK_WEBHOOK_EVENTS[@]}"; do
    echo "  • $ev"
  done
}
