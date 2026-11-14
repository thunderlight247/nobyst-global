/**
 * Editable page text definitions. No server imports, so client components can use them.
 * Each block has a key, an admin label, and default copy used until an admin saves a value.
 */
export const CONTENT_BLOCKS = [
  {
    key: "home.category.heading",
    page: "Home",
    label: "Shop by category heading",
    defaultValue: "Shop by category",
    multiline: false,
  },
  {
    key: "home.operating.intro",
    page: "Home",
    label: "Operating today intro",
    defaultValue: "Two active divisions, serving customers in Techiman and the wider Bono East Region.",
    multiline: true,
  },
  {
    key: "home.planned.intro",
    page: "Home",
    label: "Planned expansion intro",
    defaultValue: "These business areas form our expansion plan.",
    multiline: true,
  },
] as const;

export type ContentKey = (typeof CONTENT_BLOCKS)[number]["key"];

export type ContentValues = Record<ContentKey, string>;

export const MAX_BLOCK_LENGTH = 500;
