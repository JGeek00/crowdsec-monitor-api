/**
 * Single source of truth for notification delivery providers.
 *
 * Served to mobile apps via `GET /notification-channels/providers`, which render
 * their forms generically from here. The same definition drives backend validation,
 * so adding a provider never requires an app release (apps ignore unknown field
 * types and fall back to a generic icon for unknown provider icons).
 */

export type ProviderFieldType = 'text' | 'password' | 'number' | 'boolean' | 'select' | 'email' | 'url';

export interface ProviderFieldCondition {
  field: string;
  equals?: string | number | boolean;
  /** True when the referenced field is present and non-empty. */
  present?: boolean;
}

export interface ProviderFieldOption {
  value: string;
  labelKey: string;
}

export interface ProviderSectionDefinition {
  key: string;
  /** Localization key resolved client-side (never inline text). */
  labelKey: string;
}

export interface ProviderFieldDefinition {
  key: string;
  /** Section grouping for forms; unknown or absent renders ungrouped. */
  section?: string;
  /** Localization key resolved client-side (never inline text). */
  labelKey: string;
  placeholderKey?: string;
  type: ProviderFieldType;
  /** Comma-separated list; every item is validated as the field type. */
  list?: boolean;
  required?: boolean;
  /** Secrets are accepted on write but never returned by read endpoints. */
  secret?: boolean;
  default?: string | number | boolean;
  regex?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Select-only list of allowed values. */
  options?: ProviderFieldOption[];
  /** Required only when the condition holds. */
  requiredIf?: ProviderFieldCondition;
  /** At most one of [self, ...exclusiveWith] may be present. */
  exclusiveWith?: string[];
  /** App-only hint: show this field only when the condition holds. */
  visibleIf?: ProviderFieldCondition;
}

export interface ProviderDefinition {
  /** Stable id used in channel rows and API payloads. */
  type: string;
  descriptionKey?: string;
  /** Asset reference resolved client-side, with generic fallback. */
  icon: string;
  labelKey: string;
  supportsTest: boolean;
  /** Section order for forms; fields without (or with unknown) section render ungrouped. */
  sections: ProviderSectionDefinition[];
  fields: ProviderFieldDefinition[];
}

export const notificationProvidersVersion = 1;

export const notificationProviders: ProviderDefinition[] = [
  {
    type: 'ntfy',
    icon: 'ntfy',
    labelKey: 'provider_ntfy',
    descriptionKey: 'provider_ntfy_description',
    supportsTest: true,
    sections: [
      { key: 'topic', labelKey: 'section_topic' },
      { key: 'authentication', labelKey: 'section_authentication' },
      { key: 'appearance', labelKey: 'section_appearance' },
    ],
    fields: [
      {
        key: 'topic',
        section: 'topic',
        labelKey: 'field_topic',
        type: 'text',
        required: true,
        regex: '^[-_A-Za-z0-9]{1,64}$',
      },
      {
        key: 'server',
        section: 'topic',
        labelKey: 'field_server',
        type: 'url',
        required: false,
        default: 'https://ntfy.sh',
        maxLength: 2048,
      },
      {
        key: 'username',
        section: 'authentication',
        labelKey: 'field_username',
        type: 'text',
        required: false,
        maxLength: 256,
      },
      {
        key: 'password',
        section: 'authentication',
        labelKey: 'field_password',
        type: 'password',
        required: false,
        secret: true,
        maxLength: 1024,
        requiredIf: { field: 'username', present: true },
        visibleIf: { field: 'username', present: true },
      },
      {
        key: 'accessToken',
        section: 'authentication',
        labelKey: 'field_token',
        type: 'password',
        required: false,
        secret: true,
        maxLength: 1024,
        exclusiveWith: ['username', 'password'],
      },
      {
        key: 'priority',
        section: 'appearance',
        labelKey: 'field_priority',
        type: 'select',
        required: false,
        default: 'default',
        options: [
          { value: 'min', labelKey: 'priority_min' },
          { value: 'low', labelKey: 'priority_low' },
          { value: 'default', labelKey: 'priority_default' },
          { value: 'high', labelKey: 'priority_high' },
          { value: 'urgent', labelKey: 'priority_urgent' },
          { value: 'max', labelKey: 'priority_max' },
        ],
      },
      {
        key: 'tags',
        section: 'appearance',
        labelKey: 'field_tags',
        type: 'text',
        required: false,
        maxLength: 256,
      },
    ],
  },
  {
    type: 'email',
    icon: 'email',
    labelKey: 'provider_email',
    descriptionKey: 'provider_email_description',
    supportsTest: true,
    sections: [
      { key: 'server', labelKey: 'section_server' },
      { key: 'authentication', labelKey: 'section_authentication' },
      { key: 'addresses', labelKey: 'section_addresses' },
    ],
    fields: [
      {
        key: 'host',
        section: 'server',
        labelKey: 'field_host',
        type: 'text',
        required: true,
        maxLength: 253,
      },
      {
        key: 'port',
        section: 'server',
        labelKey: 'field_port',
        type: 'number',
        required: false,
        default: 587,
        integer: true,
        min: 1,
        max: 65535,
      },
      {
        key: 'secure',
        section: 'server',
        labelKey: 'field_secure',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        key: 'username',
        section: 'authentication',
        labelKey: 'field_username',
        type: 'text',
        required: false,
        maxLength: 1024,
        requiredIf: { field: 'password', present: true },
      },
      {
        key: 'password',
        section: 'authentication',
        labelKey: 'field_password',
        type: 'password',
        required: false,
        secret: true,
        maxLength: 1024,
        requiredIf: { field: 'username', present: true },
        visibleIf: { field: 'username', present: true },
      },
      {
        key: 'from',
        section: 'addresses',
        labelKey: 'field_from',
        type: 'email',
        required: true,
        maxLength: 320,
      },
      {
        key: 'to',
        section: 'addresses',
        labelKey: 'field_to',
        type: 'email',
        list: true,
        required: true,
        maxLength: 2000,
      },
    ],
  },
];

export function findProvider(type: string): ProviderDefinition | undefined {
  return notificationProviders.find((p) => p.type === type);
}
