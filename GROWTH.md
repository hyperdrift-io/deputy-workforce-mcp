# Growth contract

## Audience

The first audience is an operations leader or technical partner already using Deputy who wants
workforce answers inside an AI assistant without granting it mutation access.

## Value loop

1. Connect a customer-owned Deputy installation.
2. Ask one of five operational workforce questions.
3. Receive a grounded answer with its period, source identifiers, and rule or threshold.
4. Return for the next operating decision or request a managed deployment.

## Events

| Event | Meaning | Required properties |
| --- | --- | --- |
| `useful_tool_call` | Activation: a curated workflow returns a usable grounded result | `delivery_id`, `tool_name`, `transport`, `result_status`, `duration_ms` |
| `managed_deployment_enquiry` | Commercial handoff: an organisation asks Hyperdrift to deploy or adapt the MCP | `delivery_id`, `source`, `requested_scope` |
| `paid_mcp_delivery` | MCP Maker revenue: a paid delivery is agreed | `delivery_id`, `service_tier`, `currency`, `amount` |

Never include employee names, emails, pay rates, free-text comments, record payloads, or access
tokens in growth events.

## Initial distribution

- Publish the repository and an honest implementation case study.
- Demonstrate the five workflows with synthetic fixture data.
- Seek one Deputy customer or partner for real workflow validation.
- Offer managed deployment, security hardening, and workflow adaptation as the next step.

## Success threshold

The flagship succeeds when it produces verified useful tool calls, a qualified managed-deployment
enquiry, and the first `paid_mcp_delivery` for MCP Maker.

